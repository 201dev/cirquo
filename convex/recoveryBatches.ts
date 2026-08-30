import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { calculateHaversineDistanceMeters } from '../src/lib/geo'
import { getOfferProblem, intakeResult, outcomeResult, startOfWibDay, summarizeProcessorDashboard } from '../src/lib/recovery'
import { MAX_ROUTING_ATTEMPTS, OFFER_TTL_MS, rankEligibleProcessors, type RoutingProcessor } from '../src/lib/routing'
import { materialType, outputType, recoveryBatchStatus } from './schema'
import { requireRole, requireVerifiedMerchant, requireVerifiedProcessor } from './lib/guards'
import { recordLedgerEvent } from './lib/ledger'
import { createNotification } from './lib/notifications'
import { recordAdminAction } from './lib/adminAudit'

const ROUTING_BATCH_SIZE = 50
const NOTE_MAX_LENGTH = 500
const queueTab = v.union(v.literal('offered'), v.literal('accepted'), v.literal('collected'))
const declineReasons = ['capacity', 'material_mismatch', 'distance', 'schedule', 'other'] as const
const batchView = v.object({
  _id: v.id('recoveryBatches'), status: recoveryBatchStatus,
  merchantName: v.string(), itemName: v.string(), materialType,
  offeredWeightGrams: v.number(), acceptedWeightGrams: v.optional(v.number()),
  outputType: v.optional(outputType), outputWeightGrams: v.optional(v.number()),
  residualWeightGrams: v.optional(v.number()), processLossGrams: v.optional(v.number()),
  conversionRatePercent: v.optional(v.number()), pickupAddress: v.string(),
  pickupStartAt: v.number(), pickupEndAt: v.number(),
  distanceMeters: v.union(v.number(), v.null()), offerExpiresAt: v.optional(v.number()),
  acceptedAt: v.optional(v.number()), estimatedCollectionAt: v.optional(v.number()),
  collectedAt: v.optional(v.number()), completedAt: v.optional(v.number()),
  routingAttempts: v.number(), attemptedProcessorCount: v.number(),
  declinedProcessorCount: v.number(), allowedOutputTypes: v.array(outputType),
})
const dashboardView = v.object({
  offeredCount: v.number(), acceptedCount: v.number(), collectedCount: v.number(), processedCount: v.number(),
  capacityCommittedGrams: v.number(), capacityUsagePercent: v.number(), dailyCapacityGrams: v.number(),
  todayIntakeGrams: v.number(), processedIntakeGrams: v.number(), outputWeightGrams: v.number(), residualWeightGrams: v.number(),
  outputByType: v.object({ compost: v.number(), bsf_larvae: v.number(), animal_feed: v.number(), biogas: v.number() }),
  recoveryRatePercent: v.union(v.number(), v.null()),
})

type RouteResult = 'offered' | 'unroutable' | 'skipped'
type BatchHistory = { attemptedProcessorIds: Id<'processors'>[]; declinedByProcessorIds: Id<'processors'>[] }
type LoadedRoutingProcessor = RoutingProcessor & { processorId: Id<'processors'> }

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function validateNote(note: string | undefined): string | undefined {
  const value = note?.trim()
  if (value && value.length > NOTE_MAX_LENGTH) fail('VALIDATION_FAILED', 'Catatan maksimal 500 karakter.')
  return value || undefined
}

function validatePastTime(value: number | undefined, now: number, label: string): number {
  const time = value ?? now
  if (!Number.isInteger(time) || time > now) fail('VALIDATION_FAILED', `${label} tidak boleh berada di masa depan.`)
  return time
}

function uniqueProcessorIds(ids: readonly Id<'processors'>[]): Id<'processors'>[] {
  return [...new Set(ids)]
}

function batchHistory(batch: Doc<'recoveryBatches'>): BatchHistory {
  return { attemptedProcessorIds: batch.attemptedProcessorIds ?? [], declinedByProcessorIds: batch.declinedByProcessorIds ?? [] }
}

async function requireOwnedBatch(ctx: QueryCtx | MutationCtx, sessionToken: string | undefined, batchId: Id<'recoveryBatches'>) {
  const user = await requireRole(ctx, sessionToken, ['processor'])
  const processor = await requireVerifiedProcessor(ctx, user)
  const batch = await ctx.db.get(batchId)
  if (!batch) fail('NOT_FOUND', 'Batch recovery tidak ditemukan.')
  if (batch.processorId !== processor._id) fail('FORBIDDEN', 'Batch recovery tidak ditugaskan ke Processor ini.')
  return { user, processor, batch }
}

async function toBatchView(ctx: QueryCtx, batch: Doc<'recoveryBatches'>, processor: Doc<'processors'>) {
  const [merchant, item] = await Promise.all([ctx.db.get(batch.merchantId), ctx.db.get(batch.surplusItemId)])
  if (!merchant || !item) fail('NOT_FOUND', 'Sumber batch recovery tidak ditemukan.')
  const distanceMeters = merchant.latitude !== undefined && merchant.longitude !== undefined && processor.latitude !== undefined && processor.longitude !== undefined
    ? calculateHaversineDistanceMeters(processor.latitude, processor.longitude, merchant.latitude, merchant.longitude)
    : null
  return {
    _id: batch._id, status: batch.status, merchantName: merchant.name, itemName: item.name,
    materialType: item.materialType, offeredWeightGrams: batch.offeredWeightGrams,
    acceptedWeightGrams: batch.acceptedWeightGrams, outputType: batch.outputType,
    outputWeightGrams: batch.outputWeightGrams, residualWeightGrams: batch.residualWeightGrams,
    processLossGrams: batch.processLossGrams, conversionRatePercent: batch.conversionRatePercent,
    pickupAddress: merchant.address, pickupStartAt: item.pickupStartAt, pickupEndAt: item.pickupEndAt,
    distanceMeters, offerExpiresAt: batch.offerExpiresAt, acceptedAt: batch.acceptedAt,
    estimatedCollectionAt: batch.estimatedCollectionAt, collectedAt: batch.collectedAt,
    completedAt: batch.completedAt, routingAttempts: batch.routingAttempts ?? 0,
    attemptedProcessorCount: (batch.attemptedProcessorIds ?? []).length,
    declinedProcessorCount: (batch.declinedByProcessorIds ?? []).length,
    allowedOutputTypes: batch.acceptedOutputTypes ?? processor.outputTypes ?? [],
  }
}

async function markUnroutable(ctx: MutationCtx, batch: Doc<'recoveryBatches'>, reason: string, history = batchHistory(batch)): Promise<RouteResult> {
  if (batch.status === 'unroutable') return 'skipped'
  await ctx.db.patch(batch._id, {
    status: 'unroutable', processorId: undefined, offerExpiresAt: undefined,
    routingAttempts: batch.routingAttempts ?? 0, attemptedProcessorIds: history.attemptedProcessorIds,
    declinedByProcessorIds: history.declinedByProcessorIds, residualWeightGrams: batch.offeredWeightGrams,
  })
  await recordLedgerEvent(ctx, {
    surplusItemId: batch.surplusItemId, recoveryBatchId: batch._id, eventType: 'ROUTING_FAILED', weightDeltaGrams: 0,
    metadata: { reason, attempts: batch.routingAttempts ?? 0, attemptedProcessorIds: history.attemptedProcessorIds, declinedByProcessorIds: history.declinedByProcessorIds, residualWeightGrams: batch.offeredWeightGrams },
  })
  const [merchant, item] = await Promise.all([ctx.db.get(batch.merchantId), ctx.db.get(batch.surplusItemId)])
  if (merchant) await createNotification(ctx, {
    userId: merchant.ownerId, type: 'routing_failed', title: 'Circular Routing belum berhasil',
    body: `${item?.name ?? 'Rescue Item'} belum menemukan Organic Processor dan tercatat sebagai Residual.`,
    href: `/merchant/surplus/${batch.surplusItemId}`,
  })
  return 'unroutable'
}

async function loadRoutingProcessors(ctx: MutationCtx): Promise<LoadedRoutingProcessor[]> {
  const processors = await ctx.db.query('processors').withIndex('by_verification', (q) => q.eq('verificationStatus', 'verified')).collect()
  const now = Date.now()
  const today = startOfWibDay(now)
  const candidates: LoadedRoutingProcessor[] = []
  for (const processor of processors) {
    if (processor.latitude === undefined || processor.longitude === undefined || processor.acceptedMaterialTypes === undefined || processor.dailyCapacityGrams === undefined || processor.maxPickupRadiusMeters === undefined) continue
    const acceptedToday = await ctx.db.query('recoveryBatches').withIndex('by_processor_and_accepted_at', (q) => q.eq('processorId', processor._id).gte('acceptedAt', today).lte('acceptedAt', now)).collect()
    const committedGrams = acceptedToday.reduce((total, batch) => total + batch.offeredWeightGrams, 0)
    candidates.push({
      id: String(processor._id), processorId: processor._id,
      verificationStatus: processor.verificationStatus, acceptedMaterialTypes: processor.acceptedMaterialTypes,
      latitude: processor.latitude, longitude: processor.longitude,
      maxPickupRadiusMeters: processor.maxPickupRadiusMeters,
      dailyCapacityGrams: processor.dailyCapacityGrams, committedGrams,
    })
  }
  return candidates
}

async function routePendingBatch(ctx: MutationCtx, batch: Doc<'recoveryBatches'>, now: number): Promise<RouteResult> {
  if (batch.status !== 'pending') return 'skipped'
  if ((batch.routingAttempts ?? 0) >= MAX_ROUTING_ATTEMPTS) return markUnroutable(ctx, batch, 'max_attempts_reached')
  const [item, merchant] = await Promise.all([ctx.db.get(batch.surplusItemId), ctx.db.get(batch.merchantId)])
  if (!item) return markUnroutable(ctx, batch, 'rescue_item_missing')
  if (merchant?.latitude === undefined || merchant.longitude === undefined) return markUnroutable(ctx, batch, 'merchant_location_missing')
  const processors = await loadRoutingProcessors(ctx)
  const winner = rankEligibleProcessors(
    { offeredWeightGrams: batch.offeredWeightGrams, ...batchHistory(batch) },
    { materialType: item.materialType },
    { latitude: merchant.latitude, longitude: merchant.longitude }, processors,
  )[0]
  if (!winner) return markUnroutable(ctx, batch, 'no_eligible_processor')
  const processor = processors.find((candidate) => candidate.id === winner.processorId)
  if (!processor) return markUnroutable(ctx, batch, 'processor_missing')
  const history = batchHistory(batch)
  const routingAttempts = (batch.routingAttempts ?? 0) + 1
  const offerExpiresAt = now + OFFER_TTL_MS
  const processorId = processor.processorId
  await ctx.db.patch(batch._id, {
    processorId, status: 'offered', offerExpiresAt, routingAttempts,
    attemptedProcessorIds: uniqueProcessorIds([...history.attemptedProcessorIds, processorId]),
    declinedByProcessorIds: history.declinedByProcessorIds,
  })
  await recordLedgerEvent(ctx, {
    surplusItemId: batch.surplusItemId, recoveryBatchId: batch._id, eventType: 'ROUTED', weightDeltaGrams: 0,
    metadata: { processorId, distanceMeters: winner.distanceMeters, remainingCapacityGrams: winner.remainingCapacityGrams, attempt: routingAttempts, offerExpiresAt },
  })
  const processorProfile = await ctx.db.get(processorId)
  if (processorProfile) await createNotification(ctx, {
    userId: processorProfile.ownerId, type: 'batch_routed', title: 'Batch recovery baru',
    body: `${item.name} telah dirutekan ke fasilitas Anda.`, href: `/processor/recovery/${batch._id}`,
  })
  await ctx.scheduler.runAt(offerExpiresAt, internal.recoveryBatches.expireOffer, { batchId: batch._id, offerExpiresAt })
  return 'offered'
}

export async function createRecoveryBatchForItem(
  ctx: MutationCtx,
  item: Doc<'surplusItems'>,
  merchantId: Id<'merchants'>,
) {
  return ctx.db.insert('recoveryBatches', {
    merchantId,
    surplusItemId: item._id,
    offeredWeightGrams: item.initialQuantity * item.weightPerItemGrams,
    status: 'pending',
    routingAttempts: 0,
    attemptedProcessorIds: [],
    declinedByProcessorIds: [],
    createdAt: Date.now(),
  })
}

export const listByStatus = internalQuery({
  args: { status: recoveryBatchStatus }, returns: v.array(v.any()),
  handler: async (ctx, { status }) => ctx.db.query('recoveryBatches').withIndex('by_status', (q) => q.eq('status', status)).collect(),
})

export const listForMerchant = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.array(v.object({
    _id: v.id('recoveryBatches'), surplusItemId: v.id('surplusItems'), offeredWeightGrams: v.number(),
    acceptedWeightGrams: v.optional(v.number()), outputWeightGrams: v.optional(v.number()),
    residualWeightGrams: v.optional(v.number()), processLossGrams: v.optional(v.number()),
    conversionRatePercent: v.optional(v.number()), status: recoveryBatchStatus,
    routingAttempts: v.number(), offerExpiresAt: v.optional(v.number()), processorName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    const batches = await ctx.db.query('recoveryBatches').withIndex('by_merchant', (q) => q.eq('merchantId', merchant._id)).order('desc').collect()
    return (await Promise.all(batches.map(async (batch) => {
      const [item, processor] = await Promise.all([ctx.db.get(batch.surplusItemId), batch.processorId ? ctx.db.get(batch.processorId) : null])
      if (!item || item.merchantId !== merchant._id) return null
      return {
        _id: batch._id, surplusItemId: batch.surplusItemId, offeredWeightGrams: batch.offeredWeightGrams,
        acceptedWeightGrams: batch.acceptedWeightGrams, outputWeightGrams: batch.outputWeightGrams,
        residualWeightGrams: batch.residualWeightGrams, processLossGrams: batch.processLossGrams,
        conversionRatePercent: batch.conversionRatePercent, status: batch.status,
        routingAttempts: batch.routingAttempts ?? 0, offerExpiresAt: batch.offerExpiresAt, processorName: processor?.name,
      }
    }))).filter((batch): batch is NonNullable<typeof batch> => batch !== null)
  },
})

export const listQueue = query({
  args: { sessionToken: v.optional(v.string()), tab: queueTab, limit: v.optional(v.number()) },
  returns: v.array(batchView),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const processor = await requireVerifiedProcessor(ctx, user)
    const limit = args.limit ?? 50
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail('VALIDATION_FAILED', 'Limit harus berupa bilangan 1 sampai 100.')
    const batches = args.tab === 'collected'
      ? (await Promise.all(['collected', 'processed'].map((status) =>
          ctx.db.query('recoveryBatches').withIndex('by_processor_status', (q) =>
            q.eq('processorId', processor._id).eq('status', status as 'collected' | 'processed'),
          ).order('desc').take(limit),
        ))).flat().sort((a, b) => b._creationTime - a._creationTime).slice(0, limit)
      : await ctx.db.query('recoveryBatches').withIndex('by_processor_status', (q) => q.eq('processorId', processor._id).eq('status', args.tab)).order('desc').take(limit)
    return Promise.all(batches.map((batch) => toBatchView(ctx, batch, processor)))
  },
})

export const get = query({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches') }, returns: batchView,
  handler: async (ctx, args) => {
    const { processor, batch } = await requireOwnedBatch(ctx, args.sessionToken, args.batchId)
    return toBatchView(ctx, batch, processor)
  },
})

export const getDashboard = query({
  args: { sessionToken: v.optional(v.string()), now: v.number() },
  returns: dashboardView,
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.now)) fail('VALIDATION_FAILED', 'Waktu dashboard tidak valid.')
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const processor = await requireVerifiedProcessor(ctx, user)
    // ponytail: dashboard M5 reads the facility's complete pilot-scale history.
    // Replace with M6 ledger aggregates before an unbounded production history.
    const [batches, events] = await Promise.all([
      ctx.db.query('recoveryBatches').withIndex('by_processor', (q) => q.eq('processorId', processor._id)).collect(),
      ctx.db.query('materialFlowLedger').withIndex('by_actor', (q) => q.eq('actorId', user._id)).collect(),
    ])
    return summarizeProcessorDashboard({
      batches,
      events,
      dailyCapacityGrams: processor.dailyCapacityGrams ?? 0,
      now: args.now,
    })
  },
})

export const accept = mutation({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches'), estimatedCollectionAt: v.optional(v.number()), note: v.optional(v.string()) },
  returns: v.object({ status: v.literal('accepted'), acceptedAt: v.number() }),
  handler: async (ctx, args) => {
    const { processor, batch } = await requireOwnedBatch(ctx, args.sessionToken, args.batchId)
    const item = await ctx.db.get(batch.surplusItemId)
    if (!item) fail('NOT_FOUND', 'Rescue Item sumber tidak ditemukan.')
    const now = Date.now()
    const acceptedToday = await ctx.db.query('recoveryBatches').withIndex('by_processor_and_accepted_at', (q) => q.eq('processorId', processor._id).gte('acceptedAt', startOfWibDay(now)).lte('acceptedAt', now)).collect()
    const problem = getOfferProblem({
      owned: true, status: batch.status, offerExpiresAt: batch.offerExpiresAt, now,
      acceptsMaterial: (processor.acceptedMaterialTypes ?? []).includes(item.materialType),
      committedGrams: acceptedToday.reduce((sum, commitment) => sum + commitment.offeredWeightGrams, 0),
      dailyCapacityGrams: processor.dailyCapacityGrams, offeredWeightGrams: batch.offeredWeightGrams,
    })
    if (problem) fail(problem, {
      INVALID_TRANSITION: 'Batch tidak lagi berstatus ditawarkan.', OFFER_EXPIRED: 'Masa berlaku offer telah berakhir.',
      MATERIAL_TYPE_REJECTED: 'Jenis material tidak lagi diterima Processor.', CAPACITY_EXCEEDED: 'Kapasitas harian Processor tidak mencukupi.',
      FORBIDDEN: 'Batch tidak ditugaskan ke Processor ini.',
    }[problem])
    if (args.estimatedCollectionAt !== undefined && (!Number.isInteger(args.estimatedCollectionAt) || args.estimatedCollectionAt < now)) fail('VALIDATION_FAILED', 'Estimasi pengambilan harus berada di masa depan.')
    await ctx.db.patch(batch._id, {
      status: 'accepted', acceptedAt: now, offerExpiresAt: undefined,
      estimatedCollectionAt: args.estimatedCollectionAt, acceptanceNote: validateNote(args.note),
      acceptedOutputTypes: processor.outputTypes ?? [],
    })
    return { status: 'accepted' as const, acceptedAt: now }
  },
})

export const decline = mutation({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches'), reason: v.string(), note: v.optional(v.string()) },
  returns: v.object({ status: v.literal('pending') }),
  handler: async (ctx, args) => {
    const { user, processor, batch } = await requireOwnedBatch(ctx, args.sessionToken, args.batchId)
    if (batch.status !== 'offered') fail('INVALID_TRANSITION', 'Batch tidak lagi berstatus ditawarkan.')
    if (!declineReasons.includes(args.reason as typeof declineReasons[number])) fail('VALIDATION_FAILED', 'Alasan penolakan tidak valid.')
    const note = validateNote(args.note)
    const declinedByProcessorIds = uniqueProcessorIds([...(batch.declinedByProcessorIds ?? []), processor._id])
    await ctx.db.patch(batch._id, { status: 'pending', processorId: undefined, offerExpiresAt: undefined, declinedByProcessorIds })
    await recordLedgerEvent(ctx, {
      surplusItemId: batch.surplusItemId, recoveryBatchId: batch._id, eventType: 'INTAKE_DECLINED', weightDeltaGrams: 0,
      actorId: user._id, actorRole: 'processor', metadata: { processorId: processor._id, reason: args.reason, note },
    })
    const pending = await ctx.db.get(batch._id)
    if (pending) await routePendingBatch(ctx, pending, Date.now())
    return { status: 'pending' as const }
  },
})

export const adminReroute = mutation({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches'), reason: v.string() },
  returns: v.object({ status: recoveryBatchStatus }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reason = validateNote(args.reason)
    if (!reason || reason.length < 10) fail('VALIDATION_FAILED', 'Alasan harus 10-500 karakter.')
    const batch = await ctx.db.get(args.batchId)
    if (!batch) fail('NOT_FOUND', 'Batch recovery tidak ditemukan.')
    const merchant = await ctx.db.get(batch.merchantId)
    if (!merchant) fail('NOT_FOUND', 'Merchant batch recovery tidak ditemukan.')
    if (!['offered', 'unroutable', 'pending'].includes(batch.status)) fail('INVALID_TRANSITION', 'Batch ini tidak dapat dirutekan ulang.')
    await ctx.db.patch(batch._id, { status: 'pending', processorId: undefined, offerExpiresAt: undefined })
    await recordAdminAction(ctx, { adminId: admin._id, action: 'reroute_recovery_batch', targetUserId: merchant.ownerId, targetEntityId: batch._id, previousStatus: batch.status, reasonOrNote: reason })
    const refreshed = await ctx.db.get(batch._id)
    if (!refreshed) fail('NOT_FOUND', 'Batch recovery tidak ditemukan.')
    return { status: (await routePendingBatch(ctx, refreshed, Date.now())) === 'offered' ? 'offered' as const : 'unroutable' as const }
  },
})

export const adminListReroutable = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.array(v.object({ _id: v.id('recoveryBatches'), itemName: v.string(), status: recoveryBatchStatus, offeredWeightGrams: v.number() })),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const batches = (await Promise.all(['offered', 'pending', 'unroutable'].map((status) =>
      ctx.db.query('recoveryBatches').withIndex('by_status', (q) => q.eq('status', status as 'offered' | 'pending' | 'unroutable')).take(100),
    ))).flat()
    return Promise.all(batches.map(async (batch) => ({
      _id: batch._id,
      itemName: (await ctx.db.get(batch.surplusItemId))?.name ?? 'Rescue Item',
      status: batch.status,
      offeredWeightGrams: batch.offeredWeightGrams,
    })))
  },
})

export const logIntake = mutation({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches'), acceptedWeightGrams: v.number(), collectedAt: v.optional(v.number()), note: v.optional(v.string()) },
  returns: v.object({ declaredWeightGrams: v.number(), acceptedWeightGrams: v.number(), varianceGrams: v.number(), variancePercent: v.number() }),
  handler: async (ctx, args) => {
    const { user, processor, batch } = await requireOwnedBatch(ctx, args.sessionToken, args.batchId)
    if (batch.status !== 'accepted') fail('INVALID_TRANSITION', 'Intake hanya dapat dicatat untuk batch yang diterima.')
    const result = intakeResult(args.acceptedWeightGrams, batch.offeredWeightGrams)
    if (!result) fail('VALIDATION_FAILED', 'Berat intake harus gram utuh, positif, dan maksimal 150% dari berat deklarasi.')
    if (!processor.facilityType) fail('VALIDATION_FAILED', 'Jenis fasilitas Processor belum tersedia.')
    const collectedAt = validatePastTime(args.collectedAt, Date.now(), 'Waktu penerimaan')
    const note = validateNote(args.note)
    const varianceRequiresReview = Math.abs(result.variancePercent) > 30
    await ctx.db.patch(batch._id, {
      status: 'collected', acceptedWeightGrams: args.acceptedWeightGrams, collectedAt, intakeNote: note, varianceRequiresReview,
    })
    await recordLedgerEvent(ctx, {
      surplusItemId: batch.surplusItemId, recoveryBatchId: batch._id, eventType: 'INTAKE_ACCEPTED', weightDeltaGrams: args.acceptedWeightGrams,
      actorId: user._id, actorRole: 'processor',
      metadata: { processorId: processor._id, facilityType: processor.facilityType, declaredWeightGrams: batch.offeredWeightGrams, varianceGrams: result.varianceGrams, varianceRequiresReview, collectedAt, note },
    })
    return { declaredWeightGrams: batch.offeredWeightGrams, acceptedWeightGrams: args.acceptedWeightGrams, ...result }
  },
})

export const logOutcome = mutation({
  args: { sessionToken: v.optional(v.string()), batchId: v.id('recoveryBatches'), outputType, outputWeightGrams: v.number(), residualWeightGrams: v.number(), zeroResidualConfirmed: v.optional(v.boolean()), completedAt: v.optional(v.number()), note: v.optional(v.string()) },
  returns: v.object({ processLossGrams: v.number(), conversionRatePercent: v.number() }),
  handler: async (ctx, args) => {
    const { user, processor, batch } = await requireOwnedBatch(ctx, args.sessionToken, args.batchId)
    if (batch.status !== 'collected' || batch.acceptedWeightGrams === undefined) fail('INVALID_TRANSITION', 'Outcome hanya dapat dicatat setelah intake terukur.')
    if (!(batch.acceptedOutputTypes ?? processor.outputTypes ?? []).includes(args.outputType)) fail('VALIDATION_FAILED', 'Jenis output tidak didukung fasilitas ini.')
    if (args.residualWeightGrams === 0 && !args.zeroResidualConfirmed) fail('VALIDATION_FAILED', 'Konfirmasi diperlukan untuk Residual 0 gram.')
    const result = outcomeResult({ acceptedWeightGrams: batch.acceptedWeightGrams, outputWeightGrams: args.outputWeightGrams, residualWeightGrams: args.residualWeightGrams })
    if (!result) fail('VALIDATION_FAILED', 'Berat outcome harus gram utuh, tidak negatif, dan tidak melebihi intake.')
    const completedAt = validatePastTime(args.completedAt, Date.now(), 'Waktu selesai')
    const note = validateNote(args.note)
    await ctx.db.patch(batch._id, {
      status: 'processed', outputType: args.outputType, outputWeightGrams: args.outputWeightGrams,
      residualWeightGrams: args.residualWeightGrams, processLossGrams: result.processLossGrams,
      conversionRatePercent: result.conversionRatePercent, completedAt, outcomeNote: note,
    })
    await ctx.db.patch(batch.surplusItemId, { status: args.outputWeightGrams > 0 ? 'recovered' : 'residual' })
    await recordLedgerEvent(ctx, {
      surplusItemId: batch.surplusItemId, recoveryBatchId: batch._id, eventType: 'PROCESSED', weightDeltaGrams: -batch.acceptedWeightGrams,
      actorId: user._id, actorRole: 'processor',
      metadata: { processorId: processor._id, outputType: args.outputType, outputWeightGrams: args.outputWeightGrams, residualWeightGrams: args.residualWeightGrams, processLossGrams: result.processLossGrams, conversionRatePercent: result.conversionRatePercent, note },
    })
    const merchant = await ctx.db.get(batch.merchantId)
    if (merchant) await createNotification(ctx, {
      userId: merchant.ownerId, type: 'recovery_completed', title: 'Outcome recovery tercatat',
      body: `${args.outputWeightGrams.toLocaleString('id-ID')} g berhasil di-recover dan ${args.residualWeightGrams.toLocaleString('id-ID')} g menjadi Residual.`,
      href: `/merchant/surplus/${batch.surplusItemId}`,
    })
    return result
  },
})

export const runRouting = internalMutation({
  args: {}, returns: v.object({ scanned: v.number(), routed: v.number(), unroutable: v.number() }),
  handler: async (ctx) => {
    const pending = await ctx.db.query('recoveryBatches').withIndex('by_status', (q) => q.eq('status', 'pending')).take(ROUTING_BATCH_SIZE)
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
  args: { batchId: v.id('recoveryBatches'), offerExpiresAt: v.number() },
  returns: v.union(v.literal('offered'), v.literal('unroutable'), v.literal('skipped')),
  handler: async (ctx, args): Promise<RouteResult> => {
    const batch = await ctx.db.get(args.batchId)
    const now = Date.now()
    if (!batch || batch.status !== 'offered' || batch.offerExpiresAt !== args.offerExpiresAt || args.offerExpiresAt > now) return 'skipped'
    const history = batchHistory(batch)
    const nextHistory: BatchHistory = {
      attemptedProcessorIds: uniqueProcessorIds([...history.attemptedProcessorIds, ...(batch.processorId ? [batch.processorId] : [])]),
      declinedByProcessorIds: uniqueProcessorIds([...history.declinedByProcessorIds, ...(batch.processorId ? [batch.processorId] : [])]),
    }
    if ((batch.routingAttempts ?? 0) >= MAX_ROUTING_ATTEMPTS) return markUnroutable(ctx, batch, 'offer_expired_max_attempts', nextHistory)
    await ctx.db.patch(batch._id, {
      status: 'pending', processorId: undefined, offerExpiresAt: undefined, routingAttempts: batch.routingAttempts ?? 0,
      attemptedProcessorIds: nextHistory.attemptedProcessorIds, declinedByProcessorIds: nextHistory.declinedByProcessorIds,
    })
    const pending = await ctx.db.get(batch._id)
    return pending ? routePendingBatch(ctx, pending, now) : 'skipped'
  },
})
