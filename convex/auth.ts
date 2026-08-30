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
import { resolveAuth } from './lib/guards'
import {
  generateSessionToken,
  hashSessionToken,
} from './lib/tokens'

const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

const authResultValidator = v.object({
  userId: v.id('users'),
  sessionToken: v.string(),
  expiresAt: v.number(),
  role: v.union(registrationRole, v.literal('admin')),
  name: v.string(),
})

type AuthResult = {
  userId: Id<'users'>
  sessionToken: string
  expiresAt: number
  role: RegistrationRole | 'admin'
  name: string
}

const profileSummaryValidator = v.union(
  v.object({
    id: v.id('merchants'),
    type: v.literal('merchant'),
    name: v.string(),
    verificationStatus: v.union(
      v.literal('pending'),
      v.literal('verified'),
      v.literal('rejected'),
      v.literal('suspended'),
    ),
    rejectionReason: v.optional(v.string()),
  }),
  v.object({
    id: v.id('processors'),
    type: v.literal('processor'),
    name: v.string(),
    verificationStatus: v.union(
      v.literal('pending'),
      v.literal('verified'),
      v.literal('rejected'),
      v.literal('suspended'),
    ),
    rejectionReason: v.optional(v.string()),
  }),
  v.null(),
)

type ProfileSummary =
  | {
      id: Id<'merchants'>
      type: 'merchant'
      name: string
      verificationStatus: Doc<'merchants'>['verificationStatus']
      rejectionReason?: string
    }
  | {
      id: Id<'processors'>
      type: 'processor'
      name: string
      verificationStatus: Doc<'processors'>['verificationStatus']
      rejectionReason?: string
    }

export const register = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: registrationRole,
  },
  returns: authResultValidator,
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

    if (existing) {
      throw new ConvexError({
        code: 'EMAIL_ALREADY_REGISTERED',
        field: 'email',
        message: 'Email ini sudah terdaftar.',
      })
    }

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
  returns: authResultValidator,
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

    if (!user || !valid) {
      throw new ConvexError({
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak sesuai.',
      })
    }
    if (user.status === 'suspended') {
      throw new ConvexError({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Akun ini sedang ditangguhkan.',
      })
    }

    const sessionToken = generateSessionToken()
    const tokenHash = await hashSessionToken(sessionToken)
    const result: { expiresAt: number } = await ctx.runMutation(
      internal.authInternal.createSession,
      { userId: user._id, email: user.email, tokenHash },
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
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { sessionToken }) => {
    const tokenHash = await hashSessionToken(sessionToken)
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (index) => index.eq('tokenHash', tokenHash))
      .unique()

    if (session) {
      await ctx.db.delete(session._id)
      const user = await ctx.db.get(session.userId)
      if (user) {
        await ctx.db.insert('authEvents', {
          userId: user._id,
          email: user.email,
          type: 'LOGOUT',
          success: true,
          occurredAt: Date.now(),
        })
      }
    }

    return { success: true }
  },
})

export const changePassword = action({
  args: { sessionToken: v.string(), currentPassword: v.string(), newPassword: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getBySession, { sessionToken: args.sessionToken })
    if (!user) throw new ConvexError({ code: 'AUTH_REQUIRED', message: 'Sesi tidak valid.' })
    const valid = await ctx.runAction(internal.authNode.verifyPassword, { password: args.currentPassword, passwordHash: user.passwordHash })
    if (!valid) throw new ConvexError({ code: 'INVALID_CREDENTIALS', message: 'Kata sandi saat ini tidak sesuai.' })
    validateRegistrationInput(user.name, user.email, args.newPassword)
    const passwordHash = await ctx.runAction(internal.authNode.hashPassword, { password: args.newPassword })
    await ctx.runMutation(internal.authInternal.updatePassword, { userId: user._id, passwordHash })
    return { success: true }
  },
})

export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      email: v.string(),
      role: v.union(registrationRole, v.literal('admin')),
      phone: v.optional(v.string()),
      status: v.union(v.literal('active'), v.literal('suspended')),
      createdAt: v.number(),
      profile: profileSummaryValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, { sessionToken }) => {
    const user = await resolveAuth(ctx, sessionToken)
    if (!user) return null

    let profile: ProfileSummary | null = null

    if (user.role === 'merchant') {
      const merchant = await ctx.db
        .query('merchants')
        .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
        .unique()

      if (merchant) {
        profile = {
          id: merchant._id,
          type: 'merchant',
          name: merchant.name,
          verificationStatus: merchant.verificationStatus,
          rejectionReason: merchant.rejectionReason,
        }
      }
    } else if (user.role === 'processor') {
      const processor = await ctx.db
        .query('processors')
        .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
        .unique()

      if (processor) {
        profile = {
          id: processor._id,
          type: 'processor',
          name: processor.name,
          verificationStatus: processor.verificationStatus,
          rejectionReason: processor.rejectionReason,
        }
      }
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      profile,
    }
  },
})
