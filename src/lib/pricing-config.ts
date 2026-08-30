import type { MaterialType } from "./pricing";

/** Single source of truth for Dynamic Rescue Pricing parameters. */
export const PRICING_CONFIG: {
  baseDiscountByMaterial: Record<MaterialType, number>;
  URGENCY_MAX: number;
  STOCK_MAX: number;
  MAX_DISCOUNT: number;
  MIN_PRICE_IDR: number;
} = {
  baseDiscountByMaterial: {
    prepared_food: 0.5, bakery: 0.45, produce: 0.4, dairy: 0.4,
    protein: 0.45, dry_goods: 0.3, mixed: 0.4,
  },
  URGENCY_MAX: 0.25,
  STOCK_MAX: 0.1,
  MAX_DISCOUNT: 0.75,
  MIN_PRICE_IDR: 5_000,
};
