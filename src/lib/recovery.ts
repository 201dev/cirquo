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

type ProcessorDashboardBatch = {
  status: string
  offeredWeightGrams: number
  acceptedAt?: number
}

type ProcessorDashboardLedgerEvent = {
  eventType: string
  weightDeltaGrams: number
  occurredAt: number
  metadata?: string
}

const outputTypes = ['compost', 'bsf_larvae', 'animal_feed', 'biogas'] as const

function processedMetadata(metadata: string | undefined): { outputType: typeof outputTypes[number]; outputWeightGrams: number; residualWeightGrams: number } | null {
  try {
    const value: unknown = metadata ? JSON.parse(metadata) : null
    if (
      !value || typeof value !== 'object' ||
      !('outputType' in value) || !('outputWeightGrams' in value) || !('residualWeightGrams' in value)
    ) return null
    const { outputType, outputWeightGrams, residualWeightGrams } = value
    if (
      !outputTypes.includes(outputType as typeof outputTypes[number]) ||
      typeof outputWeightGrams !== 'number' || !Number.isInteger(outputWeightGrams) || outputWeightGrams < 0 ||
      typeof residualWeightGrams !== 'number' || !Number.isInteger(residualWeightGrams) || residualWeightGrams < 0
    ) return null
    return {
      outputType: outputType as typeof outputTypes[number],
      outputWeightGrams,
      residualWeightGrams,
    }
  } catch {
    return null
  }
}

/** Aggregates the Processor's own material-flow evidence without Convex imports. */
export function summarizeProcessorDashboard(input: {
  batches: readonly ProcessorDashboardBatch[]
  events: readonly ProcessorDashboardLedgerEvent[]
  dailyCapacityGrams: number
  now: number
}) {
  const outputByType = { compost: 0, bsf_larvae: 0, animal_feed: 0, biogas: 0 }
  const dayStart = startOfWibDay(input.now)
  let todayIntakeGrams = 0
  let processedIntakeGrams = 0
  let outputWeightGrams = 0
  let residualWeightGrams = 0

  for (const event of input.events) {
    if (event.eventType === 'INTAKE_ACCEPTED' && event.occurredAt >= dayStart && event.occurredAt <= input.now) {
      todayIntakeGrams += event.weightDeltaGrams
    }
    if (event.eventType !== 'PROCESSED' || event.weightDeltaGrams >= 0) continue
    processedIntakeGrams += -event.weightDeltaGrams
    const metadata = processedMetadata(event.metadata)
    if (!metadata) continue
    outputWeightGrams += metadata.outputWeightGrams
    residualWeightGrams += metadata.residualWeightGrams
    outputByType[metadata.outputType] += metadata.outputWeightGrams
  }

  const capacityCommittedGrams = input.batches.reduce((total, batch) =>
    batch.acceptedAt !== undefined && batch.acceptedAt >= dayStart && batch.acceptedAt <= input.now
      ? total + batch.offeredWeightGrams
      : total, 0)
  const capacityUsagePercent = input.dailyCapacityGrams === 0
    ? 0
    : Math.round((capacityCommittedGrams / input.dailyCapacityGrams) * 1_000) / 10

  return {
    offeredCount: input.batches.filter((batch) => batch.status === 'offered').length,
    acceptedCount: input.batches.filter((batch) => batch.status === 'accepted').length,
    collectedCount: input.batches.filter((batch) => batch.status === 'collected').length,
    processedCount: input.events.filter((event) => event.eventType === 'PROCESSED').length,
    capacityCommittedGrams,
    capacityUsagePercent,
    dailyCapacityGrams: input.dailyCapacityGrams,
    todayIntakeGrams,
    processedIntakeGrams,
    outputWeightGrams,
    residualWeightGrams,
    outputByType,
    recoveryRatePercent: processedIntakeGrams === 0
      ? null
      : Math.round((outputWeightGrams / processedIntakeGrams) * 1_000) / 10,
  }
}
