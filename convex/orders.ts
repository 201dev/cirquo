import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireAuth } from './lib/guards'

export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireAuth(ctx, sessionToken)
    return ctx.db
      .query('orders')
      .withIndex('by_user', (index) => index.eq('userId', user._id))
      .order('desc')
      .take(100)
  },
})
