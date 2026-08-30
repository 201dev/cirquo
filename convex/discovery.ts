import { v, ConvexError } from 'convex/values'
import { query } from './_generated/server'
import { materialType } from './schema'
import { isPublicDiscoveryItem, sortByDistanceThenUrgency } from '../src/lib/discovery'
import { calculateHaversineDistanceMeters } from '../src/lib/geo'

export const listNearby = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusMeters: v.number(),
    city: v.optional(v.string()),
    materialType: v.optional(materialType),
    dietaryTags: v.optional(v.array(v.string())),
    maxPrice: v.optional(v.number()),
    minPrice: v.optional(v.number()),
    pickupBefore: v.optional(v.number()), // e.g. for "Mulai ≤18.00", we could pass a timestamp, or we filter based on current day
    pickupAfter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    if (!Number.isFinite(args.latitude) || args.latitude < -90 || args.latitude > 90) {
      throw new ConvexError('Invalid latitude')
    }
    if (!Number.isFinite(args.longitude) || args.longitude < -180 || args.longitude > 180) {
      throw new ConvexError('Invalid longitude')
    }
    
    const radiusMeters = Math.max(500, Math.min(30000, args.radiusMeters))

    // Keep the geospatial scan bounded until a geo index/aggregate is introduced.
    const activeItems = args.city
      ? await ctx.db.query('surplusItems').withIndex('by_status_and_city', (q) => q.eq('status', 'active').eq('city', args.city)).take(500)
      : await ctx.db.query('surplusItems').withIndex('by_status', (q) => q.eq('status', 'active')).take(500)

    const now = Date.now()
    const candidates = []
    
    // We also need merchants to check verification status and location
    const merchants = await ctx.db.query('merchants').take(500)
    const merchantMap = new Map(merchants.map(m => [m._id, m]))

    for (const item of activeItems) {
      const merchant = merchantMap.get(item.merchantId)
      if (!isPublicDiscoveryItem(item, merchant, now)) continue

      if (args.materialType && item.materialType !== args.materialType) continue
      if (args.maxPrice !== undefined && item.currentPrice > args.maxPrice) continue
      if (args.minPrice !== undefined && item.currentPrice < args.minPrice) continue
      if (args.pickupBefore !== undefined && item.pickupStartAt > args.pickupBefore) continue
      if (args.pickupAfter !== undefined && item.pickupStartAt <= args.pickupAfter) continue
      
      if (args.dietaryTags && args.dietaryTags.length > 0) {
        // AND semantics: must have ALL requested tags
        const hasAll = args.dietaryTags.every(tag => 
          item.dietaryTags.some(t => t.toLowerCase() === tag.toLowerCase())
        )
        if (!hasAll) continue
      }

      const distanceMeters = calculateHaversineDistanceMeters(
        args.latitude,
        args.longitude,
        merchant.latitude,
        merchant.longitude
      )

      if (distanceMeters > radiusMeters) continue

      const discountPercentage = Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)

      candidates.push({
        _id: item._id,
        name: item.name,
        imageUrl: item.imageStorageId ? await ctx.storage.getUrl(item.imageStorageId) ?? undefined : item.imageUrl,
        materialType: item.materialType,
        dietaryTags: item.dietaryTags,
        originalPrice: item.originalPrice,
        currentPrice: item.currentPrice,
        discountPercentage,
        remainingQuantity: item.remainingQuantity,
        weightPerItemGrams: item.weightPerItemGrams,
        pickupStartAt: item.pickupStartAt,
        pickupEndAt: item.pickupEndAt,
        distanceMeters,
        merchant: {
          _id: merchant._id,
          name: merchant.name,
          businessType: merchant.businessType,
          address: merchant.address,
          latitude: merchant.latitude,
          longitude: merchant.longitude,
        }
      })
    }

    const rankedCandidates = sortByDistanceThenUrgency(candidates)

    const totalMatched = rankedCandidates.length
    const truncated = totalMatched > 200
    const results = rankedCandidates.slice(0, 200)

    return {
      results,
      totalMatched,
      truncated
    }
  }
})

export const getListing = query({
  args: { id: v.id('surplusItems') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id)
    if (!item) return null
    
    const merchant = await ctx.db.get(item.merchantId)
    if (!isPublicDiscoveryItem(item, merchant, Date.now())) return null

    const discountPercentage = Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)

    return {
      _id: item._id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageStorageId ? await ctx.storage.getUrl(item.imageStorageId) ?? undefined : item.imageUrl,
      materialType: item.materialType,
      dietaryTags: item.dietaryTags,
      originalPrice: item.originalPrice,
      currentPrice: item.currentPrice,
      discountPercentage,
      remainingQuantity: item.remainingQuantity,
      weightPerItemGrams: item.weightPerItemGrams,
      pickupStartAt: item.pickupStartAt,
      pickupEndAt: item.pickupEndAt,
      merchant: {
        _id: merchant._id,
        name: merchant.name,
        businessType: merchant.businessType,
        address: merchant.address,
        latitude: merchant.latitude,
        longitude: merchant.longitude,
      }
    }
  }
})
