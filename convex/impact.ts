import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { requireRole } from './lib/guards'
import { summariseLedger } from '../src/lib/impact'

const integrityIssue = v.object({
  code: v.string(),
  message: v.string(),
  surplusItemId: v.string(),
  entryId: v.optional(v.string()),
})

const impactSummary = v.object({
  listedItemCount: v.number(),
  listedGrams: v.number(),
  rescuedQuantity: v.union(v.number(), v.null()),
  rescuedGrams: v.number(),
  recoveredGrams: v.union(v.number(), v.null()),
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

function toImpactEntries(entries: readonly Doc<'materialFlowLedger'>[]) {
  return entries.map((entry) => ({
    id: String(entry._id),
    surplusItemId: String(entry.surplusItemId),
    eventType: entry.eventType,
    weightDeltaGrams: entry.weightDeltaGrams,
    metadata: entry.metadata,
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
  const processor = await ctx.db.query('processors')
    .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
    .unique()
  if (!processor) throw new ConvexError({ code: 'NOT_FOUND', message: 'Profil Organic Processor belum tersedia.' })
  return processor
}

export const getConsumerSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    const consumer = await requireRole(ctx, args.sessionToken, ['consumer'])
    const orders = await ctx.db.query('orders')
      .withIndex('by_user', (index) => index.eq('userId', consumer._id))
      .collect()
    // ponytail: one indexed read per owned order is correct at pilot scale.
    // Add an order-owner ledger index only when Consumer history becomes large.
    const entries = (await Promise.all(orders.map((order) => ctx.db.query('materialFlowLedger')
      .withIndex('by_order', (index) => index.eq('orderId', order._id))
      .collect()))).flat().filter((entry) => entry.eventType === 'RESCUED')
    return summariseLedger(toImpactEntries(entries))
  },
})

export const getMerchantSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    const merchant = await requireMerchant(ctx, args.sessionToken)
    const items = await ctx.db.query('surplusItems')
      .withIndex('by_merchant', (index) => index.eq('merchantId', merchant._id))
      .collect()
    const entries = (await Promise.all(items.map((item) => ctx.db.query('materialFlowLedger')
      .withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id))
      .collect()))).flat()
    return summariseLedger(toImpactEntries(entries))
  },
})

export const getProcessorSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    const processor = await requireProcessor(ctx, args.sessionToken)
    const batches = await ctx.db.query('recoveryBatches')
      .withIndex('by_processor', (index) => index.eq('processorId', processor._id))
      .collect()
    const entries = (await Promise.all(batches.map((batch) => ctx.db.query('materialFlowLedger')
      .withIndex('by_recovery_batch', (index) => index.eq('recoveryBatchId', batch._id))
      .collect()))).flat()
    return summariseLedger(toImpactEntries(entries))
  },
})

export const getPlatformSummary = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: impactSummary,
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    // ponytail: read-time aggregation is intentional at pilot scale.
    // M6-01 forbids snapshot counters; paginate/aggregate only with measured load.
    const entries = await ctx.db.query('materialFlowLedger').collect()
    return summariseLedger(toImpactEntries(entries))
  },
})
