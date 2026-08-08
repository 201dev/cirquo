import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

export const getByOwner = internalQuery({
  args: { ownerId: v.id('users') },
  handler: async (ctx, { ownerId }) => ctx.db
    .query('merchants')
    .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
    .collect(),
})
