export type UserRole = 'consumer' | 'merchant' | 'processor' | 'admin'

export type RescueItemStatus = 'draft' | 'active' | 'sold_out' | 'expired' | 'recovery_pending' | 'closed'
export type OrderStatus = 'reserved' | 'paid' | 'picked_up' | 'cancelled' | 'expired'
export type RecoveryBatchStatus = 'pending' | 'accepted' | 'rejected' | 'processed'

export interface RescueItemPreview {
  id: string
  name: string
  merchantName: string
  currentPrice: number
  originalPrice: number
  remainingQuantity: number
  weightPerItemGrams: number
  pickupWindow: string
  status: RescueItemStatus
}

export interface OrderPreview {
  id: string
  itemName: string
  merchantName: string
  totalPrice: number
  pickupCode: string
  status: OrderStatus
}

export interface RecoveryBatchPreview {
  id: string
  merchantName: string
  itemName: string
  offeredWeightGrams: number
  status: RecoveryBatchStatus
}
