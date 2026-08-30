import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { requireRole, requireVerifiedProcessor } from './lib/guards'
import { startOfWibDay } from '../src/lib/recovery'
import { summariseLedger, summarisePlatformOperations, summariseProcessorOperations } from '../src/lib/impact'

const IMPACT_READ_LIMIT = 2_000

function requireComplete<T>(rows: T[], label: string): T[] {
  if (rows.length === IMPACT_READ_LIMIT) throw new ConvexError({ code: 'IMPACT_REQUIRES_AGGREGATION', message: `${label} mencapai batas agregasi; angka tidak ditampilkan agar tidak terpotong.` })
  return rows
}

const integrityIssue = v.object({
  code: v.string(),
  message: v.string(),
  surplusItemId: v.string(),
  entryId: v.optional(v.string()),
})

const recoveredByOutputType = v.object({
  compost: v.number(),
  bsf_larvae: v.number(),
  animal_feed: v.number(),
  biogas: v.number(),
})

const impactSummary = v.object({
  listedItemCount: v.number(),
  listedGrams: v.number(),
  rescuedQuantity: v.union(v.number(), v.null()),
  rescuedGrams: v.number(),
  measuredIntakeGrams: v.union(v.number(), v.null()),
  processedIntakeGrams: v.union(v.number(), v.null()),
  recoveredGrams: v.union(v.number(), v.null()),
  recoveredByOutputType: v.union(recoveredByOutputType, v.null()),
  residualGrams: v.union(v.number(), v.null()),
  processLossGrams: v.union(v.number(), v.null()),
  measurementAdjustmentGrams: v.union(v.number(), v.null()),
  inProgressGrams: v.union(v.number(), v.null()),
  circularityRatePercent: v.union(v.number(), v.null()),
  diversionRatePercent: v.union(v.number(), v.null()),
  revenueRecoveredIdr: v.union(v.number(), v.null()),
  consumerSavingsIdr: v.union(v.number(), v.null()),
  estimatedCo2eGrams: v.union(v.number(), v.null()),
  methodologyVersion: v.string(),
  integrity: v.object({ isValid: v.boolean(), issues: v.array(integrityIssue) }),
  conservation: v.object({
    itemBalances: v.array(v.object({ surplusItemId: v.string(), balanceGrams: v.number() })),
    identityDeltaGrams: v.union(v.number(), v.null()),
  }),
})

const processorImpactSummary = impactSummary.extend({
  processor: v.object({
    hasBatches: v.boolean(),
    offeredBatchCount: v.number(),
    acceptedBatchCount: v.number(),
    collectedBatchCount: v.number(),
    processedBatchCount: v.number(),
    dailyCapacityGrams: v.union(v.number(), v.null()),
    todayIntakeGrams: v.union(v.number(), v.null()),
    capacityUtilizationPercent: v.union(v.number(), v.null()),
    totalMeasuredIntakeGrams: v.union(v.number(), v.null()),
    recoveredByOutputType: v.union(recoveredByOutputType, v.null()),
    residualRatePercent: v.union(v.number(), v.null()),
    recoveryEfficiencyPercent: v.union(v.number(), v.null()),
  }),
})

const platformImpactSummary = impactSummary.extend({
  platform: v.object({
    activeMerchantCount: v.number(),
    activeConsumerCount: v.number(),
    activeProcessorCount: v.number(),
    unroutableBatchCount: v.number(),
    circularityRequiresReview: v.boolean(),
  }),
})

function toImpactEntries(entries: readonly Doc<'materialFlowLedger'>[]) {
  return entries.map((entry) => ({
    id: String(entry._id),
    surplusItemId: String(entry.surplusItemId),
    eventType: entry.eventType,
    weightDeltaGrams: entry.weightDeltaGrams,
    metadata: entry.metadata,
    occurredAt: entry.occurredAt,
  }))
}

async function requireMerchant(ctx: QueryCtx, sessionToken: string | undefined) {
  const user = await requireRole(ctx, sessionToken, ['merchant'])
  const merchant = await ctx.db.query('merchants')
    .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
    .unique()
  if (!merchant) throw new ConvexError({ code: 'NOT_FOUND', message: 'Profil Merchant belum tersedia.' })
  return merchant
}

async function requireProcessor(ctx: QueryCtx, sessionToken: string | undefined) {
  const user = await requireRole(ctx, sessionToken, ['processor'])
  return requireVerifiedProcessor(ctx, user)
}

export const getConsumerSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    const consumer = await requireRole(ctx, args.sessionToken, ['consumer'])
    const orders = requireComplete(await ctx.db.query('orders')
      .withIndex('by_user', (index) => index.eq('userId', consumer._id))
      .take(IMPACT_READ_LIMIT), 'Riwayat order Consumer')
    // ponytail: one indexed read per owned order is correct at pilot scale.
    // Add an order-owner ledger index only when Consumer history becomes large.
    const entries = (await Promise.all(orders.map((order) => ctx.db.query('materialFlowLedger')
      .withIndex('by_order', (index) => index.eq('orderId', order._id))
      .take(IMPACT_READ_LIMIT)))).flat().filter((entry) => entry.eventType === 'RESCUED')
    return summariseLedger(toImpactEntries(entries))
  },
})

export const getMerchantSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    const merchant = await requireMerchant(ctx, args.sessionToken)
    const items = requireComplete(await ctx.db.query('surplusItems')
      .withIndex('by_merchant', (index) => index.eq('merchantId', merchant._id))
      .take(IMPACT_READ_LIMIT), 'Rescue Item Merchant')
    const entries = (await Promise.all(items.map((item) => ctx.db.query('materialFlowLedger')
      .withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id))
      .take(IMPACT_READ_LIMIT)))).flat()
    return summariseLedger(toImpactEntries(entries))
  },
})

export const getProcessorSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: processorImpactSummary,
  handler: async (ctx, args) => {
    const processor = await requireProcessor(ctx, args.sessionToken)
    const batches = requireComplete(await ctx.db.query('recoveryBatches')
      .withIndex('by_processor', (index) => index.eq('processorId', processor._id))
      .take(IMPACT_READ_LIMIT), 'Batch Processor')
    const entries = (await Promise.all(batches.map((batch) => ctx.db.query('materialFlowLedger')
      .withIndex('by_recovery_batch', (index) => index.eq('recoveryBatchId', batch._id))
      .take(IMPACT_READ_LIMIT)))).flat()
    const impactEntries = toImpactEntries(entries)
    const now = Date.now()
    const summary = summariseLedger(impactEntries)
    return {
      ...summary,
      processor: summariseProcessorOperations({
        summary,
        batches,
        entries: impactEntries,
        dailyCapacityGrams: processor.dailyCapacityGrams ?? 0,
        dayStartAt: startOfWibDay(now),
        now,
      }),
    }
  },
})

export const getPlatformSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: platformImpactSummary,
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    // ponytail: read-time aggregation is intentional at pilot scale.
    // M6-01 forbids snapshot counters; paginate/aggregate only with measured load.
    const [entries, accounts, unroutableBatches] = await Promise.all([
      ctx.db.query('materialFlowLedger').withIndex('by_occurred_at').take(IMPACT_READ_LIMIT),
      ctx.db.query('users').take(IMPACT_READ_LIMIT),
      ctx.db.query('recoveryBatches').withIndex('by_status', (index) => index.eq('status', 'unroutable')).take(IMPACT_READ_LIMIT),
    ])
    requireComplete(entries, 'Material Flow Ledger')
    requireComplete(accounts, 'Akun platform')
    requireComplete(unroutableBatches, 'Batch unroutable')
    const summary = summariseLedger(toImpactEntries(entries))
    return {
      ...summary,
      platform: summarisePlatformOperations({
        summary,
        accounts,
        batches: unroutableBatches,
      }),
    }
  },
})
