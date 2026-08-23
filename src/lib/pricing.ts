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
