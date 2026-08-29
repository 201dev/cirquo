export const IMPACT_METHODOLOGY_VERSION = 'impact-v1'

const RESCUE_CO2E_GRAMS_PER_GRAM = 2.5
const RECOVERY_CO2E_GRAMS_PER_GRAM = 0.9

export type ImpactLedgerEntry = {
  id?: string
  surplusItemId: string
  eventType: string
  weightDeltaGrams: number
  metadata?: string
}

export type ImpactIntegrityIssue = {
  code:
    | 'MALFORMED_INTAKE_METADATA'
    | 'MALFORMED_PROCESSED_METADATA'
    | 'MALFORMED_RESCUED_METADATA'
    | 'MALFORMED_ROUTING_FAILURE_METADATA'
    | 'NEGATIVE_IN_PROGRESS'
  message: string
  surplusItemId: string
  entryId?: string
}

export type ImpactSummary = {
  listedGrams: number
  rescuedGrams: number
  recoveredGrams: number | null
  residualGrams: number | null
  processLossGrams: number | null
  measurementAdjustmentGrams: number | null
  inProgressGrams: number | null
  circularityRatePercent: number | null
  diversionRatePercent: number | null
  revenueRecoveredIdr: number | null
  consumerSavingsIdr: number | null
  estimatedCo2eGrams: number | null
  methodologyVersion: typeof IMPACT_METHODOLOGY_VERSION
  integrity: {
    isValid: boolean
    issues: ImpactIntegrityIssue[]
  }
  conservation: {
    itemBalances: Array<{ surplusItemId: string; balanceGrams: number }>
    identityDeltaGrams: number | null
  }
}

type ItemTotals = {
  listedGrams: number
  expiredGrams: number
  rescuedGrams: number
  recoveredGrams: number
  residualGrams: number
  processLossGrams: number
  measurementAdjustmentGrams: number
  balanceGrams: number
  hasListed: boolean
  hasExpired: boolean
}

function roundedPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1_000) / 10
}

function integer(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum
}

function metadata(value: string | undefined): Record<string, unknown> | null {
  try {
    const parsed: unknown = value ? JSON.parse(value) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function itemTotals(): ItemTotals {
  return {
    listedGrams: 0,
    expiredGrams: 0,
    rescuedGrams: 0,
    recoveredGrams: 0,
    residualGrams: 0,
    processLossGrams: 0,
    measurementAdjustmentGrams: 0,
    balanceGrams: 0,
    hasListed: false,
    hasExpired: false,
  }
}

/**
 * Reduces a scoped Material Flow Ledger projection without any framework imports.
 * The returned integrity issues are deliberately data, not swallowed fallbacks.
 */
export function summariseLedger(entries: readonly ImpactLedgerEntry[]): ImpactSummary {
  const items = new Map<string, ItemTotals>()
  const issues: ImpactIntegrityIssue[] = []
  let recoveredComplete = true
  let residualComplete = true
  let processLossComplete = true
  let measurementComplete = true
  let revenueComplete = true
  let savingsComplete = true
  let revenueRecoveredIdr = 0
  let consumerSavingsIdr = 0

  const addIssue = (
    entry: ImpactLedgerEntry,
    code: ImpactIntegrityIssue['code'],
    message: string,
  ) => issues.push({ code, message, surplusItemId: entry.surplusItemId, entryId: entry.id })

  for (const entry of entries) {
    const totals = items.get(entry.surplusItemId) ?? itemTotals()
    items.set(entry.surplusItemId, totals)
    totals.balanceGrams += entry.weightDeltaGrams

    if (entry.eventType === 'LISTED') {
      totals.listedGrams += entry.weightDeltaGrams
      totals.hasListed = true
      continue
    }
    if (entry.eventType === 'RESCUED') {
      totals.rescuedGrams += Math.abs(entry.weightDeltaGrams)
      const data = metadata(entry.metadata)
      if (!data || !integer(data.totalPrice)) {
        revenueComplete = false
        addIssue(entry, 'MALFORMED_RESCUED_METADATA', 'RESCUED memerlukan totalPrice IDR utuh untuk revenue recovered.')
      } else {
        revenueRecoveredIdr += data.totalPrice
      }
      if (!data || !integer(data.originalPriceSnapshot, 1) || !integer(data.quantity, 1) || !integer(data.totalPrice)) {
        savingsComplete = false
        addIssue(entry, 'MALFORMED_RESCUED_METADATA', 'RESCUED memerlukan originalPriceSnapshot, quantity, dan totalPrice untuk tabungan Consumer.')
      } else {
        consumerSavingsIdr += data.originalPriceSnapshot * data.quantity - data.totalPrice
      }
      continue
    }
    if (entry.eventType === 'EXPIRED') {
      totals.expiredGrams += Math.abs(entry.weightDeltaGrams)
      totals.hasExpired = true
      continue
    }
    if (entry.eventType === 'INTAKE_ACCEPTED') {
      const data = metadata(entry.metadata)
      if (!data || !integer(data.declaredWeightGrams, 1) || !integer(entry.weightDeltaGrams, 1)) {
        measurementComplete = false
        addIssue(entry, 'MALFORMED_INTAKE_METADATA', 'INTAKE_ACCEPTED memerlukan declaredWeightGrams dan delta gram terukur yang positif.')
      } else {
        totals.measurementAdjustmentGrams += entry.weightDeltaGrams - data.declaredWeightGrams
      }
      continue
    }
    if (entry.eventType === 'PROCESSED') {
      const data = metadata(entry.metadata)
      const processedGrams = Math.abs(entry.weightDeltaGrams)
      if (
        !data ||
        !integer(data.outputWeightGrams) ||
        !integer(data.residualWeightGrams) ||
        !integer(processedGrams, 1) ||
        data.outputWeightGrams + data.residualWeightGrams > processedGrams
      ) {
        recoveredComplete = false
        residualComplete = false
        processLossComplete = false
        measurementComplete = false
        addIssue(entry, 'MALFORMED_PROCESSED_METADATA', 'PROCESSED memerlukan output dan residual gram utuh yang tidak melebihi berat terukur.')
      } else {
        totals.recoveredGrams += data.outputWeightGrams
        totals.residualGrams += data.residualWeightGrams
        totals.processLossGrams += processedGrams - data.outputWeightGrams - data.residualWeightGrams
      }
      continue
    }
    if (entry.eventType === 'ROUTING_FAILED') {
      const data = metadata(entry.metadata)
      if (!data || !integer(data.residualWeightGrams)) {
        residualComplete = false
        addIssue(entry, 'MALFORMED_ROUTING_FAILURE_METADATA', 'ROUTING_FAILED memerlukan residualWeightGrams untuk atribusi residual.')
      } else {
        totals.residualGrams += data.residualWeightGrams
      }
      continue
    }
    if (entry.eventType === 'MODERATED') {
      totals.residualGrams += Math.abs(entry.weightDeltaGrams)
    }
  }

  const totals = [...items.values()].reduce((summary, item) => ({
    listedGrams: summary.listedGrams + item.listedGrams,
    rescuedGrams: summary.rescuedGrams + item.rescuedGrams,
    recoveredGrams: summary.recoveredGrams + item.recoveredGrams,
    residualGrams: summary.residualGrams + item.residualGrams,
    processLossGrams: summary.processLossGrams + item.processLossGrams,
    measurementAdjustmentGrams: summary.measurementAdjustmentGrams + item.measurementAdjustmentGrams,
  }), {
    listedGrams: 0,
    rescuedGrams: 0,
    recoveredGrams: 0,
    residualGrams: 0,
    processLossGrams: 0,
    measurementAdjustmentGrams: 0,
  })

  let inProgressGrams = 0
  let identityDeltaGrams = 0
  let hasCompleteItemScope = false
  if (recoveredComplete && residualComplete && processLossComplete && measurementComplete) {
    for (const [surplusItemId, item] of items) {
      const inputGrams = item.hasListed ? item.listedGrams : item.expiredGrams
      if (!item.hasListed && !item.hasExpired) continue
      hasCompleteItemScope = true
      const remainder = inputGrams + item.measurementAdjustmentGrams
        - (item.hasListed ? item.rescuedGrams : 0)
        - item.recoveredGrams - item.residualGrams - item.processLossGrams
      if (remainder < 0) {
        addIssue({ surplusItemId, eventType: 'LISTED', weightDeltaGrams: 0 }, 'NEGATIVE_IN_PROGRESS', 'Outcome melebihi material tercatat setelah penyesuaian pengukuran.')
        inProgressGrams = 0
        identityDeltaGrams = 0
        measurementComplete = false
        break
      }
      inProgressGrams += remainder
      identityDeltaGrams += inputGrams + item.measurementAdjustmentGrams
        - (item.hasListed ? item.rescuedGrams : 0)
        - item.recoveredGrams - item.residualGrams - item.processLossGrams - remainder
    }
  }

  const recoveredGrams = recoveredComplete ? totals.recoveredGrams : null
  const residualGrams = residualComplete ? totals.residualGrams : null
  const processLossGrams = processLossComplete ? totals.processLossGrams : null
  const measurementAdjustmentGrams = measurementComplete ? totals.measurementAdjustmentGrams : null
  const completeProgress = recoveredGrams !== null && residualGrams !== null
    && processLossGrams !== null && measurementAdjustmentGrams !== null
  const visibleInProgressGrams = completeProgress ? inProgressGrams : null
  const circularityRatePercent = completeProgress
    ? roundedPercent(totals.rescuedGrams + recoveredGrams, totals.listedGrams)
    : null
  const diversionRatePercent = recoveredGrams === null
    ? null
    : roundedPercent(recoveredGrams, totals.listedGrams - totals.rescuedGrams)

  return {
    listedGrams: totals.listedGrams,
    rescuedGrams: totals.rescuedGrams,
    recoveredGrams,
    residualGrams,
    processLossGrams,
    measurementAdjustmentGrams,
    inProgressGrams: visibleInProgressGrams,
    circularityRatePercent,
    diversionRatePercent,
    revenueRecoveredIdr: revenueComplete ? revenueRecoveredIdr : null,
    consumerSavingsIdr: savingsComplete ? consumerSavingsIdr : null,
    estimatedCo2eGrams: recoveredGrams === null
      ? null
      : estimateCo2e(totals.rescuedGrams, recoveredGrams),
    methodologyVersion: IMPACT_METHODOLOGY_VERSION,
    integrity: { isValid: issues.length === 0, issues },
    conservation: {
      itemBalances: [...items.entries()]
        .map(([surplusItemId, item]) => ({ surplusItemId, balanceGrams: item.balanceGrams }))
        .sort((a, b) => a.surplusItemId.localeCompare(b.surplusItemId)),
      identityDeltaGrams: completeProgress && hasCompleteItemScope ? identityDeltaGrams : null,
    },
  }
}

export function estimateCo2e(rescuedGrams: number, recoveredGrams: number): number {
  return Math.round(
    rescuedGrams * RESCUE_CO2E_GRAMS_PER_GRAM
      + recoveredGrams * RECOVERY_CO2E_GRAMS_PER_GRAM,
  )
}
