import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

export const listByUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => ctx.db
    .query('orders')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect(),
})
