import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const userRole = v.union(
  v.literal('consumer'),
  v.literal('merchant'),
  v.literal('processor'),
  v.literal('admin'),
)

export const userStatus = v.union(
  v.literal('active'),
  v.literal('suspended'),
)

export const ledgerEventType = v.union(
  v.literal('LISTED'),
  v.literal('PRICE_ADJUSTED'),
  v.literal('RESERVED'),
  v.literal('PAID'),
  v.literal('RESCUED'),
  v.literal('CANCELLED'),
  v.literal('EXPIRED'),
  v.literal('ROUTED'),
  v.literal('ROUTING_FAILED'),
  v.literal('INTAKE_ACCEPTED'),
  v.literal('INTAKE_DECLINED'),
  v.literal('PROCESSED'),
  v.literal('MODERATED'),
)

export const rescueItemStatus = v.union(
  v.literal('draft'),
  v.literal('active'),
  v.literal('sold_out'),
  v.literal('expired'),
  v.literal('recovery_pending'),
  v.literal('closed'),
)

export const orderStatus = v.union(
  v.literal('reserved'),
  v.literal('paid'),
  v.literal('picked_up'),
  v.literal('cancelled'),
  v.literal('expired'),
)

export const recoveryBatchStatus = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('processed'),
)

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: userRole,
    // ponytail: optional only for users created before M1-04.
    // Make required after those rows are backfilled to `active`.
    status: v.optional(userStatus),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  sessions: defineTable({
    userId: v.id('users'),
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index('by_token_hash', ['tokenHash']),

  merchants: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isVerified: v.boolean(),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  surplusItems: defineTable({
    merchantId: v.id('merchants'),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    originalPrice: v.number(),
    currentPrice: v.number(),
    initialQuantity: v.number(),
    remainingQuantity: v.number(),
    weightPerItemGrams: v.number(),
    pickupStartAt: v.number(),
    pickupEndAt: v.number(),
    dietaryTags: v.array(v.string()),
    status: rescueItemStatus,
    createdAt: v.number(),
  })
    .index('by_merchant', ['merchantId'])
    .index('by_status', ['status']),

  orders: defineTable({
    userId: v.id('users'),
    surplusItemId: v.id('surplusItems'),
    quantity: v.number(),
    totalPrice: v.number(),
    rescuedWeightGrams: v.number(),
    pickupCode: v.string(),
    status: orderStatus,
    createdAt: v.number(),
    pickedUpAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_item', ['surplusItemId'])
    .index('by_pickup_code', ['pickupCode']),

  recoveryBatches: defineTable({
    merchantId: v.id('merchants'),
    surplusItemId: v.id('surplusItems'),
    processorId: v.optional(v.id('users')),
    offeredWeightGrams: v.number(),
    acceptedWeightGrams: v.optional(v.number()),
    residualWeightGrams: v.optional(v.number()),
    status: recoveryBatchStatus,
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_merchant', ['merchantId'])
    .index('by_processor', ['processorId'])
    .index('by_status', ['status']),

  materialFlowLedger: defineTable({
    surplusItemId: v.id('surplusItems'),
    orderId: v.optional(v.id('orders')),
    recoveryBatchId: v.optional(v.id('recoveryBatches')),
    eventType: ledgerEventType,
    weightDeltaGrams: v.number(),
    actorId: v.optional(v.id('users')),
    actorRole: v.optional(userRole),
    metadata: v.optional(v.string()),
    methodologyVersion: v.string(),
    occurredAt: v.number(),
  })
    .index('by_rescue_item', ['surplusItemId'])
    .index('by_occurred_at', ['occurredAt'])
    .index('by_actor', ['actorId', 'occurredAt'])
    .index('by_event_type', ['eventType', 'occurredAt'])
    .index('by_order', ['orderId']),
})
