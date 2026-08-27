export type UserRole = "consumer" | "merchant" | "processor" | "admin";

export type RescueItemStatus =
  "draft" | "active" | "sold_out" | "expired" | "recovery_pending" | "closed";
export type OrderStatus =
  "reserved" | "paid" | "picked_up" | "cancelled" | "expired";
export type RecoveryBatchStatus =
  "pending" | "offered" | "accepted" | "collected" | "processed" | "unroutable";

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
  category: "bakery" | "meal" | "produce";
  description: string;
  image: string;
  address: string;
  distanceKm: number;
  rating?: number;
  dietaryTags: string[];
  pickupDate: string;
}

export interface OrderPreview {
  id: string;
  itemName: string;
  merchantName: string;
  totalPrice: number;
  pickupCode: string;
  status: OrderStatus;
  quantity: number;
  pickupWindow: string;
  image: string;
  orderedAt: string;
}

export interface RecoveryBatchPreview {
  id: string;
  merchantName: string;
  itemName: string;
  offeredWeightGrams: number;
  status: RecoveryBatchStatus;
  distanceKm: number;
  requestedAt: string;
  pickupWindow: string;
  outcome?: "compost" | "bsf_larvae" | "animal_feed" | "biogas";
}

export interface LedgerEventPreview {
  id: string;
  itemName: string;
  eventType: "LISTED" | "RESERVED" | "RESCUED" | "ROUTED" | "PROCESSED";
  actor: string;
  actorRole?: UserRole;
  weightDeltaGrams: number;
  timestamp: string;
  recoveredWeightGrams?: number;
  residualWeightGrams?: number;
}
