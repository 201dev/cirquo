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
  v.literal('recovered'),
  v.literal('residual'),
  v.literal('closed'),
  v.literal('moderated'),
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
  v.literal('offered'),
  v.literal('accepted'),
  v.literal('collected'),
  v.literal('rejected'),
  v.literal('processed'),
  v.literal('unroutable'),
  v.literal('cancelled'),
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
    city: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notificationRadiusMeters: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('suspended')),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_role_and_status_and_city', ['role', 'status', 'city']),

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
    rejectionReason: v.optional(v.string()),
    verificationNote: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_verification', ['verificationStatus'])
    .index('by_verification_and_city', ['verificationStatus', 'city']),

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
    updatedAt: v.optional(v.number()),
    verificationStatus: verificationStatus,
    rejectionReason: v.optional(v.string()),
    verificationNote: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_verification', ['verificationStatus'])
    .index('by_verification_and_city', ['verificationStatus', 'city']),

  surplusItems: defineTable({
    merchantId: v.id('merchants'),
    city: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
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
    moderationReason: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_merchant', ['merchantId'])
    .index('by_created_at', ['createdAt'])
    .index('by_status', ['status'])
    .index('by_status_and_city', ['status', 'city'])
    .index('by_status_pickup_end', ['status', 'pickupEndAt']),

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
    .index('by_rescue_item_and_occurred_at', ['surplusItemId', 'occurredAt'])
    .index('by_rescue_item_and_event_type_and_occurred_at', ['surplusItemId', 'eventType', 'occurredAt'])
    .index('by_occurred_at', ['occurredAt'])
    .index('by_actor', ['actorId', 'occurredAt'])
    .index('by_event_type', ['eventType', 'occurredAt'])
    .index('by_order', ['orderId'])
    .index('by_recovery_batch', ['recoveryBatchId']),

  orders: defineTable({
    userId: v.id('users'),
    surplusItemId: v.id('surplusItems'),
    quantity: v.number(),
    totalPrice: v.number(),
    // ponytail: optional so pre-M6 orders remain readable; new reservations set it.
    // Backfill legacy paid orders before making Consumer savings universally available.
    originalPriceSnapshot: v.optional(v.number()),
    rescuedWeightGrams: v.number(),
    pickupCode: v.string(),
    status: orderStatus,
    // ponytail: legacy reservations have no explicit hold timestamp.
    // New reservations always set this; backfill then make it required.
    paymentHoldExpiresAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
    pickedUpAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_item', ['surplusItemId'])
    .index('by_item_status', ['surplusItemId', 'status'])
    .index('by_user_item_status', ['userId', 'surplusItemId', 'status'])
    .index('by_user_idempotency_key', ['userId', 'idempotencyKey'])
    .index('by_pickup_code', ['pickupCode']),

  recoveryBatches: defineTable({
    merchantId: v.id('merchants'),
    surplusItemId: v.id('surplusItems'),
    processorId: v.optional(v.id('processors')),
    offeredWeightGrams: v.number(),
    acceptedWeightGrams: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    estimatedCollectionAt: v.optional(v.number()),
    acceptanceNote: v.optional(v.string()),
    acceptedOutputTypes: v.optional(v.array(outputType)),
    collectedAt: v.optional(v.number()),
    intakeNote: v.optional(v.string()),
    varianceRequiresReview: v.optional(v.boolean()),
    outputType: v.optional(outputType),
    outputWeightGrams: v.optional(v.number()),
    residualWeightGrams: v.optional(v.number()),
    processLossGrams: v.optional(v.number()),
    conversionRatePercent: v.optional(v.number()),
    outcomeNote: v.optional(v.string()),
    status: recoveryBatchStatus,
    // ponytail: fields are optional so existing M4-02 batches deploy safely.
    // The routing mutations initialise them before their first transition.
    routingAttempts: v.optional(v.number()),
    attemptedProcessorIds: v.optional(v.array(v.id('processors'))),
    declinedByProcessorIds: v.optional(v.array(v.id('processors'))),
    offerExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_merchant', ['merchantId'])
    .index('by_processor', ['processorId'])
    .index('by_processor_status', ['processorId', 'status'])
    .index('by_processor_and_accepted_at', ['processorId', 'acceptedAt'])
    .index('by_status', ['status'])
    .index('by_item', ['surplusItemId']),

  payments: defineTable({
    orderId: v.id('orders'),
    provider: v.literal('midtrans'),
    amount: v.number(),
    providerStatus: v.string(),
    refundStatus: v.optional(v.union(
      v.literal('pending'),
      v.literal('succeeded'),
      v.literal('failed'),
    )),
    refundKey: v.optional(v.string()),
    refundRequestedAt: v.optional(v.number()),
    refundCompletedAt: v.optional(v.number()),
    refundError: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    providerTxnId: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_order', ['orderId'])
    .index('by_provider_txn', ['providerTxnId']),

  notifications: defineTable({
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    visibleAt: v.number(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_user_and_visible_at', ['userId', 'visibleAt']),

  adminActions: defineTable({
    adminId: v.id('users'),
    action: v.string(),
    // ponytail: optional only for pre-M7 rows; recordAdminAction requires it for new writes.
    targetUserId: v.optional(v.id('users')),
    targetEntityId: v.optional(v.string()),
    previousStatus: v.optional(v.string()),
    reasonOrNote: v.optional(v.string()),
    // ponytail: retain pre-M7 audit fields until deployed data is backfilled.
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.number(),
  }).index('by_admin_and_occurred_at', ['adminId', 'occurredAt']),

  disputes: defineTable({
    orderId: v.id('orders'),
    consumerId: v.id('users'),
    openedBy: v.id('users'),
    assignedAdminId: v.optional(v.id('users')),
    status: v.union(v.literal('open'), v.literal('resolved'), v.literal('rejected')),
    reason: v.string(),
    resolution: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_order', ['orderId'])
    .index('by_status_and_created_at', ['status', 'createdAt'])
    .index('by_consumer_and_created_at', ['consumerId', 'createdAt']),
})
