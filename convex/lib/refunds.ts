import type { Doc } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import type { MutationCtx } from '../_generated/server'

export async function queueSandboxRefund(
  ctx: MutationCtx,
  order: Doc<'orders'>,
  reason: string,
  now = Date.now(),
) {
  const payment = await ctx.db.query('payments').withIndex('by_order', (q) => q.eq('orderId', order._id)).first()
  if (payment?.refundStatus) return false
  const refundKey = `${reason}-${order._id}`
  if (payment) {
    await ctx.db.patch(payment._id, { refundStatus: 'pending', refundKey, refundRequestedAt: now, updatedAt: now })
  } else {
    await ctx.db.insert('payments', {
      orderId: order._id, provider: 'midtrans', amount: order.totalPrice, providerStatus: 'settlement',
      refundStatus: 'pending', refundKey, refundRequestedAt: now, createdAt: now, updatedAt: now,
    })
  }
  await ctx.scheduler.runAfter(0, internal.payments.requestSandboxRefund, { orderId: order._id })
  return true
}
