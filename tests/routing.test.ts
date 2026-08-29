import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { rankEligibleProcessors } from '../src/lib/routing'

const batch = {
  offeredWeightGrams: 500,
  attemptedProcessorIds: ['attempted'],
  declinedByProcessorIds: ['declined'],
}
const item = { materialType: 'bakery' as const }
const merchant = { latitude: -6.9932, longitude: 110.4203 }

test('routing menyaring kandidat dan mengurutkan jarak, headroom, lalu ID', () => {
  const processors = [
    { id: 'pending', verificationStatus: 'pending', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 0 },
    { id: 'wrong-material', verificationStatus: 'verified', acceptedMaterialTypes: ['produce'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 0 },
    { id: 'far', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: -7.5, longitude: 110.4203, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 0 },
    { id: 'full', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 1_000, committedGrams: 600 },
    { id: 'attempted', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 0 },
    { id: 'declined', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 0 },
    { id: 'beta', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 1_500, committedGrams: 500 },
    { id: 'alpha', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 1_500, committedGrams: 500 },
    { id: 'headroom', verificationStatus: 'verified', acceptedMaterialTypes: ['bakery'] as const, latitude: merchant.latitude, longitude: merchant.longitude, maxPickupRadiusMeters: 2_000, dailyCapacityGrams: 2_000, committedGrams: 500 },
  ]

  const ids = rankEligibleProcessors(batch, item, merchant, processors).map(({ processorId }) => processorId)
  assert.deepEqual(ids, ['headroom', 'alpha', 'beta'])
  assert.deepEqual(
    rankEligibleProcessors(batch, item, merchant, [...processors].reverse()).map(({ processorId }) => processorId),
    ids,
  )
})
