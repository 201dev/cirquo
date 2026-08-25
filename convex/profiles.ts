import { mutation } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { requireAuth } from './lib/guards'

export const createMerchantProfile = mutation({
  args: {
    sessionToken: v.string(),
    legalName: v.string(),
    registrationNumber: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionToken)
    if (user.role !== 'merchant') {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Hanya merchant yang dapat membuat profil ini.' })
    }

    const existing = await ctx.db
      .query('merchants')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .unique()

    if (existing) {
      throw new ConvexError({ code: 'CONFLICT', message: 'Profil merchant sudah ada.' })
    }

    const merchantId = await ctx.db.insert('merchants', {
      ownerId: user._id,
      name: user.name, // Use account name as initial business name, can be updated later
      legalName: args.legalName,
      registrationNumber: args.registrationNumber,
      address: args.address,
      verificationStatus: 'pending',
      createdAt: Date.now(),
    })

    return { merchantId }
  },
})

export const createProcessorProfile = mutation({
  args: {
    sessionToken: v.string(),
    legalName: v.string(),
    registrationNumber: v.string(),
    address: v.string(),
    capacityGrams: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionToken)
    if (user.role !== 'processor') {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Hanya processor yang dapat membuat profil ini.' })
    }

    const existing = await ctx.db
      .query('processors')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .unique()

    if (existing) {
      throw new ConvexError({ code: 'CONFLICT', message: 'Profil processor sudah ada.' })
    }

    const processorId = await ctx.db.insert('processors', {
      ownerId: user._id,
      name: user.name,
      legalName: args.legalName,
      registrationNumber: args.registrationNumber,
      address: args.address,
      capacityGrams: args.capacityGrams,
      verificationStatus: 'pending',
      createdAt: Date.now(),
    })

    return { processorId }
  },
})
