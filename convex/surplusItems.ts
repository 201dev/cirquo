import { internalQuery, mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { rescueItemStatus, materialType } from './schema'
import { requireVerifiedMerchant, requireOwnership, requireRole } from './lib/guards'
import { recordLedgerEvent } from './lib/ledger'

export const listByStatus = internalQuery({
  args: { status: rescueItemStatus },
  handler: async (ctx, { status }) => ctx.db
    .query('surplusItems')
    .withIndex('by_status', (q) => q.eq('status', status))
    .collect(),
})

const surplusItemInputArgs = {
  name: v.string(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  originalPrice: v.number(),
  floorPrice: v.number(),
  currentPrice: v.number(),
  initialQuantity: v.number(),
  weightPerItemGrams: v.number(),
  pickupStartAt: v.number(),
  pickupEndAt: v.number(),
  materialType: materialType,
  dietaryTags: v.array(v.string()),
  sessionToken: v.optional(v.string()),
}

type SurplusItemFields = {
  name: string
  description?: string
  originalPrice: number
  floorPrice: number
  currentPrice: number
  initialQuantity: number
  weightPerItemGrams: number
  pickupStartAt: number
  pickupEndAt: number
}

function validateItemFields(args: SurplusItemFields) {
  if (args.name.length < 2 || args.name.length > 120) throw new ConvexError('Nama harus 2-120 karakter')
  if (args.description && args.description.length > 500) throw new ConvexError('Deskripsi maksimal 500 karakter')
  if (args.originalPrice <= 0 || !Number.isInteger(args.originalPrice)) throw new ConvexError('Harga awal tidak valid')
  if (args.floorPrice <= 0 || !Number.isInteger(args.floorPrice)) throw new ConvexError('Floor price tidak valid')
  if (args.currentPrice <= 0 || !Number.isInteger(args.currentPrice)) throw new ConvexError('Harga saat ini tidak valid')
  if (!(args.floorPrice <= args.currentPrice && args.currentPrice < args.originalPrice)) throw new ConvexError('Harga tidak memenuhi batasan')
  if (args.initialQuantity < 1 || args.initialQuantity > 999 || !Number.isInteger(args.initialQuantity)) throw new ConvexError('Jumlah tidak valid')
  if (args.weightPerItemGrams < 1 || args.weightPerItemGrams > 50000 || !Number.isInteger(args.weightPerItemGrams)) throw new ConvexError('Berat tidak valid')
  if (args.pickupEndAt <= args.pickupStartAt) throw new ConvexError('Waktu selesai harus setelah waktu mulai')
  if (args.pickupEndAt - args.pickupStartAt > 72 * 60 * 60 * 1000) throw new ConvexError('Waktu pickup maksimal 72 jam')
  if (args.pickupStartAt < Date.now() - 5 * 60 * 1000) throw new ConvexError('Waktu pickup tidak boleh di masa lalu')
}

export const create = mutation({
  args: surplusItemInputArgs,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    validateItemFields(args)

    return ctx.db.insert('surplusItems', {
      merchantId: merchant._id,
      name: args.name,
      description: args.description,
      imageUrl: args.imageUrl,
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
      processingOnly: false,
      status: 'draft',
      createdAt: Date.now(),
    })
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
      status: 'active',
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
  }
})

export const update = mutation({
  args: { id: v.id('surplusItems'), ...surplusItemInputArgs },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    
    const item = await ctx.db.get(args.id)
    if (!item) throw new ConvexError('NOT_FOUND')
    requireOwnership(user, merchant.ownerId, item)
    if (item.merchantId !== merchant._id) throw new ConvexError('FORBIDDEN')
    if (item.status !== 'draft' && item.status !== 'active') throw new ConvexError('Hanya draft dan active yang dapat diubah')
    if (item.remainingQuantity !== item.initialQuantity) throw new ConvexError('ALREADY_RESERVED')
    
    // Validasi field sesuai aturan
    validateItemFields(args)

    if (item.status === 'active') {
      if (args.floorPrice > item.floorPrice) throw new ConvexError('Floor price hanya boleh diturunkan')
      if (args.pickupStartAt !== item.pickupStartAt || args.pickupEndAt < item.pickupEndAt) {
        throw new ConvexError('Waktu pickup hanya boleh diperpanjang (end diperpanjang, start tidak berubah)')
      }
      if (args.initialQuantity !== item.initialQuantity) throw new ConvexError('Jumlah tidak boleh diubah jika sudah aktif')
      if (args.weightPerItemGrams !== item.weightPerItemGrams) throw new ConvexError('Berat tidak boleh diubah jika sudah aktif')
      if (args.materialType !== item.materialType) throw new ConvexError('Tipe material tidak boleh diubah jika sudah aktif')
    }

    const priceChanged = item.status === 'active' && args.currentPrice !== item.currentPrice

    await ctx.db.patch(item._id, {
      name: args.name,
      description: args.description,
      imageUrl: args.imageUrl,
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
          newPrice: args.currentPrice,
          floorPrice: args.floorPrice,
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
    if (item.remainingQuantity !== item.initialQuantity) throw new ConvexError('ALREADY_RESERVED')
    if (item.status === 'closed') throw new ConvexError('Sudah dibatalkan')

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
      processingOnly: item.processingOnly,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      imageUrl: item.imageUrl,
      weightPerItemGrams: item.weightPerItemGrams,
    }))
  }
})
