import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireAuth } from './lib/guards'

const notificationView = v.object({
  _id: v.id('notifications'), type: v.string(), title: v.string(), body: v.string(), href: v.union(v.string(), v.null()),
  visibleAt: v.number(), readAt: v.union(v.number(), v.null()), createdAt: v.number(),
})

export const listMine = query({
  args: { sessionToken: v.optional(v.string()), now: v.number() },
  returns: v.array(notificationView),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionToken)
    if (!Number.isInteger(args.now) || args.now < 0) throw new ConvexError({ code: 'VALIDATION_FAILED', message: 'Waktu notifikasi tidak valid.' })
    const rows = await ctx.db.query('notifications')
      .withIndex('by_user_and_visible_at', (index) => index.eq('userId', user._id).lte('visibleAt', args.now))
      .order('desc').take(100)
    return rows.map((row) => ({ _id: row._id, type: row.type, title: row.title, body: row.body, href: row.href ?? null, visibleAt: row.visibleAt, readAt: row.readAt ?? null, createdAt: row.createdAt }))
  },
})

export const markRead = mutation({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id('notifications') },
  returns: v.object({ readAt: v.number() }),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionToken)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification || notification.userId !== user._id) throw new ConvexError({ code: 'NOT_FOUND', message: 'Notifikasi tidak ditemukan.' })
    const readAt = notification.readAt ?? Date.now()
    if (!notification.readAt) await ctx.db.patch(notification._id, { readAt })
    return { readAt }
  },
})
