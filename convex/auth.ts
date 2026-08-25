import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { hashPassword, verifyPassword } from './lib/password'
import { generateToken, hashToken } from './lib/tokens'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(code: string, message: string, details?: Record<string, string | number>): never {
  throw new ConvexError({ code, message, details })
}

const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal('consumer'), v.literal('merchant'), v.literal('processor')),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase()
    const name = args.name.trim()

    if (name.length < 2 || name.length > 80) {
      fail('VALIDATION_FAILED', 'Name must be 2–80 characters.', { field: 'name' })
    }
    if (!EMAIL_RE.test(email)) {
      fail('VALIDATION_FAILED', 'Enter a valid email address.', { field: 'email' })
    }
    if (args.password.length < 8 || args.password.length > 128 ||
        !/[A-Za-z]/.test(args.password) || !/[0-9]/.test(args.password)) {
      fail('VALIDATION_FAILED', 'Password must be 8+ characters with a letter and a number.',
           { field: 'password' })
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique()
    if (existing) {
      fail('VALIDATION_FAILED', 'An account with this email already exists.', { field: 'email' })
    }

    const passwordHash = hashPassword(args.password)
    const token = generateToken()
    const tHash = await hashToken(token)

    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      name,
      email,
      passwordHash,
      role: args.role,
      phone: args.phone,
      status: 'active',
      createdAt: now,
    })

    const expiresAt = now + 30 * 24 * 60 * 60 * 1000
    await ctx.db.insert('sessions', {
      userId,
      tokenHash: tHash,
      expiresAt,
      createdAt: now,
    })

    await ctx.db.insert('authEvents', {
      userId,
      email,
      type: 'REGISTER',
      success: true,
      occurredAt: now,
    })

    return {
      userId,
      sessionToken: token,
      expiresAt,
      role: args.role,
      needsProfile: args.role !== 'consumer',
    }
  },
})

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase()
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique()

    if (!user) {
      verifyPassword(args.password, DUMMY_HASH) // constant-ish timing
      fail('AUTH_REQUIRED', 'Incorrect email or password.')
    }
    if (!verifyPassword(args.password, user.passwordHash)) {
      fail('AUTH_REQUIRED', 'Incorrect email or password.')
    }
    if (user.status === 'suspended') {
      fail('ACCOUNT_SUSPENDED', 'This account has been suspended.')
    }

    const token = generateToken()
    const tHash = await hashToken(token)
    const now = Date.now()
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000

    await ctx.db.insert('sessions', {
      userId: user._id,
      tokenHash: tHash,
      expiresAt,
      createdAt: now,
    })

    await ctx.db.insert('authEvents', {
      userId: user._id,
      email,
      type: 'LOGIN_SUCCESS',
      success: true,
      occurredAt: now,
    })

    // check if profile is needed
    let needsProfile = false
    let verificationStatus = undefined
    if (user.role === 'merchant') {
      const m = await ctx.db.query('merchants').withIndex('by_owner', q => q.eq('ownerId', user._id)).unique()
      if (!m) needsProfile = true
      else verificationStatus = m.verificationStatus
    } else if (user.role === 'processor') {
      const p = await ctx.db.query('processors').withIndex('by_owner', q => q.eq('ownerId', user._id)).unique()
      if (!p) needsProfile = true
      else verificationStatus = p.verificationStatus
    }

    return {
      userId: user._id,
      sessionToken: token,
      expiresAt,
      role: user.role,
      name: user.name,
      verificationStatus,
      needsProfile,
    }
  },
})

export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const tHash = await hashToken(args.sessionToken)
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', tHash))
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

export const getCurrentUser = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken || args.sessionToken.length < 20) return null
    const tHash = await hashToken(args.sessionToken)
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', tHash))
      .unique()

    if (!session || session.expiresAt <= Date.now()) return null
    const user = await ctx.db.get(session.userId)
    if (!user || user.status === 'suspended') return null

    type Profile =
      | { kind: 'none' }
      | { kind: 'merchant'; merchantId: string; name: string; city: string; verificationStatus: string }
      | { kind: 'processor'; processorId: string; name: string; city: string; facilityType: string; verificationStatus: string }

    let profile: Profile = { kind: 'none' }

    if (user.role === 'merchant') {
      const m = await ctx.db.query('merchants').withIndex('by_owner', q => q.eq('ownerId', user._id)).unique()
      if (m) {
        profile = {
          kind: 'merchant',
          merchantId: m._id,
          name: m.name,
          city: m.address,
          verificationStatus: m.verificationStatus,
        }
      }
    } else if (user.role === 'processor') {
      const p = await ctx.db.query('processors').withIndex('by_owner', q => q.eq('ownerId', user._id)).unique()
      if (p) {
        profile = {
          kind: 'processor',
          processorId: p._id,
          name: p.name,
          city: p.address,
          facilityType: 'Organic',
          verificationStatus: p.verificationStatus,
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
