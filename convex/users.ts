import { ConvexError, v } from 'convex/values'
import { internalQuery, mutation } from './_generated/server'
import { hashSessionToken } from './lib/tokens'
import { requireRole } from './lib/guards'

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

export const getBySession = internalQuery({
  args: { sessionToken: v.string() },
  returns: v.union(v.object({
    _id: v.id('users'), _creationTime: v.number(), name: v.string(), email: v.string(), passwordHash: v.string(),
    role: v.union(v.literal('consumer'), v.literal('merchant'), v.literal('processor'), v.literal('admin')),
    phone: v.optional(v.string()), status: v.union(v.literal('active'), v.literal('suspended')), createdAt: v.number(),
  }), v.null()),
  handler: async (ctx, { sessionToken }) => {
    const tokenHash = await hashSessionToken(sessionToken)
    const session = await ctx.db.query('sessions').withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash)).unique()
    if (!session || session.expiresAt <= Date.now()) return null
    return ctx.db.get(session.userId)
  },
})

export const updateConsumerLocation = mutation({
  args: {
    sessionToken: v.optional(v.string()), city: v.string(), latitude: v.number(), longitude: v.number(),
    notificationRadiusMeters: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['consumer'])
    const city = args.city.trim()
    if (!city || city.length > 100 || args.latitude < -90 || args.latitude > 90 || args.longitude < -180 || args.longitude > 180
      || !Number.isInteger(args.notificationRadiusMeters) || args.notificationRadiusMeters < 500 || args.notificationRadiusMeters > 30_000) {
      throw new ConvexError({ code: 'VALIDATION_FAILED', message: 'Lokasi atau radius notifikasi tidak valid.' })
    }
    await ctx.db.patch(user._id, { city, latitude: args.latitude, longitude: args.longitude, notificationRadiusMeters: args.notificationRadiusMeters })
    return null
  },
})
