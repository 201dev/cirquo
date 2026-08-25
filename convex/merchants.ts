import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwnership, requireRole } from './lib/guards'
import { validateMerchantProfile } from './lib/profiles'
import { businessType } from './schema'

const merchantDocument = v.object({
  _id: v.id('merchants'),
  _creationTime: v.number(),
  ownerId: v.id('users'),
  name: v.string(),
  businessType: v.optional(businessType),
  address: v.string(),
  city: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  phone: v.optional(v.string()),
  legalName: v.optional(v.string()),
  registrationNumber: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal('pending'),
    v.literal('verified'),
    v.literal('rejected'),
    v.literal('suspended'),
  ),
  createdAt: v.number(),
})

export const createProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    name: v.string(),
    businessType,
    address: v.string(),
    city: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    merchantId: v.id('merchants'),
    verificationStatus: v.literal('pending'),
  }),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['merchant'])
    const profile = validateMerchantProfile(args)
    const existing = await ctx.db
      .query('merchants')
      .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
      .unique()

    if (existing) {
      throw new ConvexError({
        code: 'PROFILE_ALREADY_EXISTS',
        message: 'Profil Merchant sudah tersedia.',
      })
    }

    const merchantId = await ctx.db.insert('merchants', {
      ownerId: user._id,
      name: profile.name,
      businessType: args.businessType,
      address: profile.address,
      city: profile.city,
      latitude: args.latitude,
      longitude: args.longitude,
      phone: profile.phone,
      verificationStatus: 'pending',
      createdAt: Date.now(),
    })

    return { merchantId, verificationStatus: 'pending' as const }
  },
})

export const getByOwner = query({
  args: {
    sessionToken: v.optional(v.string()),
    ownerId: v.id('users'),
  },
  returns: v.union(merchantDocument, v.null()),
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
