import { internalQuery, mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import type { Doc } from './_generated/dataModel'
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
>

type SurplusItemField = keyof SurplusItemFields

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
      processingOnly: item.processingOnly,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
    }))
  }
})
