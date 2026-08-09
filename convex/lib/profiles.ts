import { ConvexError } from 'convex/values'

const INDONESIA_LATITUDE = { min: -11, max: 6 }
const INDONESIA_LONGITUDE = { min: 95, max: 141 }

function fail(): never {
  throw new ConvexError('VALIDATION_FAILED')
}

function requiredText(value: string, min: number, max: number): string {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) fail()
  return normalized
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (
    !Number.isFinite(latitude) ||
    latitude < INDONESIA_LATITUDE.min ||
    latitude > INDONESIA_LATITUDE.max ||
    !Number.isFinite(longitude) ||
    longitude < INDONESIA_LONGITUDE.min ||
    longitude > INDONESIA_LONGITUDE.max
  ) {
    fail()
  }
}

export function validateMerchantProfile(input: {
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  phone?: string
}) {
  validateCoordinates(input.latitude, input.longitude)

  const phone = input.phone?.trim()
  if (phone !== undefined && (phone.length < 5 || phone.length > 30)) fail()

  return {
    name: requiredText(input.name, 2, 120),
    address: requiredText(input.address, 5, 250),
    city: requiredText(input.city, 2, 100),
    phone,
  }
}

export function validateProcessorProfile(input: {
  name: string
  city: string
  latitude: number
  longitude: number
  acceptedMaterialTypes: readonly string[]
  dailyCapacityGrams: number
  maxPickupRadiusMeters: number
  outputTypes: readonly string[]
  operatingHoursStart: number
  operatingHoursEnd: number
}) {
  validateCoordinates(input.latitude, input.longitude)

  if (
    input.acceptedMaterialTypes.length === 0 ||
    input.outputTypes.length === 0 ||
    !Number.isInteger(input.dailyCapacityGrams) ||
    input.dailyCapacityGrams <= 0 ||
    input.dailyCapacityGrams > 100_000_000 ||
    !Number.isInteger(input.maxPickupRadiusMeters) ||
    input.maxPickupRadiusMeters < 500 ||
    input.maxPickupRadiusMeters > 100_000 ||
    !Number.isInteger(input.operatingHoursStart) ||
    !Number.isInteger(input.operatingHoursEnd) ||
    input.operatingHoursStart < 0 ||
    input.operatingHoursEnd > 1_439 ||
    input.operatingHoursEnd <= input.operatingHoursStart
  ) {
    fail()
  }

  return {
    name: requiredText(input.name, 2, 120),
    city: requiredText(input.city, 2, 100),
  }
}
