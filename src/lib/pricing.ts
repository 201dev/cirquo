export const MATERIAL_TYPES = [
  "prepared_food",
  "bakery",
  "produce",
  "dairy",
  "protein",
  "dry_goods",
  "mixed",
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const PRICING_CONFIG = {
  baseDiscountByMaterial: {
    prepared_food: 0.5,
    bakery: 0.45,
    produce: 0.4,
    dairy: 0.4,
    protein: 0.45,
    dry_goods: 0.3,
    mixed: 0.4,
  },
  URGENCY_MAX: 0.25,
  STOCK_MAX: 0.1,
  MAX_DISCOUNT: 0.75,
  MIN_PRICE_IDR: 5_000,
} as const;

export type PricingInput = {
  originalPrice: number;
  floorPrice: number;
  pickupStartAt: number;
  pickupEndAt: number;
  now: number;
  initialQuantity: number;
  remainingQuantity: number;
  materialType: MaterialType;
};

export type PricingResult = {
  suggestedPrice: number;
  discountPercent: number;
  breakdown: { base: number; urgency: number; stockPressure: number };
  clampedByFloor: boolean;
};

export function suggestRescuePrice(input: PricingInput): PricingResult {
  const config = PRICING_CONFIG;
  const base = config.baseDiscountByMaterial[input.materialType];
  const windowMs = Math.max(1, input.pickupEndAt - input.pickupStartAt);
  const elapsed = clamp01((input.now - input.pickupStartAt) / windowMs);
  const urgency = config.URGENCY_MAX * elapsed ** 2;
  const sellThrough =
    input.initialQuantity > 0
      ? 1 - input.remainingQuantity / input.initialQuantity
      : 0;
  const shortfall = Math.max(0, elapsed - sellThrough);
  const stockPressure = config.STOCK_MAX * shortfall;
  const discount = Math.min(
    config.MAX_DISCOUNT,
    base + urgency + stockPressure,
  );
  const target = Math.round(input.originalPrice * (1 - discount));
  const floor = Math.max(input.floorPrice, config.MIN_PRICE_IDR);
  const suggestedPrice = Math.max(floor, target);

  return {
    suggestedPrice,
    discountPercent:
      input.originalPrice > 0
        ? (1 - suggestedPrice / input.originalPrice) * 100
        : 0,
    breakdown: { base, urgency, stockPressure },
    clampedByFloor: suggestedPrice > target,
  };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// @ts-ignore: Bun specific extension for main module execution
if (import.meta.main) {
  const HOUR = 60 * 60 * 1000;
  const START = 1_770_000_000_000;
  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
  };

  const baseInput = {
    originalPrice: 20_000,
    floorPrice: 5_000,
    pickupStartAt: START,
    pickupEndAt: START + 4 * HOUR,
    initialQuantity: 10,
    materialType: "prepared_food" as MaterialType,
  };

  // 1. Start of window (elapsed = 0)
  const res1 = suggestRescuePrice({ ...baseInput, now: START, remainingQuantity: 10 });
  assert(res1.discountPercent === 50, "Start of window should only have base discount");
  assert(res1.suggestedPrice === 10_000, "Start of window price should be 10_000");

  // 2. Near-expiry (elapsed = 0.94), stock pressure kicks in
  const res2 = suggestRescuePrice({ ...baseInput, now: START + 3.75 * HOUR, remainingQuantity: 8 });
  assert(res2.discountPercent > 50, "Near expiry should have higher discount");
  assert(res2.breakdown.urgency > 0, "Urgency should be greater than 0");
  assert(res2.breakdown.stockPressure > 0, "Stock pressure should apply");

  // 3. No stock pressure (sell-through ahead of time)
  const res3 = suggestRescuePrice({ ...baseInput, now: START + 2 * HOUR, remainingQuantity: 1 });
  assert(res3.breakdown.stockPressure === 0, "No stock pressure if selling well");

  // 4. Floor clamping
  const res4 = suggestRescuePrice({
    ...baseInput,
    floorPrice: 15_000,
    now: START + 4 * HOUR,
    remainingQuantity: 10,
  });
  assert(res4.suggestedPrice === 15_000, "Price should not fall below floorPrice");
  assert(res4.clampedByFloor === true, "Should report clampedByFloor");

  // 5. Min price IDR clamping
  const res5 = suggestRescuePrice({
    ...baseInput,
    originalPrice: 6_000,
    floorPrice: 1_000,
    now: START + 4 * HOUR,
    remainingQuantity: 10,
  });
  assert(res5.suggestedPrice === 5_000, "Price should not fall below MIN_PRICE_IDR");

  console.log("pricing.ts: All self-checks passed.");
}
