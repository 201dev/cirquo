import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

export const getByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      passwordHash: v.string(),
      role: v.union(
        v.literal('consumer'),
        v.literal('merchant'),
        v.literal('processor'),
        v.literal('admin'),
      ),
      phone: v.optional(v.string()),
      status: v.union(v.literal('active'), v.literal('suspended')),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { email }) => ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique(),
})
