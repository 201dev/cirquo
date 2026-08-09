import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireOwnership, requireRole } from './lib/guards'

export const getByOwner = query({
  args: {
    sessionToken: v.optional(v.string()),
    ownerId: v.id('users'),
  },
  handler: async (ctx, { sessionToken, ownerId }) => {
    const user = await requireRole(ctx, sessionToken, ['merchant', 'admin'])
    const merchant = await ctx.db
      .query('merchants')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .unique()

    return user.role === 'admin'
      ? merchant
      : requireOwnership(user, ownerId, merchant)
  },
})
