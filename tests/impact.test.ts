import { describe, expect, test } from 'bun:test'
import { estimateCo2e, summariseLedger, summarisePlatformOperations, summariseProcessorOperations } from '../src/lib/impact'

describe('impact ledger summary', () => {
  test('returns zeros for an empty projection', () => {
    expect(summariseLedger([])).toMatchObject({
      listedItemCount: 0,
      listedGrams: 0,
      rescuedQuantity: 0,
      rescuedGrams: 0,
      recoveredGrams: 0,
      residualGrams: 0,
      processLossGrams: 0,
      inProgressGrams: 0,
      circularityRatePercent: null,
      integrity: { isValid: true },
    })
  })

  test('keeps partial outcomes, measurement adjustment, and in-progress material explicit', () => {
    const summary = summariseLedger([
      { id: 'listed', surplusItemId: 'item-a', eventType: 'LISTED', weightDeltaGrams: 1_000 },
      { id: 'rescued', surplusItemId: 'item-a', eventType: 'RESCUED', weightDeltaGrams: -200, metadata: JSON.stringify({ quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 12_000 }) },
      { id: 'expired', surplusItemId: 'item-a', eventType: 'EXPIRED', weightDeltaGrams: -800 },
      { id: 'intake', surplusItemId: 'item-a', eventType: 'INTAKE_ACCEPTED', weightDeltaGrams: 700, metadata: JSON.stringify({ declaredWeightGrams: 800 }) },
      { id: 'processed', surplusItemId: 'item-a', eventType: 'PROCESSED', weightDeltaGrams: -700, metadata: JSON.stringify({ outputType: 'compost', outputWeightGrams: 500, residualWeightGrams: 100 }) },
      { id: 'listed-pending', surplusItemId: 'item-b', eventType: 'LISTED', weightDeltaGrams: 300 },
    ])

    expect(summary).toMatchObject({
      listedItemCount: 2,
      listedGrams: 1_300,
      rescuedQuantity: 1,
      rescuedGrams: 200,
      measuredIntakeGrams: 700,
      processedIntakeGrams: 700,
      recoveredByOutputType: { compost: 500, bsf_larvae: 0, animal_feed: 0, biogas: 0 },
      recoveredGrams: 500,
      residualGrams: 100,
      processLossGrams: 100,
      measurementAdjustmentGrams: -100,
      inProgressGrams: 300,
      circularityRatePercent: 53.8,
      diversionRatePercent: 45.5,
      revenueRecoveredIdr: 8_000,
      consumerSavingsIdr: 4_000,
      estimatedCo2eGrams: 950,
      integrity: { isValid: true },
      conservation: { identityDeltaGrams: 0 },
    })
    expect(summary.conservation.itemBalances).toEqual([
      { surplusItemId: 'item-a', balanceGrams: 0 },
      { surplusItemId: 'item-b', balanceGrams: 300 },
    ])
    expect(estimateCo2e(200, 500)).toBe(950)
  })

  test('uses the expired batch weight for a Processor-scoped in-progress projection', () => {
    expect(summariseLedger([
      { surplusItemId: 'item-a', eventType: 'EXPIRED', weightDeltaGrams: -800 },
      { surplusItemId: 'item-a', eventType: 'INTAKE_ACCEPTED', weightDeltaGrams: 750, metadata: JSON.stringify({ declaredWeightGrams: 800 }) },
    ])).toMatchObject({ listedGrams: 0, inProgressGrams: 750, conservation: { identityDeltaGrams: 0 } })
  })

  test('derives Processor capacity and Admin operational counts outside the browser', () => {
    const entries = [
      { surplusItemId: 'item-a', eventType: 'EXPIRED', weightDeltaGrams: -800, occurredAt: 1_000 },
      { surplusItemId: 'item-a', eventType: 'INTAKE_ACCEPTED', weightDeltaGrams: 800, occurredAt: 2_000, metadata: JSON.stringify({ declaredWeightGrams: 800 }) },
      { surplusItemId: 'item-a', eventType: 'PROCESSED', weightDeltaGrams: -800, occurredAt: 3_000, metadata: JSON.stringify({ outputType: 'bsf_larvae', outputWeightGrams: 600, residualWeightGrams: 100 }) },
    ]
    const summary = summariseLedger(entries)

    expect(summariseProcessorOperations({
      summary,
      batches: [{ status: 'offered' }, { status: 'accepted' }, { status: 'collected' }, { status: 'processed' }],
      entries,
      dailyCapacityGrams: 1_000,
      dayStartAt: 0,
      now: 5_000,
    })).toMatchObject({
      hasBatches: true,
      offeredBatchCount: 1,
      acceptedBatchCount: 1,
      collectedBatchCount: 1,
      processedBatchCount: 1,
      todayIntakeGrams: 800,
      capacityUtilizationPercent: 80,
      totalMeasuredIntakeGrams: 800,
      recoveredByOutputType: { bsf_larvae: 600 },
      residualRatePercent: 12.5,
      recoveryEfficiencyPercent: 75,
    })

    const completeSummary = summariseLedger([
      { surplusItemId: 'item-b', eventType: 'LISTED', weightDeltaGrams: 100 },
      { surplusItemId: 'item-b', eventType: 'RESCUED', weightDeltaGrams: -100, metadata: JSON.stringify({ quantity: 1, totalPrice: 1, originalPriceSnapshot: 1 }) },
    ])
    expect(summarisePlatformOperations({
      summary: completeSummary,
      accounts: [
        { role: 'merchant', status: 'active' },
        { role: 'consumer', status: 'active' },
        { role: 'processor', status: 'suspended' },
      ],
      batches: [{ status: 'unroutable' }],
    })).toEqual({
      activeMerchantCount: 1,
      activeConsumerCount: 1,
      activeProcessorCount: 0,
      unroutableBatchCount: 1,
      circularityRequiresReview: true,
    })
  })

  test('surfaces malformed metric metadata instead of returning a flattering outcome', () => {
    const summary = summariseLedger([
      { surplusItemId: 'item-a', eventType: 'LISTED', weightDeltaGrams: 100 },
      { surplusItemId: 'item-a', eventType: 'PROCESSED', weightDeltaGrams: -100 },
    ])

    expect(summary).toMatchObject({
      recoveredGrams: null,
      residualGrams: null,
      inProgressGrams: null,
      integrity: { isValid: false },
    })
    expect(summary.integrity.issues[0]?.code).toBe('MALFORMED_PROCESSED_METADATA')

    const rescued = summariseLedger([
      { surplusItemId: 'item-b', eventType: 'LISTED', weightDeltaGrams: 100 },
      { surplusItemId: 'item-b', eventType: 'RESCUED', weightDeltaGrams: -100 },
    ])
    expect(rescued).toMatchObject({
      rescuedQuantity: null,
      revenueRecoveredIdr: null,
      consumerSavingsIdr: null,
      integrity: { isValid: false },
    })
    expect(rescued.integrity.issues[0]?.code).toBe('MALFORMED_RESCUED_METADATA')
  })
})
