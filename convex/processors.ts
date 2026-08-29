import { ConvexError, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireRole } from './lib/guards'
import { validateProcessorProfile, validateProcessorRoutingProfile } from './lib/profiles'
import {
  facilityType,
  materialType,
  outputType,
} from './schema'

const processorProfileView = v.object({
  _id: v.id('processors'),
  name: v.string(),
  facilityType: v.optional(facilityType),
  acceptedMaterialTypes: v.optional(v.array(materialType)),
  dailyCapacityGrams: v.optional(v.number()),
  maxPickupRadiusMeters: v.optional(v.number()),
  outputTypes: v.optional(v.array(outputType)),
  operatingHoursStart: v.optional(v.number()),
  operatingHoursEnd: v.optional(v.number()),
  verificationStatus: v.union(v.literal('pending'), v.literal('verified'), v.literal('rejected'), v.literal('suspended')),
  updatedAt: v.optional(v.number()),
})

function toProfileView(processor: Doc<'processors'>) {
  return {
    _id: processor._id,
    name: processor.name,
    facilityType: processor.facilityType,
    acceptedMaterialTypes: processor.acceptedMaterialTypes,
    dailyCapacityGrams: processor.dailyCapacityGrams,
    maxPickupRadiusMeters: processor.maxPickupRadiusMeters,
    outputTypes: processor.outputTypes,
    operatingHoursStart: processor.operatingHoursStart,
    operatingHoursEnd: processor.operatingHoursEnd,
    verificationStatus: processor.verificationStatus,
    updatedAt: processor.updatedAt,
  }
}

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
  returns: v.object({
    processorId: v.id('processors'),
    verificationStatus: v.literal('pending'),
  }),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const profile = validateProcessorProfile(args)
    const now = Date.now()
    const existing = await ctx.db
      .query('processors')
      .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
      .unique()

    if (existing) {
      throw new ConvexError({
        code: 'PROFILE_ALREADY_EXISTS',
        message: 'Profil Organic Processor sudah tersedia.',
      })
    }

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
      createdAt: now,
      updatedAt: now,
    })

    return { processorId, verificationStatus: 'pending' as const }
  },
})

export const getMine = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.union(processorProfileView, v.null()),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const processor = await ctx.db
      .query('processors')
      .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
      .unique()
    return processor ? toProfileView(processor) : null
  },
})

export const updateProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    facilityType,
    acceptedMaterialTypes: v.array(materialType),
    dailyCapacityGrams: v.number(),
    maxPickupRadiusMeters: v.number(),
    outputTypes: v.array(outputType),
    operatingHoursStart: v.number(),
    operatingHoursEnd: v.number(),
  },
  returns: v.object({ updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionToken, ['processor'])
    const processor = await ctx.db
      .query('processors')
      .withIndex('by_owner', (index) => index.eq('ownerId', user._id))
      .unique()
    if (!processor) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Profil Organic Processor belum tersedia.' })
    }
    if (processor.verificationStatus === 'suspended') {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Profil yang ditangguhkan tidak dapat diubah.' })
    }
    validateProcessorRoutingProfile(args)
    const updatedAt = Date.now()
    await ctx.db.patch(processor._id, {
      facilityType: args.facilityType,
      acceptedMaterialTypes: args.acceptedMaterialTypes,
      dailyCapacityGrams: args.dailyCapacityGrams,
      maxPickupRadiusMeters: args.maxPickupRadiusMeters,
      outputTypes: args.outputTypes,
      operatingHoursStart: args.operatingHoursStart,
      operatingHoursEnd: args.operatingHoursEnd,
      updatedAt,
    })
    return { updatedAt }
  },
})
