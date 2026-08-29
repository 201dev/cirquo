import { v, ConvexError } from 'convex/values'
import { internalQuery, internalMutation, mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { requireRole, requireVerifiedMerchant } from './lib/guards'
import { recordLedgerEvent } from './lib/ledger'
import { internal } from './_generated/api'

const PAYMENT_HOLD_MS = 15 * 60 * 1000
const PICKUP_CODE_PATTERN = /^\d{6}$/

function generatePickupCode() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return (value[0] % 1_000_000).toString().padStart(6, '0')
}

function failPickup(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

async function getPickupContext(ctx: MutationCtx, orderId: Id<'orders'>) {
  const order = await ctx.db.get(orderId)
  if (!order) failPickup('NOT_FOUND', 'Pesanan tidak ditemukan.')

  const item = await ctx.db.get(order.surplusItemId)
  if (!item) failPickup('NOT_FOUND', 'Rescue Item tidak ditemukan.')

  return { order, item }
}

async function completePickup(
  ctx: MutationCtx,
  args: {
    orderId: Id<'orders'>
    pickupCode: string
    actorId: Id<'users'>
    actorRole: 'merchant' | 'admin'
    bypassPickupWindow?: boolean
    overrideReason?: string
  },
) {
  const { order, item } = await getPickupContext(ctx, args.orderId)
  if (order.status !== 'paid') {
    failPickup('INVALID_TRANSITION', 'Hanya pesanan yang sudah dibayar dapat dikonfirmasi.')
  }
  if (!PICKUP_CODE_PATTERN.test(args.pickupCode) || args.pickupCode !== order.pickupCode) {
    failPickup('INVALID_PICKUP_CODE', 'Kode pickup tidak cocok.')
  }

  const now = Date.now()
  if (!args.bypassPickupWindow && (now < item.pickupStartAt || now > item.pickupEndAt)) {
    failPickup('PICKUP_WINDOW_CLOSED', 'Pickup harus dikonfirmasi di dalam waktu pickup.')
  }

  const hasOpenSibling = item.remainingQuantity === 0 && (
    await ctx.db
      .query('orders')
      .withIndex('by_item', (q) => q.eq('surplusItemId', item._id))
      .collect()
  ).some(
    (sibling) =>
      sibling._id !== order._id &&
      (sibling.status === 'reserved' || sibling.status === 'paid'),
  )

  await ctx.db.patch(order._id, { status: 'picked_up', pickedUpAt: now })
  const ledgerEventId = await recordLedgerEvent(ctx, {
    surplusItemId: item._id,
    orderId: order._id,
    eventType: 'RESCUED',
    weightDeltaGrams: -order.rescuedWeightGrams,
    actorId: args.actorId,
    actorRole: args.actorRole,
    metadata: {
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      adminOverride: Boolean(args.overrideReason),
      ...(args.overrideReason ? { overrideReason: args.overrideReason } : {}),
    },
  })

  if (item.remainingQuantity === 0 && !hasOpenSibling && item.status !== 'closed') {
    await ctx.db.patch(item._id, { status: 'closed' })
  }

  return {
    orderId: order._id,
    pickedUpAt: now,
    rescuedWeightGrams: order.rescuedWeightGrams,
    ledgerEventId,
  }
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
    // M4 only moves items to recovery after all reserved holds were released.
    // Keep a stale M3 timer from reviving an already-recovered item.
    if (item.status === 'recovery_pending') return

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
        const payment = order.status === 'expired'
          ? await ctx.db
            .query('payments')
            .withIndex('by_order', (q) => q.eq('orderId', order._id))
            .first()
          : null

        // Timestamps stay raw epoch ms UTC; WIB is applied by the client at
        // render time. Formatting here would use the UTC server clock.
        return {
          _id: order._id,
          itemName: item.name,
          merchantName: merchant.name,
          totalPrice: order.totalPrice,
          status: order.status,
          quantity: order.quantity,
          rescuedWeightGrams: order.rescuedWeightGrams,
          materialType: item.materialType,
          imageUrl: item.imageUrl,
          pickupStartAt: item.pickupStartAt,
          pickupEndAt: item.pickupEndAt,
          paymentHoldExpiresAt: order.paymentHoldExpiresAt,
          createdAt: order.createdAt,
          pickedUpAt: order.pickedUpAt,
          refundStatus: payment?.refundStatus,
          // Explicitly NOT returning pickupCode here
        }
      })
    )

    return enriched.filter((o): o is NonNullable<typeof o> => o !== null)
  }
})

export const listForMerchant = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    const items = await ctx.db
      .query('surplusItems')
      .withIndex('by_merchant', (q) => q.eq('merchantId', merchant._id))
      .collect()

    // ponytail: one indexed lookup per Rescue Item keeps the M4 counter queue simple.
    // Add an order.merchantId snapshot plus by_merchant_status before pagination is needed.
    return (await Promise.all(items.map(async (item) => {
      const paidOrders = await ctx.db
        .query('orders')
        .withIndex('by_item_status', (q) =>
          q.eq('surplusItemId', item._id).eq('status', 'paid'),
        )
        .collect()

      return Promise.all(paidOrders.map(async (order) => {
        const consumer = await ctx.db.get(order.userId)
        return {
          _id: order._id,
          consumerName: consumer?.name ?? 'Konsumen',
          itemName: item.name,
          quantity: order.quantity,
          totalPrice: order.totalPrice,
          rescuedWeightGrams: order.rescuedWeightGrams,
          pickupStartAt: item.pickupStartAt,
          pickupEndAt: item.pickupEndAt,
          createdAt: order.createdAt,
          // pickupCode is intentionally never projected to Merchant clients.
        }
      }))
    }))).flat()
  },
})

export const confirmPickup = mutation({
  args: {
    orderId: v.id('orders'),
    pickupCode: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const merchant = await requireVerifiedMerchant(ctx, user)
    const { item } = await getPickupContext(ctx, args.orderId)
    if (item.merchantId !== merchant._id) {
      failPickup('FORBIDDEN', 'Pesanan ini bukan milik Merchant Anda.')
    }

    return completePickup(ctx, {
      orderId: args.orderId,
      pickupCode: args.pickupCode,
      actorId: user._id,
      actorRole: 'merchant',
    })
  },
})

export const adminOverridePickup = mutation({
  args: {
    orderId: v.id('orders'),
    pickupCode: v.string(),
    reason: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['admin'])
    const reason = args.reason.trim()
    if (reason.length < 2 || reason.length > 500) {
      failPickup('VALIDATION_FAILED', 'Alasan override harus 2-500 karakter.')
    }

    return completePickup(ctx, {
      orderId: args.orderId,
      pickupCode: args.pickupCode,
      actorId: user._id,
      actorRole: 'admin',
      bypassPickupWindow: true,
      overrideReason: reason,
    })
  },
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
    const payment = order.status === 'expired'
      ? await ctx.db
        .query('payments')
        .withIndex('by_order', (q) => q.eq('orderId', order._id))
        .first()
      : null

    return {
      _id: order._id,
      itemName: item.name,
      merchantName: merchant.name,
      merchantAddress: merchant.address,
      totalPrice: order.totalPrice,
      status: order.status,
      quantity: order.quantity,
      rescuedWeightGrams: order.rescuedWeightGrams,
      materialType: item.materialType,
      imageUrl: item.imageUrl,
      pickupStartAt: item.pickupStartAt,
      pickupEndAt: item.pickupEndAt,
      paymentHoldExpiresAt: order.paymentHoldExpiresAt,
      createdAt: order.createdAt,
      pickedUpAt: order.pickedUpAt,
      refundStatus: payment?.refundStatus,
      // Only reveal pickupCode if paid
      pickupCode: order.status === 'paid' ? order.pickupCode : undefined,
    }
  }
})
