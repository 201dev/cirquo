import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireRole } from './lib/guards'
import { validateProcessorProfile } from './lib/profiles'
import {
  facilityType,
  materialType,
  outputType,
} from './schema'

export const createProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    name: v.string(),
    facilityType,
    city: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    acceptedMaterialTypes: v.array(materialType),
    dailyCapacityGrams: v.number(),
    maxPickupRadiusMeters: v.number(),
    outputTypes: v.array(outputType),
    operatingHoursStart: v.number(),
    operatingHoursEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const profile = validateProcessorProfile(args)
    const existing = await ctx.db
      .query('processors')
      .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
      .unique()

    if (existing) throw new ConvexError('VALIDATION_FAILED')

    const processorId = await ctx.db.insert('processors', {
      ownerId: user._id,
      name: profile.name,
      facilityType: args.facilityType,
      city: profile.city,
      latitude: args.latitude,
      longitude: args.longitude,
      acceptedMaterialTypes: args.acceptedMaterialTypes,
      dailyCapacityGrams: args.dailyCapacityGrams,
      maxPickupRadiusMeters: args.maxPickupRadiusMeters,
      outputTypes: args.outputTypes,
      operatingHoursStart: args.operatingHoursStart,
      operatingHoursEnd: args.operatingHoursEnd,
      verificationStatus: 'pending',
      createdAt: Date.now(),
    })

    return { processorId, verificationStatus: 'pending' as const }
  },
})
