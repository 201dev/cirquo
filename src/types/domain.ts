export type UserRole = "consumer" | "merchant" | "processor" | "admin";

export type RescueItemStatus =
  "draft" | "active" | "sold_out" | "expired" | "recovery_pending" | "recovered" | "residual" | "closed" | "moderated";

export interface RescueItemPreview {
  id: string;
  name: string;
  merchantName: string;
  currentPrice: number;
  originalPrice: number;
  remainingQuantity: number;
  weightPerItemGrams: number;
  pickupWindow: string;
  status: RescueItemStatus;
  description: string;
  image: string;
  address: string;
  distanceKm: number;
  dietaryTags: string[];
  /**
   * Raw pickup deadline, when the source knows it. Lets a card say how long is
   * left instead of only printing the window. Cirquo has no rating system, so
   * nothing here may stand in for one.
   */
  pickupEndAt?: number;
}

