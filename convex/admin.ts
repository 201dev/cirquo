import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import { requireRole } from './lib/guards'
import { recordAdminAction } from './lib/adminAudit'
import { recordLedgerEvent } from './lib/ledger'
import { createNotification } from './lib/notifications'
import { queueSandboxRefund } from './lib/refunds'
import { checkItemLedgerIntegrity } from '../src/lib/ledger-integrity'
import { summariseLedger } from '../src/lib/impact'

const terminalEventTypes = new Set(['RESCUED', 'PROCESSED', 'ROUTING_FAILED', 'MODERATED'])
const sensitiveMetadataKey = /pickup.?code|password|token|raw.?payload|authorization|cookie|secret|credential|hash/i

const integrityIssue = v.object({ code: v.string(), message: v.string(), entryId: v.optional(v.string()) })
const impactIssue = v.object({ code: v.string(), message: v.string(), surplusItemId: v.string(), entryId: v.optional(v.string()) })
const impactSummary = v.object({
  listedItemCount: v.number(), listedGrams: v.number(), rescuedQuantity: v.union(v.number(), v.null()), rescuedGrams: v.number(),
  measuredIntakeGrams: v.union(v.number(), v.null()), processedIntakeGrams: v.union(v.number(), v.null()),
  recoveredGrams: v.union(v.number(), v.null()),
  recoveredByOutputType: v.union(v.object({ compost: v.number(), bsf_larvae: v.number(), animal_feed: v.number(), biogas: v.number() }), v.null()),
  residualGrams: v.union(v.number(), v.null()), processLossGrams: v.union(v.number(), v.null()),
  measurementAdjustmentGrams: v.union(v.number(), v.null()), inProgressGrams: v.union(v.number(), v.null()),
  circularityRatePercent: v.union(v.number(), v.null()), diversionRatePercent: v.union(v.number(), v.null()),
  revenueRecoveredIdr: v.union(v.number(), v.null()), consumerSavingsIdr: v.union(v.number(), v.null()),
  estimatedCo2eGrams: v.union(v.number(), v.null()), methodologyVersion: v.string(),
  integrity: v.object({ isValid: v.boolean(), issues: v.array(impactIssue) }),
  conservation: v.object({ itemBalances: v.array(v.object({ surplusItemId: v.string(), balanceGrams: v.number() })), identityDeltaGrams: v.union(v.number(), v.null()) }),
})

const searchRow = v.object({
  surplusItemId: v.id('surplusItems'), itemName: v.string(), merchantId: v.id('merchants'), merchantName: v.string(),
  status: v.string(), eventCount: v.number(), eventTypes: v.array(v.string()), lastEventAt: v.union(v.number(), v.null()), balanceGrams: v.number(),
})

function toImpactEntries(entries: readonly Doc<'materialFlowLedger'>[]) {
  return entries.map((entry) => ({
    id: String(entry._id), surplusItemId: String(entry.surplusItemId), eventType: entry.eventType,
    weightDeltaGrams: entry.weightDeltaGrams, metadata: entry.metadata, occurredAt: entry.occurredAt,
  }))
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sensitiveMetadataKey.test(key) ? '[DIHAPUS]' : redact(nested)]))
}

function safeMetadata(raw: string | undefined): { value: Record<string, unknown> | null; malformed: boolean } {
  if (!raw) return { value: null, malformed: false }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { value: null, malformed: true }
    return { value: redact(parsed) as Record<string, unknown>, malformed: false }
  } catch {
    return { value: null, malformed: true }
  }
}

async function terminalItems(ctx: Parameters<typeof requireRole>[0]) {
  return (await Promise.all(['closed', 'recovered', 'residual', 'moderated'].map((status) => ctx.db.query('surplusItems')
    .withIndex('by_status', (index) => index.eq('status', status as 'closed' | 'recovered' | 'residual' | 'moderated'))
    .take(1_000)))).flat()
}

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function note(value: string | undefined, required = false) {
  const result = value?.trim() ?? ''
  if ((required && result.length < 10) || result.length > 500) fail('VALIDATION_FAILED', required ? 'Alasan harus 10-500 karakter.' : 'Catatan maksimal 500 karakter.')
  return result || undefined
}

async function moderateItem(ctx: MutationCtx, input: {
  item: Doc<'surplusItems'>
  adminId: Id<'users'>
  reason: string
}) {
  const openOrders = (await Promise.all((['reserved', 'paid'] as const).map((status) => ctx.db.query('orders')
    .withIndex('by_item_status', (index) => index.eq('surplusItemId', input.item._id).eq('status', status)).collect()))).flat()
  const batches = await ctx.db.query('recoveryBatches').withIndex('by_item', (index) => index.eq('surplusItemId', input.item._id)).collect()
  if (batches.some((batch) => batch.status === 'collected')) fail('INVALID_TRANSITION', 'Material sudah diterima Processor dan harus menyelesaikan outcome.')
  let ordersRefunded = 0
  for (const order of openOrders) {
    await ctx.db.patch(order._id, { status: 'expired' })
    await recordLedgerEvent(ctx, { surplusItemId: input.item._id, orderId: order._id, eventType: 'CANCELLED', weightDeltaGrams: 0, actorId: input.adminId, actorRole: 'admin', metadata: { reason: 'LISTING_MODERATED' } })
    if (order.status === 'paid' && await queueSandboxRefund(ctx, order, 'listing-moderated')) ordersRefunded += 1
    await createNotification(ctx, { userId: order.userId, type: 'listing_moderated', title: 'Rescue Item dibatalkan', body: `${input.item.name} dimoderasi. ${order.status === 'paid' ? 'Refund Sandbox sedang diproses.' : 'Reservasi dilepas.'}`, href: `/orders/${order._id}` })
  }
  const cancellable = batches.filter((batch) => ['pending', 'offered', 'accepted'].includes(batch.status))
  for (const batch of cancellable) {
    await ctx.db.patch(batch._id, { status: 'cancelled', offerExpiresAt: undefined })
    if (batch.processorId) {
      const processor = await ctx.db.get(batch.processorId)
      if (processor) await createNotification(ctx, { userId: processor.ownerId, type: 'batch_cancelled', title: 'Batch recovery dibatalkan', body: `${input.item.name} dibatalkan melalui moderasi sebelum intake fisik.`, href: '/processor/recovery' })
    }
  }
  const entries = await ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', input.item._id)).collect()
  const ledgerUnresolvedGrams = Math.max(0, entries.reduce((sum, entry) => sum + entry.weightDeltaGrams, 0))
  const physicalUnresolvedGrams = input.item.remainingQuantity * input.item.weightPerItemGrams + openOrders.reduce((sum, order) => sum + order.rescuedWeightGrams, 0)
  await ctx.db.patch(input.item._id, { status: 'moderated', remainingQuantity: 0, moderationReason: input.reason })
  await recordLedgerEvent(ctx, {
    surplusItemId: input.item._id, eventType: 'MODERATED', weightDeltaGrams: -ledgerUnresolvedGrams,
    actorId: input.adminId, actorRole: 'admin',
    metadata: { reason: input.reason, previousStatus: input.item.status, residualWeightGrams: physicalUnresolvedGrams, ordersRefunded, batchesCancelled: cancellable.length },
  })
  const merchant = await ctx.db.get(input.item.merchantId)
  if (merchant) await createNotification(ctx, { userId: merchant.ownerId, type: 'listing_moderated', title: 'Rescue Item dimoderasi', body: `${input.item.name}: ${input.reason}`, href: `/merchant/surplus/${input.item._id}` })
  return { moderatedWeightGrams: physicalUnresolvedGrams, ordersRefunded, batchesCancelled: cancellable.length }
}

const partnerRow = v.object({
  kind: v.union(v.literal('merchant'), v.literal('processor')),
  entityId: v.union(v.id('merchants'), v.id('processors')), ownerId: v.id('users'), ownerName: v.string(), ownerEmail: v.string(),
  name: v.string(), city: v.union(v.string(), v.null()), address: v.union(v.string(), v.null()), verificationStatus: v.string(),
  businessType: v.union(v.string(), v.null()), facilityType: v.union(v.string(), v.null()), dailyCapacityGrams: v.union(v.number(), v.null()), createdAt: v.number(),
})

async function partnerRows(ctx: Parameters<typeof requireRole>[0], statuses: readonly Doc<'merchants'>['verificationStatus'][]): Promise<Array<{
  kind: 'merchant' | 'processor'; entityId: Id<'merchants'> | Id<'processors'>; ownerId: Id<'users'>; ownerName: string; ownerEmail: string;
  name: string; city: string | null; address: string | null; verificationStatus: string; businessType: string | null; facilityType: string | null; dailyCapacityGrams: number | null; createdAt: number;
}>> {
  const [merchants, processors] = await Promise.all([
    Promise.all(statuses.map((status) => ctx.db.query('merchants').withIndex('by_verification', (index) => index.eq('verificationStatus', status)).take(100))),
    Promise.all(statuses.map((status) => ctx.db.query('processors').withIndex('by_verification', (index) => index.eq('verificationStatus', status)).take(100))),
  ])
  return (await Promise.all([
    ...merchants.flat().map(async (profile) => { const owner = await ctx.db.get(profile.ownerId); return { kind: 'merchant' as const, entityId: profile._id, ownerId: profile.ownerId, ownerName: owner?.name ?? 'Akun tidak ditemukan', ownerEmail: owner?.email ?? '', name: profile.name, city: profile.city ?? null, address: profile.address, verificationStatus: profile.verificationStatus, businessType: profile.businessType ?? null, facilityType: null, dailyCapacityGrams: null, createdAt: profile.createdAt } }),
    ...processors.flat().map(async (profile) => { const owner = await ctx.db.get(profile.ownerId); return { kind: 'processor' as const, entityId: profile._id, ownerId: profile.ownerId, ownerName: owner?.name ?? 'Akun tidak ditemukan', ownerEmail: owner?.email ?? '', name: profile.name, city: profile.city ?? null, address: profile.address ?? null, verificationStatus: profile.verificationStatus, businessType: null, facilityType: profile.facilityType ?? null, dailyCapacityGrams: profile.dailyCapacityGrams ?? null, createdAt: profile.createdAt } }),
  ])).sort((left, right) => left.createdAt - right.createdAt)
}

export const listPendingVerifications = query({
  args: { sessionToken: v.optional(v.string()) }, returns: v.array(partnerRow),
  handler: async (ctx, args) => { await requireRole(ctx, args.sessionToken, ['admin']); return partnerRows(ctx, ['pending']) },
})

export const listPartnerAccounts = query({
  args: { sessionToken: v.optional(v.string()) }, returns: v.array(partnerRow),
  handler: async (ctx, args) => { await requireRole(ctx, args.sessionToken, ['admin']); return partnerRows(ctx, ['verified', 'rejected', 'suspended']) },
})

export const verifyMerchant = mutation({
  args: { sessionToken: v.optional(v.string()), merchantId: v.id('merchants'), note: v.optional(v.string()) },
  returns: v.object({ merchantId: v.id('merchants'), verificationStatus: v.literal('verified'), verifiedAt: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reviewNote = note(args.note)
    const merchant = await ctx.db.get(args.merchantId)
    if (!merchant) fail('NOT_FOUND', 'Profil Merchant tidak ditemukan.')
    if (merchant.verificationStatus === 'verified') fail('ALREADY_RESOLVED', 'Merchant sudah terverifikasi.')
    if (merchant.verificationStatus === 'suspended') fail('INVALID_TRANSITION', 'Akun harus direinstatement sebelum diverifikasi kembali.')
    const verifiedAt = Date.now()
    await ctx.db.patch(merchant._id, { verificationStatus: 'verified', verifiedAt, verificationNote: reviewNote, rejectionReason: undefined })
    await recordAdminAction(ctx, { adminId: admin._id, action: 'verify_merchant', targetTable: 'merchants', targetId: merchant._id, note: reviewNote })
    await createNotification(ctx, { userId: merchant.ownerId, type: 'account_verified', title: 'Merchant terverifikasi', body: 'Profil disetujui. Anda sekarang dapat menerbitkan Rescue Item.', href: '/merchant' })
    return { merchantId: merchant._id, verificationStatus: 'verified' as const, verifiedAt }
  },
})

export const verifyProcessor = mutation({
  args: { sessionToken: v.optional(v.string()), processorId: v.id('processors'), note: v.optional(v.string()) },
  returns: v.object({ processorId: v.id('processors'), verificationStatus: v.literal('verified'), verifiedAt: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reviewNote = note(args.note)
    const processor = await ctx.db.get(args.processorId)
    if (!processor) fail('NOT_FOUND', 'Profil Organic Processor tidak ditemukan.')
    if (processor.verificationStatus === 'verified') fail('ALREADY_RESOLVED', 'Organic Processor sudah terverifikasi.')
    if (processor.verificationStatus === 'suspended') fail('INVALID_TRANSITION', 'Akun harus direinstatement sebelum diverifikasi kembali.')
    if (!processor.acceptedMaterialTypes?.length || !processor.outputTypes?.length || !processor.dailyCapacityGrams || processor.dailyCapacityGrams <= 0) fail('VALIDATION_FAILED', 'Profil kapasitas Processor belum lengkap.')
    const verifiedAt = Date.now()
    await ctx.db.patch(processor._id, { verificationStatus: 'verified', verifiedAt, verificationNote: reviewNote, rejectionReason: undefined })
    await recordAdminAction(ctx, { adminId: admin._id, action: 'verify_processor', targetTable: 'processors', targetId: processor._id, note: reviewNote })
    await createNotification(ctx, { userId: processor.ownerId, type: 'account_verified', title: 'Organic Processor terverifikasi', body: 'Profil fasilitas disetujui dan dapat menerima Circular Routing.', href: '/processor' })
    return { processorId: processor._id, verificationStatus: 'verified' as const, verifiedAt }
  },
})

export const rejectAccount = mutation({
  args: { sessionToken: v.optional(v.string()), kind: v.union(v.literal('merchant'), v.literal('processor')), entityId: v.union(v.id('merchants'), v.id('processors')), reason: v.string() },
  returns: v.object({ verificationStatus: v.literal('rejected'), rejectedAt: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reason = note(args.reason, true)!
    const profile = args.kind === 'merchant' ? await ctx.db.get('merchants', args.entityId as Id<'merchants'>) : await ctx.db.get('processors', args.entityId as Id<'processors'>)
    if (!profile) fail('NOT_FOUND', 'Profil tidak ditemukan.')
    if (profile.verificationStatus !== 'pending') fail('ALREADY_RESOLVED', 'Permohonan ini sudah diputuskan.')
    await ctx.db.patch(profile._id, { verificationStatus: 'rejected', rejectionReason: reason })
    await recordAdminAction(ctx, { adminId: admin._id, action: 'reject_account', targetTable: args.kind === 'merchant' ? 'merchants' : 'processors', targetId: profile._id, reason })
    await createNotification(ctx, { userId: profile.ownerId, type: 'account_rejected', title: 'Verifikasi ditolak', body: reason, href: '/pending-verification' })
    return { verificationStatus: 'rejected' as const, rejectedAt: Date.now() }
  },
})

export const suspendUser = mutation({
  args: { sessionToken: v.optional(v.string()), userId: v.id('users'), suspend: v.boolean(), reason: v.string() },
  returns: v.object({ userId: v.id('users'), status: v.union(v.literal('active'), v.literal('suspended')), sessionsRevoked: v.number(), affectedListings: v.number(), affectedBatches: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reason = note(args.reason, true)!
    const target = await ctx.db.get(args.userId)
    if (!target) fail('NOT_FOUND', 'Akun tidak ditemukan.')
    if (target.role === 'admin' || target._id === admin._id) fail('FORBIDDEN', 'Akun Admin tidak dapat ditangguhkan dari aplikasi.')
    const status = args.suspend ? 'suspended' as const : 'active' as const
    if (target.status === status) fail('ALREADY_RESOLVED', `Akun sudah ${args.suspend ? 'ditangguhkan' : 'aktif'}.`)
    const sessions = await ctx.db.query('sessions').withIndex('by_user', (index) => index.eq('userId', target._id)).take(1_000)
    if (sessions.length === 1_000) fail('VALIDATION_FAILED', 'Terlalu banyak sesi aktif; lakukan pencabutan operator.')
    await ctx.db.patch(target._id, { status })
    let affectedListings = 0
    let affectedBatches = 0
    if (target.role === 'merchant') {
      const merchant = await ctx.db.query('merchants').withIndex('by_owner', (index) => index.eq('ownerId', target._id)).unique()
      if (merchant) {
        await ctx.db.patch(merchant._id, { verificationStatus: args.suspend ? 'suspended' : 'pending', rejectionReason: args.suspend ? reason : undefined })
        if (args.suspend) {
          const items = await ctx.db.query('surplusItems').withIndex('by_merchant', (index) => index.eq('merchantId', merchant._id)).take(200)
          if (items.length === 200) fail('VALIDATION_FAILED', 'Terlalu banyak Rescue Item aktif untuk satu transaksi.')
          for (const item of items.filter((candidate) => ['active', 'sold_out', 'recovery_pending'].includes(candidate.status))) {
            await moderateItem(ctx, { item, adminId: admin._id, reason: `Merchant ditangguhkan: ${reason}` })
            affectedListings += 1
          }
        }
      }
    } else if (target.role === 'processor') {
      const processor = await ctx.db.query('processors').withIndex('by_owner', (index) => index.eq('ownerId', target._id)).unique()
      if (processor) {
        await ctx.db.patch(processor._id, { verificationStatus: args.suspend ? 'suspended' : 'pending', rejectionReason: args.suspend ? reason : undefined })
        if (args.suspend) {
          const offered = await ctx.db.query('recoveryBatches').withIndex('by_processor_status', (index) => index.eq('processorId', processor._id).eq('status', 'offered')).take(200)
          for (const batch of offered) await ctx.db.patch(batch._id, { status: 'pending', processorId: undefined, offerExpiresAt: undefined })
          affectedBatches = offered.length
        }
      }
    }
    for (const session of sessions) await ctx.db.delete(session._id)
    await recordAdminAction(ctx, { adminId: admin._id, action: args.suspend ? 'suspend_user' : 'reinstate_user', targetTable: 'users', targetId: target._id, reason })
    await createNotification(ctx, { userId: target._id, type: args.suspend ? 'account_suspended' : 'account_reinstated', title: args.suspend ? 'Akun ditangguhkan' : 'Akun diaktifkan kembali', body: reason, href: '/pending-verification' })
    return { userId: target._id, status, sessionsRevoked: sessions.length, affectedListings, affectedBatches }
  },
})

const moderatableRow = v.object({ surplusItemId: v.id('surplusItems'), name: v.string(), merchantName: v.string(), status: v.string(), remainingQuantity: v.number(), weightPerItemGrams: v.number(), pickupEndAt: v.number() })

export const listModeratableListings = query({
  args: { sessionToken: v.optional(v.string()) }, returns: v.array(moderatableRow),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const items = (await Promise.all((['active', 'sold_out', 'recovery_pending'] as const).map((status) => ctx.db.query('surplusItems').withIndex('by_status', (index) => index.eq('status', status)).take(100)))).flat()
    return Promise.all(items.map(async (item) => ({ surplusItemId: item._id, name: item.name, merchantName: (await ctx.db.get(item.merchantId))?.name ?? 'Merchant tidak ditemukan', status: item.status, remainingQuantity: item.remainingQuantity, weightPerItemGrams: item.weightPerItemGrams, pickupEndAt: item.pickupEndAt })))
  },
})

export const moderateListing = mutation({
  args: { sessionToken: v.optional(v.string()), surplusItemId: v.id('surplusItems'), reason: v.string() },
  returns: v.object({ surplusItemId: v.id('surplusItems'), status: v.literal('moderated'), moderatedWeightGrams: v.number(), ordersRefunded: v.number(), batchesCancelled: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionToken, ['admin'])
    const reason = note(args.reason, true)!
    const item = await ctx.db.get(args.surplusItemId)
    if (!item) fail('NOT_FOUND', 'Rescue Item tidak ditemukan.')
    if (!['active', 'sold_out', 'recovery_pending'].includes(item.status)) fail('INVALID_TRANSITION', 'Rescue Item terminal atau tidak dipublikasikan tidak dapat dimoderasi.')
    const result = await moderateItem(ctx, { item, adminId: admin._id, reason })
    await recordAdminAction(ctx, { adminId: admin._id, action: 'moderate_listing', targetTable: 'surplusItems', targetId: item._id, reason })
    return { surplusItemId: item._id, status: 'moderated' as const, ...result }
  },
})

export const searchLedger = query({
  args: {
    sessionToken: v.optional(v.string()), query: v.optional(v.string()), merchantId: v.optional(v.id('merchants')),
    fromAt: v.optional(v.number()), toAt: v.optional(v.number()), paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(searchRow),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const page = args.merchantId
      ? await ctx.db.query('surplusItems').withIndex('by_merchant', (index) => index.eq('merchantId', args.merchantId!)).order('desc').paginate(args.paginationOpts)
      : await ctx.db.query('surplusItems').withIndex('by_created_at').order('desc').paginate(args.paginationOpts)
    const needle = args.query?.trim().toLocaleLowerCase('id-ID') ?? ''
    const rows = await Promise.all(page.page.map(async (item) => {
      const [merchant, allEvents] = await Promise.all([
        ctx.db.get(item.merchantId),
        ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id)).collect(),
      ])
      const events = allEvents.filter((event) => (args.fromAt === undefined || event.occurredAt >= args.fromAt)
        && (args.toAt === undefined || event.occurredAt < args.toAt))
      const haystack = `${item._id} ${item.name} ${merchant?.name ?? ''} ${events.map((event) => event.eventType).join(' ')}`.toLocaleLowerCase('id-ID')
      if ((needle && !haystack.includes(needle)) || ((args.fromAt !== undefined || args.toAt !== undefined) && events.length === 0)) return null
      return {
        surplusItemId: item._id, itemName: item.name, merchantId: item.merchantId, merchantName: merchant?.name ?? 'Merchant tidak ditemukan',
        status: item.status, eventCount: events.length, eventTypes: [...new Set(events.map((event) => event.eventType))],
        lastEventAt: events.length ? Math.max(...events.map((event) => event.occurredAt)) : null,
        balanceGrams: events.reduce((sum, event) => sum + event.weightDeltaGrams, 0),
      }
    }))
    // ponytail: bounded post-filtering keeps one native cursor and avoids denormalising merchant data into the append-only ledger.
    return { ...page, page: rows.filter((row): row is NonNullable<typeof row> => row !== null) }
  },
})

export const getItemLedger = query({
  args: { sessionToken: v.optional(v.string()), surplusItemId: v.id('surplusItems') },
  returns: v.union(v.null(), v.object({
    item: v.object({ _id: v.id('surplusItems'), name: v.string(), status: v.string(), merchantName: v.string() }),
    events: v.array(v.object({
      _id: v.id('materialFlowLedger'), eventType: v.string(), occurredAt: v.number(), actorName: v.union(v.string(), v.null()),
      actorRole: v.union(v.string(), v.null()), weightDeltaGrams: v.number(), metadata: v.union(v.record(v.string(), v.any()), v.null()),
      metadataMalformed: v.boolean(), terminal: v.boolean(), orderId: v.union(v.id('orders'), v.null()), recoveryBatchId: v.union(v.id('recoveryBatches'), v.null()),
    })),
    summary: impactSummary, issues: v.array(integrityIssue),
  })),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const item = await ctx.db.get(args.surplusItemId)
    if (!item) return null
    const [merchant, entries] = await Promise.all([
      ctx.db.get(item.merchantId),
      ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id)).collect(),
    ])
    entries.sort((left, right) => left.occurredAt - right.occurredAt || String(left._id).localeCompare(String(right._id)))
    const summary = summariseLedger(toImpactEntries(entries))
    const integrityEntries = entries.map((entry) => ({ ...toImpactEntries([entry])[0]!, orderId: entry.orderId ? String(entry.orderId) : undefined, recoveryBatchId: entry.recoveryBatchId ? String(entry.recoveryBatchId) : undefined }))
    return {
      item: { _id: item._id, name: item.name, status: item.status, merchantName: merchant?.name ?? 'Merchant tidak ditemukan' },
      events: await Promise.all(entries.map(async (entry) => {
        const parsed = safeMetadata(entry.metadata)
        const actor = entry.actorId ? await ctx.db.get(entry.actorId) : null
        return {
          _id: entry._id, eventType: entry.eventType, occurredAt: entry.occurredAt, actorName: actor?.name ?? null,
          actorRole: entry.actorRole ?? null, weightDeltaGrams: entry.weightDeltaGrams, metadata: parsed.value,
          metadataMalformed: parsed.malformed, terminal: terminalEventTypes.has(entry.eventType),
          orderId: entry.orderId ?? null, recoveryBatchId: entry.recoveryBatchId ?? null,
        }
      })),
      summary,
      issues: checkItemLedgerIntegrity(item.status, integrityEntries, summary),
    }
  },
})

const violation = v.object({
  surplusItemId: v.id('surplusItems'), itemName: v.string(), status: v.string(), merchantName: v.string(),
  expectedGrams: v.number(), observedGrams: v.number(), issues: v.array(integrityIssue),
})

export const checkWeightConservation = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.object({ checkedItems: v.number(), violations: v.array(violation) }),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const items = await terminalItems(ctx)
    const results = await Promise.all(items.map(async (item) => {
      const [merchant, entries] = await Promise.all([ctx.db.get(item.merchantId), ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id)).collect()])
      const summary = summariseLedger(toImpactEntries(entries))
      const observedGrams = summary.conservation.itemBalances[0]?.balanceGrams ?? 0
      return observedGrams === 0 ? null : { surplusItemId: item._id, itemName: item.name, status: item.status, merchantName: merchant?.name ?? 'Merchant tidak ditemukan', expectedGrams: 0, observedGrams, issues: [{ code: 'WEIGHT_NOT_CONSERVED', message: `Saldo ledger ${observedGrams.toLocaleString('id-ID')} g; seharusnya 0 g.` }] }
    }))
    return { checkedItems: items.length, violations: results.filter((result): result is NonNullable<typeof result> => result !== null) }
  },
})

export const checkLedgerCompleteness = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.object({ checkedItems: v.number(), violations: v.array(violation) }),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    const items = await terminalItems(ctx)
    const results = await Promise.all(items.map(async (item) => {
      const [merchant, entries] = await Promise.all([ctx.db.get(item.merchantId), ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', item._id)).collect()])
      const summary = summariseLedger(toImpactEntries(entries))
      const integrityEntries = entries.map((entry) => ({ ...toImpactEntries([entry])[0]!, orderId: entry.orderId ? String(entry.orderId) : undefined, recoveryBatchId: entry.recoveryBatchId ? String(entry.recoveryBatchId) : undefined }))
      const issues = checkItemLedgerIntegrity(item.status, integrityEntries, summary).filter((issue) => issue.code !== 'WEIGHT_NOT_CONSERVED')
      return issues.length === 0 ? null : { surplusItemId: item._id, itemName: item.name, status: item.status, merchantName: merchant?.name ?? 'Merchant tidak ditemukan', expectedGrams: 0, observedGrams: summary.conservation.itemBalances[0]?.balanceGrams ?? 0, issues }
    }))
    return { checkedItems: items.length, violations: results.filter((result): result is NonNullable<typeof result> => result !== null) }
  },
})
