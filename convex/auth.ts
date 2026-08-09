import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { action, mutation, query } from './_generated/server'
import {
  normalizeEmail,
  registrationRole,
  validateRegistrationInput,
  type RegistrationRole,
} from './lib/auth'
import {
  generateSessionToken,
  hashSessionToken,
} from './lib/tokens'
import { requireAuth } from './lib/guards'

const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

type AuthResult = {
  userId: Id<'users'>
  sessionToken: string
  expiresAt: number
  role: RegistrationRole | 'admin'
  name: string
}

export const register = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: registrationRole,
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const { name, email } = validateRegistrationInput(
      args.name,
      args.email,
      args.password,
    )
    const existing: Doc<'users'> | null = await ctx.runQuery(
      internal.users.getByEmail,
      { email },
    )

    if (existing) throw new ConvexError('EMAIL_ALREADY_REGISTERED')

    const passwordHash: string = await ctx.runAction(
      internal.authNode.hashPassword,
      { password: args.password },
    )
    const sessionToken = generateSessionToken()
    const tokenHash = await hashSessionToken(sessionToken)
    const result: { userId: Id<'users'>; expiresAt: number } =
      await ctx.runMutation(internal.authInternal.createUserAndSession, {
        name,
        email,
        passwordHash,
        role: args.role,
        tokenHash,
      })

    return {
      ...result,
      sessionToken,
      role: args.role,
      name,
    }
  },
})

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = normalizeEmail(args.email)
    const user: Doc<'users'> | null = await ctx.runQuery(
      internal.users.getByEmail,
      { email },
    )
    const valid: boolean = await ctx.runAction(
      internal.authNode.verifyPassword,
      {
        password: args.password,
        passwordHash: user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      },
    )

    if (!user || !valid) throw new ConvexError('INVALID_CREDENTIALS')
    if (user.status === 'suspended') {
      throw new ConvexError('ACCOUNT_SUSPENDED')
    }

    const sessionToken = generateSessionToken()
    const tokenHash = await hashSessionToken(sessionToken)
    const result: { expiresAt: number } = await ctx.runMutation(
      internal.authInternal.createSession,
      { userId: user._id, tokenHash },
    )

    return {
      userId: user._id,
      sessionToken,
      expiresAt: result.expiresAt,
      role: user.role,
      name: user.name,
    }
  },
})

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const tokenHash = await hashSessionToken(sessionToken)
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
      .unique()

    if (session) await ctx.db.delete(session._id)

    return { success: true }
  },
})

export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireAuth(ctx, sessionToken)
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  },
})
