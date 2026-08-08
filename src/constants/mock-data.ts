import type { OrderPreview, RecoveryBatchPreview, RescueItemPreview } from '@/types/domain'

export const rescueItems: RescueItemPreview[] = [
  {
    id: 'rescue-1',
    name: 'Roti artisan sore hari',
    merchantName: 'Roti Tembalang',
    currentPrice: 18000,
    originalPrice: 36000,
    remainingQuantity: 4,
    weightPerItemGrams: 450,
    pickupWindow: '17.00–19.00 WIB',
    status: 'active',
  },
  {
    id: 'rescue-2',
    name: 'Paket nasi dan lauk',
    merchantName: 'Dapur Banyumanik',
    currentPrice: 14000,
    originalPrice: 28000,
    remainingQuantity: 7,
    weightPerItemGrams: 500,
    pickupWindow: '18.30–20.00 WIB',
    status: 'active',
  },
]

export const orders: OrderPreview[] = [
  {
    id: 'order-1',
    itemName: 'Roti artisan sore hari',
    merchantName: 'Roti Tembalang',
    totalPrice: 18000,
    pickupCode: 'CQ-4821',
    status: 'paid',
  },
]

export const recoveryBatches: RecoveryBatchPreview[] = [
  {
    id: 'batch-1',
    merchantName: 'Dapur Banyumanik',
    itemName: 'Sisa olahan sayur',
    offeredWeightGrams: 8200,
    status: 'pending',
  },
]

export const formatIdr = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value)

export const formatKg = (grams: number) => `${(grams / 1000).toLocaleString('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})} kg`
