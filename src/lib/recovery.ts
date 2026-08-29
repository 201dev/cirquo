export type OfferProblem =
  | 'FORBIDDEN'
  | 'INVALID_TRANSITION'
  | 'OFFER_EXPIRED'
  | 'MATERIAL_TYPE_REJECTED'
  | 'CAPACITY_EXCEEDED'

export function getOfferProblem(input: {
  owned: boolean
  status: string
  offerExpiresAt?: number
  now: number
  acceptsMaterial: boolean
  committedGrams: number
  dailyCapacityGrams?: number
  offeredWeightGrams: number
}): OfferProblem | null {
  if (!input.owned) return 'FORBIDDEN'
  if (input.status !== 'offered') return 'INVALID_TRANSITION'
  if (!input.offerExpiresAt || input.offerExpiresAt <= input.now) return 'OFFER_EXPIRED'
  if (!input.acceptsMaterial) return 'MATERIAL_TYPE_REJECTED'
  if (
    input.dailyCapacityGrams === undefined ||
    input.committedGrams + input.offeredWeightGrams > input.dailyCapacityGrams
  ) return 'CAPACITY_EXCEEDED'
  return null
}

export function startOfWibDay(epochMs: number): number {
  const offset = 7 * 60 * 60 * 1_000
  return Math.floor((epochMs + offset) / 86_400_000) * 86_400_000 - offset
}

export function intakeResult(
  acceptedWeightGrams: number,
  declaredWeightGrams: number,
): { varianceGrams: number; variancePercent: number } | null {
  if (
    !Number.isInteger(acceptedWeightGrams) ||
    acceptedWeightGrams <= 0 ||
    acceptedWeightGrams > declaredWeightGrams * 1.5
  ) return null

  const varianceGrams = acceptedWeightGrams - declaredWeightGrams
  return {
    varianceGrams,
    variancePercent: Math.round((varianceGrams / declaredWeightGrams) * 1_000) / 10,
  }
}

export function outcomeResult(input: {
  acceptedWeightGrams: number
  outputWeightGrams: number
  residualWeightGrams: number
}): { processLossGrams: number; conversionRatePercent: number } | null {
  const { acceptedWeightGrams, outputWeightGrams, residualWeightGrams } = input
  if (
    !Number.isInteger(outputWeightGrams) ||
    !Number.isInteger(residualWeightGrams) ||
    outputWeightGrams < 0 ||
    residualWeightGrams < 0 ||
    outputWeightGrams > acceptedWeightGrams ||
    residualWeightGrams > acceptedWeightGrams ||
    outputWeightGrams + residualWeightGrams > acceptedWeightGrams
  ) return null

  return {
    processLossGrams: acceptedWeightGrams - outputWeightGrams - residualWeightGrams,
    conversionRatePercent: Math.round((outputWeightGrams / acceptedWeightGrams) * 1_000) / 10,
  }
}
