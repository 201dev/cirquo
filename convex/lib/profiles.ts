import { ConvexError } from 'convex/values'

const INDONESIA_LATITUDE = { min: -11, max: 6 }
const INDONESIA_LONGITUDE = { min: 95, max: 141 }

type ProfileField =
  | 'name'
  | 'address'
  | 'city'
  | 'latitude'
  | 'longitude'
  | 'phone'
  | 'acceptedMaterialTypes'
  | 'dailyCapacityGrams'
  | 'maxPickupRadiusMeters'
  | 'outputTypes'
  | 'operatingHoursStart'
  | 'operatingHoursEnd'

function fail(field: ProfileField, message: string): never {
  throw new ConvexError({ code: 'VALIDATION_FAILED', field, message })
}

function requiredText(
  field: 'name' | 'address' | 'city',
  value: string,
  min: number,
  max: number,
): string {
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    fail(field, `${field === 'name' ? 'Nama' : field === 'city' ? 'Kota' : 'Alamat'} harus terdiri dari ${min}–${max} karakter.`)
  }
  return normalized
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < INDONESIA_LATITUDE.min || latitude > INDONESIA_LATITUDE.max) {
    fail('latitude', 'Latitude harus berada di wilayah Indonesia.')
  }
  if (!Number.isFinite(longitude) || longitude < INDONESIA_LONGITUDE.min || longitude > INDONESIA_LONGITUDE.max) {
    fail('longitude', 'Longitude harus berada di wilayah Indonesia.')
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

  const phone = input.phone?.trim() || undefined
  if (phone !== undefined && (phone.length < 5 || phone.length > 30)) {
    fail('phone', 'Nomor telepon harus terdiri dari 5–30 karakter.')
  }

  return {
    name: requiredText('name', input.name, 2, 120),
    address: requiredText('address', input.address, 5, 250),
    city: requiredText('city', input.city, 2, 100),
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

  if (input.acceptedMaterialTypes.length === 0) {
    fail('acceptedMaterialTypes', 'Pilih minimal satu jenis material.')
  }
  if (!Number.isInteger(input.dailyCapacityGrams) || input.dailyCapacityGrams <= 0 || input.dailyCapacityGrams > 100_000_000) {
    fail('dailyCapacityGrams', 'Kapasitas harian harus berupa gram utuh antara 1 dan 100.000.000.')
  }
  if (!Number.isInteger(input.maxPickupRadiusMeters) || input.maxPickupRadiusMeters < 500 || input.maxPickupRadiusMeters > 100_000) {
    fail('maxPickupRadiusMeters', 'Radius pickup harus antara 500 dan 100.000 meter.')
  }
  if (input.outputTypes.length === 0) {
    fail('outputTypes', 'Pilih minimal satu hasil pengolahan.')
  }
  if (!Number.isInteger(input.operatingHoursStart) || input.operatingHoursStart < 0 || input.operatingHoursStart > 1_439) {
    fail('operatingHoursStart', 'Jam mulai operasional tidak valid.')
  }
  if (!Number.isInteger(input.operatingHoursEnd) || input.operatingHoursEnd <= input.operatingHoursStart || input.operatingHoursEnd > 1_439) {
    fail('operatingHoursEnd', 'Jam selesai harus setelah jam mulai pada hari yang sama.')
  }

  return {
    name: requiredText('name', input.name, 2, 120),
    city: requiredText('city', input.city, 2, 100),
  }
}
