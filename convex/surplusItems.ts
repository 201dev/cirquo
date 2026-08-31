import { internalMutation, mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { materialType } from './schema'
import { requireVerifiedMerchant, requireOwnership, requireRole } from './lib/guards'
import { recordLedgerEvent } from './lib/ledger'
import { createNotification } from './lib/notifications'
import { queueSandboxRefund } from './lib/refunds'
import { internal } from './_generated/api'
import { createRecoveryBatchForItem } from './recoveryBatches'
import { calculateHaversineDistanceMeters } from '../src/lib/geo'

const surplusItemInputArgs = {
  name: v.string(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id('_storage')),
  originalPrice: v.number(),
  floorPrice: v.number(),
  currentPrice: v.number(),
  initialQuantity: v.number(),
  weightPerItemGrams: v.number(),
  pickupStartAt: v.number(),
  pickupEndAt: v.number(),
  materialType: materialType,
  dietaryTags: v.array(v.string()),
  processingOnly: v.optional(v.boolean()),
  sessionToken: v.optional(v.string()),
}

type SurplusItemFields = Pick<
  Doc<'surplusItems'>,
  | 'name'
  | 'description'
  | 'imageUrl'
  | 'originalPrice'
  | 'floorPrice'
  | 'currentPrice'
  | 'initialQuantity'
  | 'weightPerItemGrams'
  | 'pickupStartAt'
  | 'pickupEndAt'
  | 'materialType'
  | 'dietaryTags'
  | 'processingOnly'
>

type SurplusItemField = keyof SurplusItemFields

type PickupExpiryResult = {
  batchesCreated: number
  deferredHolds: number
  noShowsExpired: number
}

async function executePickupWindowExpiry(ctx: MutationCtx): Promise<PickupExpiryResult> {
  const now = Date.now()
  const items = (
    await Promise.all(
      (['active', 'sold_out'] as const).map((status) =>
        ctx.db
          .query('surplusItems')
          .withIndex('by_status_pickup_end', (q) =>
            q.eq('status', status).lt('pickupEndAt', now),
          )
          .take(100),
      ),
    )
  ).flat()
  let batchesCreated = 0
  let deferredHolds = 0
  let noShowsExpired = 0

  for (const item of items) {
    const existingBatch = await ctx.db
      .query('recoveryBatches')
      .withIndex('by_item', (q) => q.eq('surplusItemId', item._id))
      .first()
    if (existingBatch) continue

    const reservedOrder = await ctx.db
      .query('orders')
      .withIndex('by_item_status', (q) =>
        q.eq('surplusItemId', item._id).eq('status', 'reserved'),
      )
      .first()
    // M3 owns reserved -> expired and the matching stock release.
    if (reservedOrder) {
      deferredHolds += 1
      continue
    }

    const paidOrders = await ctx.db
      .query('orders')
      .withIndex('by_item_status', (q) =>
        q.eq('surplusItemId', item._id).eq('status', 'paid'),
      )
      .collect()
    const noShowWeightGrams = paidOrders.reduce(
      (total, order) => total + order.rescuedWeightGrams,
      0,
    )
    const unclaimedWeightGrams =
      item.remainingQuantity * item.weightPerItemGrams + noShowWeightGrams
    if (unclaimedWeightGrams <= 0) continue

    const recoveryBatchId = await ctx.db.insert('recoveryBatches', {
      merchantId: item.merchantId,
      surplusItemId: item._id,
      offeredWeightGrams: unclaimedWeightGrams,
      status: 'pending',
      routingAttempts: 0,
      attemptedProcessorIds: [],
      declinedByProcessorIds: [],
      createdAt: now,
    })
    await ctx.db.patch(item._id, { status: 'recovery_pending' })

    for (const order of paidOrders) {
      await ctx.db.patch(order._id, { status: 'expired' })
      await recordLedgerEvent(ctx, {
        surplusItemId: item._id,
        orderId: order._id,
        eventType: 'CANCELLED',
        weightDeltaGrams: 0,
        metadata: { reason: 'PICKUP_WINDOW_EXPIRED', refundRequired: true },
      })
      await queueSandboxRefund(ctx, order, 'pickup-expiry', now)
      await createNotification(ctx, {
        userId: order.userId, type: 'pickup_expired', title: 'Waktu pickup berakhir',
        body: `${item.name} tidak diambil dan refund Sandbox sedang diproses.`, href: `/orders/${order._id}`,
      })
      noShowsExpired += 1
    }

    await recordLedgerEvent(ctx, {
      surplusItemId: item._id,
      recoveryBatchId,
      eventType: 'EXPIRED',
      weightDeltaGrams: -unclaimedWeightGrams,
      metadata: {
        remainingQuantity: item.remainingQuantity,
        noShowWeightGrams,
        reason: 'PICKUP_WINDOW_EXPIRED',
      },
    })
    const merchant = await ctx.db.get(item.merchantId)
    if (merchant) await createNotification(ctx, {
      userId: merchant.ownerId, type: 'item_expired', title: 'Rescue Item masuk Circular Routing',
      body: `${item.name} melewati waktu pickup dengan ${unclaimedWeightGrams.toLocaleString('id-ID')} g material belum terselesaikan.`,
      href: `/merchant/surplus/${item._id}`,
    })
    batchesCreated += 1
  }

  return { batchesCreated, deferredHolds, noShowsExpired }
}

export const expirePickupWindows = internalMutation({
  args: {},
  handler: (ctx) => executePickupWindowExpiry(ctx),
})

export const triggerPickupWindowExpiry = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionToken, ['admin'])
    return executePickupWindowExpiry(ctx)
  },
})

function failValidation(field: SurplusItemField, message: string): never {
  throw new ConvexError({ code: 'VALIDATION_FAILED', field, message })
}

const surplusItemUpdateArgs = {
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  originalPrice: v.optional(v.number()),
  floorPrice: v.optional(v.number()),
  currentPrice: v.optional(v.number()),
  initialQuantity: v.optional(v.number()),
  weightPerItemGrams: v.optional(v.number()),
  pickupStartAt: v.optional(v.number()),
  pickupEndAt: v.optional(v.number()),
  materialType: v.optional(materialType),
  dietaryTags: v.optional(v.array(v.string())),
  processingOnly: v.optional(v.boolean()),
}

function validateItemFields(args: SurplusItemFields) {
  if (args.name.length < 2 || args.name.length > 120) failValidation('name', 'Nama harus 2-120 karakter')
  if (args.description && args.description.length > 500) failValidation('description', 'Deskripsi maksimal 500 karakter')
  if (args.originalPrice <= 0 || !Number.isInteger(args.originalPrice)) failValidation('originalPrice', 'Harga awal tidak valid')
  if (args.floorPrice <= 0 || !Number.isInteger(args.floorPrice)) failValidation('floorPrice', 'Floor price tidak valid')
  if (args.currentPrice <= 0 || !Number.isInteger(args.currentPrice)) failValidation('currentPrice', 'Harga saat ini tidak valid')
  if (args.floorPrice > args.currentPrice) throw new ConvexError({ code: 'PRICE_BELOW_FLOOR', field: 'currentPrice', message: 'Harga rescue tidak boleh di bawah floor price' })
  if (args.currentPrice >= args.originalPrice) throw new ConvexError({ code: 'PRICE_ABOVE_ORIGINAL', field: 'currentPrice', message: 'Harga rescue harus lebih rendah dari harga awal' })
  if (args.floorPrice >= args.originalPrice) failValidation('floorPrice', 'Floor price harus lebih rendah dari harga awal')
  if (args.initialQuantity < 1 || args.initialQuantity > 999 || !Number.isInteger(args.initialQuantity)) failValidation('initialQuantity', 'Jumlah tidak valid')
  if (args.weightPerItemGrams < 1 || args.weightPerItemGrams > 50000 || !Number.isInteger(args.weightPerItemGrams)) failValidation('weightPerItemGrams', 'Berat tidak valid')
  if (args.pickupEndAt <= args.pickupStartAt) failValidation('pickupEndAt', 'Waktu selesai harus setelah waktu mulai')
  if (args.pickupEndAt - args.pickupStartAt > 72 * 60 * 60 * 1000) failValidation('pickupEndAt', 'Waktu pickup maksimal 72 jam')
  if (args.pickupStartAt < Date.now() - 5 * 60 * 1000) failValidation('pickupStartAt', 'Waktu pickup tidak boleh di masa lalu')
}

export const create = mutation({
  args: surplusItemInputArgs,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    validateItemFields({ ...args, processingOnly: args.processingOnly ?? false })

    return ctx.db.insert('surplusItems', {
      merchantId: merchant._id,
      city: merchant.city,
      name: args.name,
      description: args.description,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      originalPrice: args.originalPrice,
      floorPrice: args.floorPrice,
      currentPrice: args.currentPrice,
      initialQuantity: args.initialQuantity,
      remainingQuantity: args.initialQuantity,
      weightPerItemGrams: args.weightPerItemGrams,
      pickupStartAt: args.pickupStartAt,
      pickupEndAt: args.pickupEndAt,
      materialType: args.materialType,
      dietaryTags: args.dietaryTags,
      processingOnly: args.processingOnly ?? false,
      status: 'draft',
      createdAt: Date.now(),
    })
  },
})

export const generateImageUploadUrl = mutation({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    await requireVerifiedMerchant(ctx, user)
    return ctx.storage.generateUploadUrl()
  },
})

export const publish = mutation({
  args: { id: v.id('surplusItems'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    
    const item = await ctx.db.get(args.id)
    if (!item) throw new ConvexError('NOT_FOUND')
    requireOwnership(user, merchant.ownerId, item)
    if (item.merchantId !== merchant._id) throw new ConvexError('FORBIDDEN')
    if (item.status !== 'draft') throw new ConvexError('Hanya draft yang dapat di-publish')

    const publishedAt = Date.now()
    await ctx.db.patch(item._id, {
      status: item.processingOnly ? 'recovery_pending' : 'active',
      publishedAt,
    })

    await recordLedgerEvent(ctx, {
      surplusItemId: item._id,
      eventType: 'LISTED',
      weightDeltaGrams: item.initialQuantity * item.weightPerItemGrams,
      actorId: user._id,
      actorRole: 'merchant',
      metadata: {
        originalPrice: item.originalPrice,
        currentPrice: item.currentPrice,
        floorPrice: item.floorPrice,
        materialType: item.materialType,
        initialQuantity: item.initialQuantity,
        weightPerItemGrams: item.weightPerItemGrams,
        pickupStartAt: item.pickupStartAt,
        pickupEndAt: item.pickupEndAt,
        processingOnly: item.processingOnly,
      }
    })

    if (!item.processingOnly) {
      // ponytail: consumer profiles do not yet store coordinates; notify the
      // bounded pilot audience and let discovery filtering decide relevance.
      const consumers = merchant.city && merchant.latitude !== undefined && merchant.longitude !== undefined
        ? await ctx.db.query('users').withIndex('by_role_and_status_and_city', (q) =>
            q.eq('role', 'consumer').eq('status', 'active').eq('city', merchant.city),
          ).take(500)
        : []
      for (const consumer of consumers) {
        if (consumer.latitude === undefined || consumer.longitude === undefined) continue
        const distanceMeters = calculateHaversineDistanceMeters(consumer.latitude, consumer.longitude, merchant.latitude!, merchant.longitude!)
        if (distanceMeters > (consumer.notificationRadiusMeters ?? 5_000)) continue
        await createNotification(ctx, {
          userId: consumer._id,
          type: 'nearby_rescue_item',
          title: 'Rescue Item baru di sekitar Anda',
          body: `${item.name} tersedia ${Math.round(distanceMeters).toLocaleString('id-ID')} m dari lokasi Anda.`,
          href: `/item/${item._id}`,
        })
      }
    }

    if (item.processingOnly) {
      await createRecoveryBatchForItem(ctx, item, merchant._id)
      await ctx.scheduler.runAfter(0, internal.recoveryBatches.runRouting, {})
    }
  }
})

export const update = mutation({
  args: {
    id: v.id('surplusItems'),
    ...surplusItemUpdateArgs,
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    
    const item = await ctx.db.get(args.id)
    if (!item) throw new ConvexError('NOT_FOUND')
    requireOwnership(user, merchant.ownerId, item)
    if (item.merchantId !== merchant._id) throw new ConvexError('FORBIDDEN')
    if (item.status !== 'draft' && item.status !== 'active') throw new ConvexError('Hanya draft dan active yang dapat diubah')
    if (item.remainingQuantity !== item.initialQuantity) throw new ConvexError('ALREADY_RESERVED')
    
    const nextItem: SurplusItemFields = {
      name: args.name ?? item.name,
      description: args.description ?? item.description,
      imageUrl: args.imageUrl ?? item.imageUrl,
      originalPrice: args.originalPrice ?? item.originalPrice,
      floorPrice: args.floorPrice ?? item.floorPrice,
      currentPrice: args.currentPrice ?? item.currentPrice,
      initialQuantity: args.initialQuantity ?? item.initialQuantity,
      weightPerItemGrams: args.weightPerItemGrams ?? item.weightPerItemGrams,
      pickupStartAt: args.pickupStartAt ?? item.pickupStartAt,
      pickupEndAt: args.pickupEndAt ?? item.pickupEndAt,
      materialType: args.materialType ?? item.materialType,
      dietaryTags: args.dietaryTags ?? item.dietaryTags,
      processingOnly: args.processingOnly ?? item.processingOnly,
    }
    const hasChanges =
      nextItem.name !== item.name ||
      nextItem.description !== item.description ||
      nextItem.imageUrl !== item.imageUrl ||
      nextItem.originalPrice !== item.originalPrice ||
      nextItem.floorPrice !== item.floorPrice ||
      nextItem.currentPrice !== item.currentPrice ||
      nextItem.initialQuantity !== item.initialQuantity ||
      nextItem.weightPerItemGrams !== item.weightPerItemGrams ||
      nextItem.pickupStartAt !== item.pickupStartAt ||
      nextItem.pickupEndAt !== item.pickupEndAt ||
      nextItem.materialType !== item.materialType ||
      nextItem.processingOnly !== item.processingOnly ||
      nextItem.dietaryTags.length !== item.dietaryTags.length ||
      nextItem.dietaryTags.some((tag, index) => tag !== item.dietaryTags[index])
    if (!hasChanges) throw new ConvexError('EMPTY_UPDATE')

    validateItemFields(nextItem)
    if (nextItem.floorPrice > item.floorPrice) {
      throw new ConvexError('Floor price hanya boleh diturunkan')
    }

    if (item.status === 'active') {
      if (nextItem.pickupStartAt !== item.pickupStartAt || nextItem.pickupEndAt < item.pickupEndAt) {
        throw new ConvexError('Waktu pickup hanya boleh diperpanjang (end diperpanjang, start tidak berubah)')
      }
      if (nextItem.initialQuantity !== item.initialQuantity) throw new ConvexError('Jumlah tidak boleh diubah jika sudah aktif')
      if (nextItem.weightPerItemGrams !== item.weightPerItemGrams) throw new ConvexError('Berat tidak boleh diubah jika sudah aktif')
      if (nextItem.materialType !== item.materialType) throw new ConvexError('Tipe material tidak boleh diubah jika sudah aktif')
    }

    const priceChanged = item.status === 'active' && nextItem.currentPrice !== item.currentPrice

    await ctx.db.patch(item._id, {
      ...nextItem,
      remainingQuantity: nextItem.initialQuantity,
    })

    if (priceChanged) {
      await recordLedgerEvent(ctx, {
        surplusItemId: item._id,
        eventType: 'PRICE_ADJUSTED',
        weightDeltaGrams: 0,
        actorId: user._id,
        actorRole: 'merchant',
        metadata: {
          previousPrice: item.currentPrice,
          newPrice: nextItem.currentPrice,
          floorPrice: nextItem.floorPrice,
          trigger: 'merchant_edit'
        }
      })
    }
  }
})

export const cancel = mutation({
  args: { id: v.id('surplusItems'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    
    const item = await ctx.db.get(args.id)
    if (!item) throw new ConvexError('NOT_FOUND')
    requireOwnership(user, merchant.ownerId, item)
    if (item.merchantId !== merchant._id) throw new ConvexError('FORBIDDEN')
    if (item.status !== 'draft' && item.status !== 'active') {
      throw new ConvexError('Hanya draft dan active yang dapat dibatalkan')
    }
    if (item.remainingQuantity !== item.initialQuantity) throw new ConvexError('ALREADY_RESERVED')

    const wasActive = item.status === 'active'

    await ctx.db.patch(item._id, {
      status: 'closed'
    })

    if (wasActive) {
      await recordLedgerEvent(ctx, {
        surplusItemId: item._id,
        eventType: 'CANCELLED',
        weightDeltaGrams: -(item.remainingQuantity * item.weightPerItemGrams),
        actorId: user._id,
        actorRole: 'merchant',
        metadata: {
          quantity: item.remainingQuantity,
          reason: 'merchant_cancelled'
        }
      })
    }
  }
})

export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    // Allowed to read even if verification pending
    const merchant = await ctx.db
      .query('merchants')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .unique()
    
    if (!merchant) throw new ConvexError('NOT_FOUND')

    const items = await ctx.db
      .query('surplusItems')
      .withIndex('by_merchant', (q) => q.eq('merchantId', merchant._id))
      .order('desc')
      .collect()

    return items.map(item => ({
      _id: item._id,
      name: item.name,
      currentPrice: item.currentPrice,
      originalPrice: item.originalPrice,
      remainingQuantity: item.remainingQuantity,
      initialQuantity: item.initialQuantity,
      pickupStartAt: item.pickupStartAt,
      pickupEndAt: item.pickupEndAt,
      status: item.status,
      moderationReason: item.moderationReason,
      processingOnly: item.processingOnly,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
    }))
  }
})

/** Merchant-only detail with the immutable pickup total needed by the M4 status view. */
export const getMine = query({
  args: { id: v.id('surplusItems'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    const item = await ctx.db.get(args.id)
    if (!item || item.merchantId !== merchant._id) return null

    const pickedUpOrders = await ctx.db
      .query('orders')
      .withIndex('by_item_status', (q) =>
        q.eq('surplusItemId', item._id).eq('status', 'picked_up'),
      )
      .collect()

    return {
      _id: item._id,
      name: item.name,
      currentPrice: item.currentPrice,
      originalPrice: item.originalPrice,
      remainingQuantity: item.remainingQuantity,
      initialQuantity: item.initialQuantity,
      pickupStartAt: item.pickupStartAt,
      pickupEndAt: item.pickupEndAt,
      status: item.status,
      moderationReason: item.moderationReason,
      processingOnly: item.processingOnly,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      pickedUpOrderCount: pickedUpOrders.length,
      rescuedWeightGrams: pickedUpOrders.reduce(
        (total, order) => total + order.rescuedWeightGrams,
        0,
      ),
    }
  },
})
