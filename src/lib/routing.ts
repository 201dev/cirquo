import { calculateHaversineDistanceMeters } from './geo'

export const MAX_ROUTING_ATTEMPTS = 3
export const OFFER_TTL_MS = 6 * 60 * 60 * 1_000

export type RoutingMaterialType =
  | 'prepared_food'
  | 'bakery'
  | 'produce'
  | 'dairy'
  | 'protein'
  | 'dry_goods'
  | 'mixed'

export type RoutingBatch = {
  offeredWeightGrams: number
  attemptedProcessorIds: readonly string[]
  declinedByProcessorIds: readonly string[]
}

export type RoutingProcessor = {
  id: string
  verificationStatus: string
  acceptedMaterialTypes: readonly RoutingMaterialType[]
  latitude: number
  longitude: number
  maxPickupRadiusMeters: number
  dailyCapacityGrams: number
  committedGrams: number
}

export type RankedProcessor = {
  processorId: string
  distanceMeters: number
  remainingCapacityGrams: number
}

export function rankEligibleProcessors(
  batch: RoutingBatch,
  item: { materialType: RoutingMaterialType },
  merchant: { latitude: number; longitude: number },
  processors: readonly RoutingProcessor[],
): RankedProcessor[] {
  const unavailable = new Set([
    ...batch.attemptedProcessorIds,
    ...batch.declinedByProcessorIds,
  ])

  return processors
    .flatMap((processor) => {
      const distanceMeters = calculateHaversineDistanceMeters(
        merchant.latitude,
        merchant.longitude,
        processor.latitude,
        processor.longitude,
      )
      const remainingCapacityGrams = processor.dailyCapacityGrams - processor.committedGrams
      if (
        processor.verificationStatus !== 'verified' ||
        !processor.acceptedMaterialTypes.includes(item.materialType) ||
        distanceMeters > processor.maxPickupRadiusMeters ||
        remainingCapacityGrams < batch.offeredWeightGrams ||
        unavailable.has(processor.id)
      ) return []

      return [{ processorId: processor.id, distanceMeters, remainingCapacityGrams }]
    })
    .sort((left, right) =>
      left.distanceMeters - right.distanceMeters ||
      right.remainingCapacityGrams - left.remainingCapacityGrams ||
      (left.processorId < right.processorId ? -1 : left.processorId > right.processorId ? 1 : 0),
    )
}
