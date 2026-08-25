import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
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
  returns: v.object({ userId: v.id('users'), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (query) => query.eq('email', args.email))
      .unique()

    if (existing) {
      throw new ConvexError({
        code: 'EMAIL_ALREADY_REGISTERED',
        field: 'email',
        message: 'Email ini sudah terdaftar.',
      })
    }

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

    const sessionId = await ctx.db.insert('sessions', {
      userId,
      tokenHash: args.tokenHash,
      expiresAt,
      createdAt,
    })
    await ctx.scheduler.runAt(expiresAt, internal.authInternal.expireSession, {
      sessionId,
      tokenHash: args.tokenHash,
    })
    await ctx.db.insert('authEvents', {
      userId,
      email: args.email,
      type: 'REGISTER',
      success: true,
      occurredAt: createdAt,
    })

    return { userId, expiresAt }
  },
})

export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    email: v.string(),
    tokenHash: v.string(),
  },
  returns: v.object({ expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const createdAt = Date.now()
    const expiresAt = createdAt + SESSION_TTL_MS

    const sessionId = await ctx.db.insert('sessions', {
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt,
      createdAt,
    })
    await ctx.scheduler.runAt(expiresAt, internal.authInternal.expireSession, {
      sessionId,
      tokenHash: args.tokenHash,
    })
    await ctx.db.insert('authEvents', {
      userId: args.userId,
      email: args.email,
      type: 'LOGIN_SUCCESS',
      success: true,
      occurredAt: createdAt,
    })

    return { expiresAt }
  },
})

export const expireSession = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    tokenHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, tokenHash }) => {
    const session = await ctx.db.get(sessionId)
    if (session?.tokenHash === tokenHash) await ctx.db.delete(sessionId)
    return null
  },
})
