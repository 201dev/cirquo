import { ConvexError, v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { registrationRole } from './lib/auth'
import { SESSION_TTL_MS } from './lib/tokens'

export const createUserAndSession = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: registrationRole,
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (query) => query.eq('email', args.email))
      .unique()

    if (existing) throw new ConvexError('EMAIL_ALREADY_REGISTERED')

    const createdAt = Date.now()
    const expiresAt = createdAt + SESSION_TTL_MS
    const userId = await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: args.role,
      status: 'active',
      createdAt,
    })

    await ctx.db.insert('sessions', {
      userId,
      tokenHash: args.tokenHash,
      expiresAt,
      createdAt,
    })

    return { userId, expiresAt }
  },
})

export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now()
    const expiresAt = createdAt + SESSION_TTL_MS

    await ctx.db.insert('sessions', {
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt,
      createdAt,
    })

    return { expiresAt }
  },
})
