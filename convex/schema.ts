import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const userRole = v.union(
  v.literal('consumer'),
  v.literal('merchant'),
  v.literal('processor'),
  v.literal('admin'),
)

export const verificationStatus = v.union(
  v.literal('pending'),
  v.literal('verified'),
  v.literal('rejected'),
  v.literal('suspended'),
)

export const businessType = v.union(
  v.literal('bakery'),
  v.literal('restaurant'),
  v.literal('cafe'),
  v.literal('grocery'),
  v.literal('catering'),
  v.literal('warung'),
  v.literal('other'),
)

export const facilityType = v.union(
  v.literal('bsf_farm'),
  v.literal('composting'),
  v.literal('biogas'),
  v.literal('animal_feed'),
)

export const materialType = v.union(
  v.literal('prepared_food'),
  v.literal('bakery'),
  v.literal('produce'),
  v.literal('dairy'),
  v.literal('protein'),
  v.literal('dry_goods'),
  v.literal('mixed'),
)

export const outputType = v.union(
  v.literal('compost'),
  v.literal('bsf_larvae'),
  v.literal('animal_feed'),
  v.literal('biogas'),
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

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: userRole,
    phone: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('suspended')),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  sessions: defineTable({
    userId: v.id('users'),
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    userAgent: v.optional(v.string()),
    platform: v.optional(v.union(v.literal('web'), v.literal('android'))),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_user', ['userId'])
    .index('by_expires_at', ['expiresAt']),

  authEvents: defineTable({
    userId: v.optional(v.id('users')),
    email: v.string(),
    type: v.string(),
    success: v.boolean(),
    occurredAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_email', ['email']),

  merchants: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    // ponytail: optional legacy fields keep pre-M1 local rows readable.
    // Backfill then make the target fields required when M1-03 lands in dev.
    businessType: v.optional(businessType),
    address: v.string(),
    city: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    phone: v.optional(v.string()),
    legalName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    verificationStatus: verificationStatus,
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  processors: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    // Same migration bridge as merchants above; new writes remain complete.
    facilityType: v.optional(facilityType),
    city: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    acceptedMaterialTypes: v.optional(v.array(materialType)),
    dailyCapacityGrams: v.optional(v.number()),
    maxPickupRadiusMeters: v.optional(v.number()),
    outputTypes: v.optional(v.array(outputType)),
    operatingHoursStart: v.optional(v.number()),
    operatingHoursEnd: v.optional(v.number()),
    legalName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    capacityGrams: v.optional(v.number()),
    verificationStatus: verificationStatus,
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  surplusItems: defineTable({
    merchantId: v.id('merchants'),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    originalPrice: v.number(),
    floorPrice: v.number(),
    currentPrice: v.number(),
    initialQuantity: v.number(),
    remainingQuantity: v.number(),
    weightPerItemGrams: v.number(),
    pickupStartAt: v.number(),
    pickupEndAt: v.number(),
    materialType: materialType,
    dietaryTags: v.array(v.string()),
    processingOnly: v.boolean(),
    status: rescueItemStatus,
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_merchant', ['merchantId'])
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

  orders: defineTable({
    userId: v.id('users'),
    surplusItemId: v.id('surplusItems'),
    quantity: v.number(),
    totalPrice: v.number(),
    rescuedWeightGrams: v.number(),
    pickupCode: v.string(),
    status: orderStatus,
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
    pickedUpAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_item', ['surplusItemId'])
    .index('by_user_item_status', ['userId', 'surplusItemId', 'status'])
    .index('by_user_idempotency_key', ['userId', 'idempotencyKey'])
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

  payments: defineTable({
    orderId: v.id('orders'),
    provider: v.literal('midtrans'),
    amount: v.number(),
    providerStatus: v.string(),
    paymentMethod: v.optional(v.string()),
    providerTxnId: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_order', ['orderId'])
    .index('by_provider_txn', ['providerTxnId']),
})
