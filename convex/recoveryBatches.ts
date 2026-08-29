import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { OFFER_TTL_MS, MAX_ROUTING_ATTEMPTS, rankEligibleProcessors } from '../src/lib/routing'
import type { RoutingProcessor } from '../src/lib/routing'
import { recoveryBatchStatus } from './schema'
import { recordLedgerEvent } from './lib/ledger'

const ROUTING_BATCH_SIZE = 50

type RouteResult = 'offered' | 'unroutable' | 'skipped'
type BatchHistory = {
  attemptedProcessorIds: Id<'processors'>[]
  declinedByProcessorIds: Id<'processors'>[]
}
type LoadedRoutingProcessor = RoutingProcessor & { processorId: Id<'processors'> }

function uniqueProcessorIds(ids: readonly Id<'processors'>[]): Id<'processors'>[] {
  return [...new Set(ids)]
}

function batchHistory(batch: Doc<'recoveryBatches'>): BatchHistory {
  return {
    attemptedProcessorIds: batch.attemptedProcessorIds ?? [],
    declinedByProcessorIds: batch.declinedByProcessorIds ?? [],
  }
}

async function markUnroutable(
  ctx: MutationCtx,
  batch: Doc<'recoveryBatches'>,
  reason: string,
  history = batchHistory(batch),
): Promise<RouteResult> {
  if (batch.status === 'unroutable') return 'skipped'

  await ctx.db.patch(batch._id, {
    status: 'unroutable',
    processorId: undefined,
    offerExpiresAt: undefined,
    routingAttempts: batch.routingAttempts ?? 0,
    attemptedProcessorIds: history.attemptedProcessorIds,
    declinedByProcessorIds: history.declinedByProcessorIds,
    residualWeightGrams: batch.offeredWeightGrams,
  })
  // M4-02 recorded the material delta when it entered recovery. This records
  // the terminal routing state without debiting the same immutable weight again.
  await recordLedgerEvent(ctx, {
    surplusItemId: batch.surplusItemId,
    recoveryBatchId: batch._id,
    eventType: 'ROUTING_FAILED',
    weightDeltaGrams: 0,
    metadata: {
      reason,
      attempts: batch.routingAttempts ?? 0,
      attemptedProcessorIds: history.attemptedProcessorIds,
      declinedByProcessorIds: history.declinedByProcessorIds,
      residualWeightGrams: batch.offeredWeightGrams,
    },
  })
  return 'unroutable'
}

async function loadRoutingProcessors(
  ctx: MutationCtx,
): Promise<LoadedRoutingProcessor[]> {
  const processors = await ctx.db
    .query('processors')
    .withIndex('by_verification', (q) => q.eq('verificationStatus', 'verified'))
    .collect()

  const candidates: LoadedRoutingProcessor[] = []
  for (const processor of processors) {
    if (
      processor.latitude === undefined ||
      processor.longitude === undefined ||
      processor.acceptedMaterialTypes === undefined ||
      processor.dailyCapacityGrams === undefined ||
      processor.maxPickupRadiusMeters === undefined
    ) continue

    const activeOffers = await ctx.db
      .query('recoveryBatches')
      .withIndex('by_processor_status', (q) =>
        q.eq('processorId', processor._id).eq('status', 'offered'),
      )
      .collect()
    // ponytail: M4 has no acceptance lifecycle yet, so live offers reserve
    // capacity. Include accepted-today batches once M5 records acceptedAt.
    const committedGrams = activeOffers.reduce(
      (total, batch) => total + batch.offeredWeightGrams,
      0,
    )
    candidates.push({
      id: String(processor._id),
      processorId: processor._id,
      verificationStatus: processor.verificationStatus,
      acceptedMaterialTypes: processor.acceptedMaterialTypes,
      latitude: processor.latitude,
      longitude: processor.longitude,
      maxPickupRadiusMeters: processor.maxPickupRadiusMeters,
      dailyCapacityGrams: processor.dailyCapacityGrams,
      committedGrams,
    })
  }
  return candidates
}

async function routePendingBatch(
  ctx: MutationCtx,
  batch: Doc<'recoveryBatches'>,
  now: number,
): Promise<RouteResult> {
  if (batch.status !== 'pending') return 'skipped'
  if ((batch.routingAttempts ?? 0) >= MAX_ROUTING_ATTEMPTS) {
    return markUnroutable(ctx, batch, 'max_attempts_reached')
  }

  const [item, merchant] = await Promise.all([
    ctx.db.get(batch.surplusItemId),
    ctx.db.get(batch.merchantId),
  ])
  if (!item) return markUnroutable(ctx, batch, 'rescue_item_missing')
  if (merchant?.latitude === undefined || merchant.longitude === undefined) {
    return markUnroutable(ctx, batch, 'merchant_location_missing')
  }

  const processors = await loadRoutingProcessors(ctx)
  const ranked = rankEligibleProcessors(
    { offeredWeightGrams: batch.offeredWeightGrams, ...batchHistory(batch) },
    { materialType: item.materialType },
    { latitude: merchant.latitude, longitude: merchant.longitude },
    processors,
  )
  const winner = ranked[0]
  if (!winner) return markUnroutable(ctx, batch, 'no_eligible_processor')

  const processor = processors.find((candidate) => candidate.id === winner.processorId)
  if (!processor) return markUnroutable(ctx, batch, 'processor_missing')

  const history = batchHistory(batch)
  const routingAttempts = (batch.routingAttempts ?? 0) + 1
  const offerExpiresAt = now + OFFER_TTL_MS
  const processorId = processor.processorId
  await ctx.db.patch(batch._id, {
    processorId,
    status: 'offered',
    offerExpiresAt,
    routingAttempts,
    attemptedProcessorIds: uniqueProcessorIds([
      ...history.attemptedProcessorIds,
      processorId,
    ]),
    declinedByProcessorIds: history.declinedByProcessorIds,
  })
  await recordLedgerEvent(ctx, {
    surplusItemId: batch.surplusItemId,
    recoveryBatchId: batch._id,
    eventType: 'ROUTED',
    weightDeltaGrams: 0,
    metadata: {
      processorId,
      distanceMeters: winner.distanceMeters,
      remainingCapacityGrams: winner.remainingCapacityGrams,
      attempt: routingAttempts,
      offerExpiresAt,
    },
  })
  await ctx.scheduler.runAt(offerExpiresAt, internal.recoveryBatches.expireOffer, {
    batchId: batch._id,
    offerExpiresAt,
  })
  return 'offered'
}

export const listByStatus = internalQuery({
  args: { status: recoveryBatchStatus },
  handler: async (ctx, { status }) => ctx.db
    .query('recoveryBatches')
    .withIndex('by_status', (q) => q.eq('status', status))
    .collect(),
})

export const runRouting = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ scanned: number; routed: number; unroutable: number }> => {
    const pending = await ctx.db
      .query('recoveryBatches')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .take(ROUTING_BATCH_SIZE)
    let routed = 0
    let unroutable = 0

    for (const batch of pending) {
      const result = await routePendingBatch(ctx, batch, Date.now())
      if (result === 'offered') routed += 1
      if (result === 'unroutable') unroutable += 1
    }
    return { scanned: pending.length, routed, unroutable }
  },
})

export const expireOffer = internalMutation({
  args: {
    batchId: v.id('recoveryBatches'),
    offerExpiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<RouteResult> => {
    const batch = await ctx.db.get(args.batchId)
    const now = Date.now()
    if (
      !batch ||
      batch.status !== 'offered' ||
      batch.offerExpiresAt !== args.offerExpiresAt ||
      args.offerExpiresAt > now
    ) return 'skipped'

    const history = batchHistory(batch)
    const nextHistory: BatchHistory = {
      attemptedProcessorIds: uniqueProcessorIds([
        ...history.attemptedProcessorIds,
        ...(batch.processorId ? [batch.processorId] : []),
      ]),
      declinedByProcessorIds: uniqueProcessorIds([
        ...history.declinedByProcessorIds,
        ...(batch.processorId ? [batch.processorId] : []),
      ]),
    }
    if ((batch.routingAttempts ?? 0) >= MAX_ROUTING_ATTEMPTS) {
      return markUnroutable(ctx, batch, 'offer_expired_max_attempts', nextHistory)
    }

    await ctx.db.patch(batch._id, {
      status: 'pending',
      processorId: undefined,
      offerExpiresAt: undefined,
      routingAttempts: batch.routingAttempts ?? 0,
      attemptedProcessorIds: nextHistory.attemptedProcessorIds,
      declinedByProcessorIds: nextHistory.declinedByProcessorIds,
    })
    const pending = await ctx.db.get(batch._id)
    return pending ? routePendingBatch(ctx, pending, now) : 'skipped'
  },
})
