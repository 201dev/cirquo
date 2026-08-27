import { v, ConvexError } from 'convex/values'
import { internalQuery, internalMutation, mutation } from './_generated/server'
import { requireRole } from './lib/guards'
import { recordLedgerEvent } from './lib/ledger'
import { internal } from './_generated/api'

const PAYMENT_HOLD_MS = 15 * 60 * 1000

function generatePickupCode() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return (value[0] % 1_000_000).toString().padStart(6, '0')
}

export const listByUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => ctx.db
    .query('orders')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect(),
})

export const reserve = mutation({
  args: {
    surplusItemId: v.id('surplusItems'),
    quantity: v.number(),
    idempotencyKey: v.optional(v.string()),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['consumer'])
    const now = Date.now()
    
    if (args.quantity <= 0 || !Number.isInteger(args.quantity)) {
      throw new ConvexError('Kuantitas tidak valid')
    }

    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query('orders')
        .withIndex('by_user_idempotency_key', (q) =>
          q.eq('userId', user._id).eq('idempotencyKey', args.idempotencyKey),
        )
        .unique()
      if (existing) {
        if (
          existing.surplusItemId !== args.surplusItemId ||
          existing.quantity !== args.quantity
        ) {
          throw new ConvexError('IDEMPOTENCY_CONFLICT')
        }
        return existing._id
      }
    }

    const openOrders = await Promise.all(
      (['reserved', 'paid'] as const).map((status) =>
        ctx.db
          .query('orders')
          .withIndex('by_user_item_status', (q) =>
            q
              .eq('userId', user._id)
              .eq('surplusItemId', args.surplusItemId)
              .eq('status', status),
          )
          .first(),
      ),
    )
    if (openOrders.some(Boolean)) throw new ConvexError('ALREADY_RESERVED')

    const item = await ctx.db.get(args.surplusItemId)
    if (!item) throw new ConvexError('NOT_FOUND')
    if (item.status !== 'active') throw new ConvexError('Item tidak tersedia')
    if (item.processingOnly) throw new ConvexError('Item tidak tersedia untuk dibeli')
    if (item.remainingQuantity < args.quantity) throw new ConvexError('Kuantitas tidak mencukupi')
    if (item.pickupEndAt <= now) throw new ConvexError('Waktu pickup sudah habis')

    const merchant = await ctx.db.get(item.merchantId)
    if (!merchant || merchant.verificationStatus !== 'verified') {
      throw new ConvexError('Merchant tidak terverifikasi')
    }

    const totalPrice = item.currentPrice * args.quantity
    const rescuedWeightGrams = item.weightPerItemGrams * args.quantity
    
    const remainingQuantity = item.remainingQuantity - args.quantity
    const paymentHoldExpiresAt = now + PAYMENT_HOLD_MS
    const pickupCode = generatePickupCode()

    await ctx.db.patch(item._id, {
      remainingQuantity,
      status: remainingQuantity === 0 ? 'sold_out' : 'active',
    })

    const orderId = await ctx.db.insert('orders', {
      userId: user._id,
      surplusItemId: item._id,
      quantity: args.quantity,
      totalPrice,
      rescuedWeightGrams,
      pickupCode,
      status: 'reserved',
      paymentHoldExpiresAt,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    })

    await recordLedgerEvent(ctx, {
      surplusItemId: item._id,
      orderId,
      eventType: 'RESERVED',
      weightDeltaGrams: 0,
      actorId: user._id,
      actorRole: 'consumer',
    })

    await ctx.scheduler.runAt(paymentHoldExpiresAt, internal.orders.expireHold, { orderId })

    return orderId
  }
})

export const expireHold = internalMutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return
    if (order.status !== 'reserved') return
    const paymentHoldExpiresAt = order.paymentHoldExpiresAt ?? order.createdAt + PAYMENT_HOLD_MS
    if (paymentHoldExpiresAt > Date.now()) return

    const item = await ctx.db.get(order.surplusItemId)
    if (!item) return

    await ctx.db.patch(order._id, {
      status: 'expired'
    })

    await ctx.db.patch(item._id, {
      remainingQuantity: item.remainingQuantity + order.quantity,
      status: 'active',
    })

    await recordLedgerEvent(ctx, {
      surplusItemId: item._id,
      orderId: order._id,
      eventType: 'CANCELLED',
      weightDeltaGrams: 0,
      metadata: { reason: 'PAYMENT_HOLD_EXPIRED' },
    })
  }
})

import { query } from './_generated/server'

export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['consumer'])
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect()

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const item = await ctx.db.get(order.surplusItemId)
        if (!item) return null
        
        const merchant = await ctx.db.get(item.merchantId)
        if (!merchant) return null

        return {
          _id: order._id,
          itemName: item.name,
          merchantName: merchant.name,
          totalPrice: order.totalPrice,
          status: order.status,
          quantity: order.quantity,
          pickupWindow: `${new Date(item.pickupStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.pickupEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
          image: item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
          orderedAt: new Date(order.createdAt).toISOString(),
          // Explicitly NOT returning pickupCode here
        }
      })
    )

    return enriched.filter((o): o is NonNullable<typeof o> => o !== null)
  }
})

export const get = query({
  args: { 
    orderId: v.id('orders'),
    sessionToken: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['consumer'])
    
    const order = await ctx.db.get(args.orderId)
    if (!order) return null
    if (order.userId !== user._id) return null

    const item = await ctx.db.get(order.surplusItemId)
    if (!item) return null

    const merchant = await ctx.db.get(item.merchantId)
    if (!merchant) return null

    return {
      _id: order._id,
      itemName: item.name,
      merchantName: merchant.name,
      merchantAddress: merchant.address,
      totalPrice: order.totalPrice,
      status: order.status,
      quantity: order.quantity,
      rescuedWeightGrams: order.rescuedWeightGrams,
      pickupWindow: `${new Date(item.pickupStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.pickupEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      pickupDate: new Date(item.pickupStartAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      image: item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
      orderedAt: new Date(order.createdAt).toISOString(),
      createdAt: order.createdAt,
      // Only reveal pickupCode if paid
      pickupCode: order.status === 'paid' ? order.pickupCode : undefined,
    }
  }
})
