import assert from 'node:assert/strict'
import { ConvexError } from 'convex/values'
import {
  validateMerchantProfile,
  validateProcessorProfile,
} from '../convex/lib/profiles.ts'

const hasValidationCode = (error: unknown) =>
  error instanceof ConvexError && error.data === 'VALIDATION_FAILED'

assert.deepEqual(
  validateMerchantProfile({
    name: '  Warung Bu Sari  ',
    address: '  Jl. Pandanaran 42  ',
    city: '  Semarang  ',
    latitude: -6.9847,
    longitude: 110.4092,
  }),
  {
    name: 'Warung Bu Sari',
    address: 'Jl. Pandanaran 42',
    city: 'Semarang',
    phone: undefined,
  },
)

assert.throws(
  () => validateMerchantProfile({
    name: '',
    address: 'short',
    city: 'Semarang',
    latitude: -6.9847,
    longitude: 110.4092,
  }),
  hasValidationCode,
)

const processor = {
  name: 'Semarang BSF Farm',
  city: 'Semarang',
  latitude: -6.9591,
  longitude: 110.321,
  acceptedMaterialTypes: ['prepared_food'],
  dailyCapacityGrams: 500_000,
  maxPickupRadiusMeters: 15_000,
  outputTypes: ['bsf_larvae'],
  operatingHoursStart: 420,
  operatingHoursEnd: 1_020,
}

assert.equal(validateProcessorProfile(processor).name, processor.name)
assert.throws(
  () => validateProcessorProfile({ ...processor, latitude: -91 }),
  hasValidationCode,
)
assert.throws(
  () => validateProcessorProfile({ ...processor, dailyCapacityGrams: 0 }),
  hasValidationCode,
)
assert.throws(
  () => validateProcessorProfile({ ...processor, maxPickupRadiusMeters: 0 }),
  hasValidationCode,
)

console.log('Business profile validation checks passed.')
