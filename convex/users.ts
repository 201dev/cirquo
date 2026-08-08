import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique(),
})
