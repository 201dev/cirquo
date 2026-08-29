/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api, internal } from './_generated/api'
import { hashSessionToken } from './lib/tokens'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const HOUR_MS = 60 * 60 * 1_000

test('routing menawarkan satu per satu, retry tiga kali, dan terminalnya idempoten', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const ids = await t.run(async (ctx) => {
    const merchantOwnerId = await ctx.db.insert('users', {
      name: 'Merchant Routing', email: 'merchant.routing.m403@example.com', passwordHash: 'test', role: 'merchant', status: 'active', createdAt: now,
    })
    const merchantId = await ctx.db.insert('merchants', {
      ownerId: merchantOwnerId, name: 'Merchant Routing', address: 'Semarang', city: 'Semarang', latitude: -6.9932, longitude: 110.4203, verificationStatus: 'verified', createdAt: now,
    })
    const processorIds = await Promise.all([0, 1, 2].map(async (offset) => {
      const ownerId = await ctx.db.insert('users', {
        name: `Processor ${offset}`, email: `processor.routing.${offset}@example.com`, passwordHash: 'test', role: 'processor', status: 'active', createdAt: now,
      })
      return ctx.db.insert('processors', {
        ownerId, name: `Processor ${offset}`, facilityType: 'composting', city: 'Semarang', latitude: -6.9932, longitude: 110.4203 + offset / 100, acceptedMaterialTypes: ['bakery'], dailyCapacityGrams: 2_000, maxPickupRadiusMeters: 5_000, outputTypes: ['compost'], operatingHoursStart: 0, operatingHoursEnd: 1_000, verificationStatus: 'verified', createdAt: now,
      })
    }))
    const item = {
      merchantId, name: 'Roti Routing', originalPrice: 20_000, floorPrice: 8_000, currentPrice: 12_000, initialQuantity: 1, remainingQuantity: 1, weightPerItemGrams: 500, pickupStartAt: now - HOUR_MS, pickupEndAt: now - 1, materialType: 'bakery' as const, dietaryTags: [], processingOnly: false, status: 'recovery_pending' as const, createdAt: now,
    }
    const batchId = await ctx.db.insert('recoveryBatches', {
      merchantId, surplusItemId: await ctx.db.insert('surplusItems', item), offeredWeightGrams: 500, status: 'pending', routingAttempts: 0, attemptedProcessorIds: [], declinedByProcessorIds: [], createdAt: now,
    })
    const noCandidateBatchId = await ctx.db.insert('recoveryBatches', {
      merchantId,
      surplusItemId: await ctx.db.insert('surplusItems', { ...item, name: 'Protein Routing', materialType: 'protein' }),
      offeredWeightGrams: 500,
      status: 'pending',
      routingAttempts: 0,
      attemptedProcessorIds: [],
      declinedByProcessorIds: [],
      createdAt: now,
    })
    return { batchId, noCandidateBatchId, processorIds }
  })

  await Promise.all([
    t.mutation(internal.recoveryBatches.runRouting, {}),
    t.mutation(internal.recoveryBatches.runRouting, {}),
  ])
  let batch = await t.run((ctx) => ctx.db.get(ids.batchId))
  expect(batch).toMatchObject({ status: 'offered', processorId: ids.processorIds[0], routingAttempts: 1 })
  let routedEvents = await t.run((ctx) =>
    ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', batch!.surplusItemId)).collect(),
  )
  expect(routedEvents).toMatchObject([{ eventType: 'ROUTED', weightDeltaGrams: 0, recoveryBatchId: ids.batchId }])

  for (const processorId of ids.processorIds.slice(1)) {
    const overdueAt = Date.now() - 1
    await t.run((ctx) => ctx.db.patch(ids.batchId, { offerExpiresAt: overdueAt }))
    await t.mutation(internal.recoveryBatches.expireOffer, { batchId: ids.batchId, offerExpiresAt: overdueAt })
    batch = await t.run((ctx) => ctx.db.get(ids.batchId))
    expect(batch).toMatchObject({ status: 'offered', processorId })
  }

  const lateOfferExpiry = batch!.offerExpiresAt!
  await t.mutation(internal.recoveryBatches.expireOffer, { batchId: ids.batchId, offerExpiresAt: lateOfferExpiry - 1 })
  expect(await t.run((ctx) => ctx.db.get(ids.batchId))).toMatchObject({ status: 'offered', routingAttempts: 3 })
  const finalOverdueAt = Date.now() - 1
  await t.run((ctx) => ctx.db.patch(ids.batchId, { offerExpiresAt: finalOverdueAt }))
  await t.mutation(internal.recoveryBatches.expireOffer, { batchId: ids.batchId, offerExpiresAt: finalOverdueAt })
  await t.mutation(internal.recoveryBatches.expireOffer, { batchId: ids.batchId, offerExpiresAt: finalOverdueAt })
  batch = await t.run((ctx) => ctx.db.get(ids.batchId))
  expect(batch).toMatchObject({ status: 'unroutable', routingAttempts: 3, residualWeightGrams: 500 })
  routedEvents = await t.run((ctx) =>
    ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', batch!.surplusItemId)).collect(),
  )
  expect(routedEvents.filter((event) => event.eventType === 'ROUTED')).toHaveLength(3)
  expect(routedEvents.filter((event) => event.eventType === 'ROUTING_FAILED')).toMatchObject([
    { weightDeltaGrams: 0, recoveryBatchId: ids.batchId },
  ])

  await t.mutation(internal.recoveryBatches.runRouting, {})
  const noCandidateBatch = await t.run((ctx) => ctx.db.get(ids.noCandidateBatchId))
  expect(noCandidateBatch).toMatchObject({ status: 'unroutable', routingAttempts: 0 })
  const noCandidateEvents = await t.run((ctx) =>
    ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', noCandidateBatch!.surplusItemId)).collect(),
  )
  expect(noCandidateEvents).toMatchObject([{ eventType: 'ROUTING_FAILED', weightDeltaGrams: 0 }])
  await t.mutation(internal.recoveryBatches.runRouting, {})
  expect(
    await t.run((ctx) =>
      ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', noCandidateBatch!.surplusItemId)).collect(),
    ),
  ).toHaveLength(1)
})

test('Merchant hanya melihat batch miliknya tanpa data pickup', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const merchantToken = 'm'.repeat(43)
  const otherMerchantToken = 'o'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const merchantUserId = await ctx.db.insert('users', {
      name: 'Merchant M4 UI', email: 'merchant.m404@example.com', passwordHash: 'test', role: 'merchant', status: 'active', createdAt: now,
    })
    const otherMerchantUserId = await ctx.db.insert('users', {
      name: 'Merchant Lain', email: 'merchant.lain.m404@example.com', passwordHash: 'test', role: 'merchant', status: 'active', createdAt: now,
    })
    const consumerId = await ctx.db.insert('users', {
      name: 'Consumer M4 UI', email: 'consumer.m404@example.com', passwordHash: 'test', role: 'consumer', status: 'active', createdAt: now,
    })
    const processorOwnerId = await ctx.db.insert('users', {
      name: 'Processor M4 UI', email: 'processor.m404@example.com', passwordHash: 'test', role: 'processor', status: 'active', createdAt: now,
    })
    const [merchantId, otherMerchantId, processorId] = await Promise.all([
      ctx.db.insert('merchants', {
        ownerId: merchantUserId, name: 'Dapur M4 UI', address: 'Semarang', verificationStatus: 'verified', createdAt: now,
      }),
      ctx.db.insert('merchants', {
        ownerId: otherMerchantUserId, name: 'Dapur Lain', address: 'Semarang', verificationStatus: 'verified', createdAt: now,
      }),
      ctx.db.insert('processors', {
        ownerId: processorOwnerId, name: 'Kompos Semarang', facilityType: 'composting', verificationStatus: 'verified', createdAt: now,
      }),
    ])
    await Promise.all([
      ctx.db.insert('sessions', {
        userId: merchantUserId, tokenHash: await hashSessionToken(merchantToken), expiresAt: now + HOUR_MS, createdAt: now,
      }),
      ctx.db.insert('sessions', {
        userId: otherMerchantUserId, tokenHash: await hashSessionToken(otherMerchantToken), expiresAt: now + HOUR_MS, createdAt: now,
      }),
    ])
    const item = {
      name: 'Roti M4 UI', originalPrice: 20_000, floorPrice: 8_000, currentPrice: 12_000,
      initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 500,
      pickupStartAt: now - HOUR_MS, pickupEndAt: now - 1, materialType: 'bakery' as const,
      dietaryTags: [], processingOnly: false, status: 'recovery_pending' as const, createdAt: now,
    }
    const itemId = await ctx.db.insert('surplusItems', { ...item, merchantId })
    const otherItemId = await ctx.db.insert('surplusItems', { ...item, merchantId: otherMerchantId })
    const batchId = await ctx.db.insert('recoveryBatches', {
      merchantId, surplusItemId: itemId, processorId, offeredWeightGrams: 500, status: 'offered',
      routingAttempts: 2, attemptedProcessorIds: [processorId], declinedByProcessorIds: [], offerExpiresAt: now + HOUR_MS, createdAt: now,
    })
    await ctx.db.insert('recoveryBatches', {
      merchantId: otherMerchantId, surplusItemId: otherItemId, offeredWeightGrams: 500, status: 'unroutable',
      routingAttempts: 3, attemptedProcessorIds: [], declinedByProcessorIds: [], residualWeightGrams: 500, createdAt: now,
    })
    await ctx.db.insert('orders', {
      userId: consumerId, surplusItemId: itemId, quantity: 1, totalPrice: 12_000,
      rescuedWeightGrams: 450, pickupCode: '123456', status: 'picked_up', createdAt: now, pickedUpAt: now,
    })
    return { itemId, batchId }
  })

  const batches = await t.query(api.recoveryBatches.listForMerchant, { sessionToken: merchantToken })
  expect(batches).toMatchObject([{
    _id: ids.batchId, surplusItemId: ids.itemId, status: 'offered', routingAttempts: 2,
    processorName: 'Kompos Semarang', offeredWeightGrams: 500,
  }])
  expect(batches[0]).not.toHaveProperty('pickupCode')
  expect(batches[0]).not.toHaveProperty('consumerName')
  expect(batches[0]).not.toHaveProperty('refundStatus')
  const item = await t.query(api.surplusItems.getMine, { id: ids.itemId, sessionToken: merchantToken })
  expect(item).toMatchObject({ pickedUpOrderCount: 1, rescuedWeightGrams: 450 })
  const otherBatches = await t.query(api.recoveryBatches.listForMerchant, { sessionToken: otherMerchantToken })
  expect(otherBatches).toHaveLength(1)
  expect(otherBatches[0]?._id).not.toEqual(ids.batchId)
  expect(await t.query(api.surplusItems.getMine, { id: ids.itemId, sessionToken: otherMerchantToken })).toBeNull()
})

test('Processor terverifikasi menyelesaikan offer, intake, outcome, dan decline secara aman', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const processorToken = 'p'.repeat(43)
  const otherToken = 'q'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const merchantOwnerId = await ctx.db.insert('users', {
      name: 'Merchant M5', email: 'merchant.m5@example.com', passwordHash: 'test', role: 'merchant', status: 'active', createdAt: now,
    })
    const merchantId = await ctx.db.insert('merchants', {
      ownerId: merchantOwnerId, name: 'Dapur M5', address: 'Jl. Pemuda, Semarang', latitude: -6.98, longitude: 110.41, verificationStatus: 'verified', createdAt: now,
    })
    const processorOwnerId = await ctx.db.insert('users', {
      name: 'Processor M5', email: 'processor.m5@example.com', passwordHash: 'test', role: 'processor', status: 'active', createdAt: now,
    })
    const otherOwnerId = await ctx.db.insert('users', {
      name: 'Processor Lain M5', email: 'processor.other.m5@example.com', passwordHash: 'test', role: 'processor', status: 'active', createdAt: now,
    })
    const processorId = await ctx.db.insert('processors', {
      ownerId: processorOwnerId, name: 'Kompos M5', facilityType: 'composting', latitude: -6.98, longitude: 110.41,
      acceptedMaterialTypes: ['bakery'], dailyCapacityGrams: 2_000, maxPickupRadiusMeters: 10_000,
      outputTypes: ['compost'], verificationStatus: 'verified', createdAt: now,
    })
    const otherProcessorId = await ctx.db.insert('processors', {
      ownerId: otherOwnerId, name: 'Kompos Lain M5', facilityType: 'composting', latitude: -6.99, longitude: 110.42,
      acceptedMaterialTypes: ['bakery'], dailyCapacityGrams: 2_000, maxPickupRadiusMeters: 10_000,
      outputTypes: ['compost'], verificationStatus: 'verified', createdAt: now,
    })
    await Promise.all([
      ctx.db.insert('sessions', { userId: processorOwnerId, tokenHash: await hashSessionToken(processorToken), expiresAt: now + HOUR_MS, createdAt: now }),
      ctx.db.insert('sessions', { userId: otherOwnerId, tokenHash: await hashSessionToken(otherToken), expiresAt: now + HOUR_MS, createdAt: now }),
    ])
    const itemId = await ctx.db.insert('surplusItems', {
      merchantId, name: 'Roti M5', originalPrice: 20_000, floorPrice: 8_000, currentPrice: 10_000,
      initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 500,
      pickupStartAt: now - HOUR_MS, pickupEndAt: now - 1, materialType: 'bakery', dietaryTags: [],
      processingOnly: false, status: 'recovery_pending', createdAt: now,
    })
    const batchId = await ctx.db.insert('recoveryBatches', {
      merchantId, surplusItemId: itemId, processorId, offeredWeightGrams: 500, status: 'offered',
      offerExpiresAt: now + HOUR_MS, routingAttempts: 1, attemptedProcessorIds: [processorId], declinedByProcessorIds: [], createdAt: now,
    })
    const declineItemId = await ctx.db.insert('surplusItems', {
      merchantId, name: 'Roti Decline', originalPrice: 20_000, floorPrice: 8_000, currentPrice: 10_000,
      initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 300,
      pickupStartAt: now - HOUR_MS, pickupEndAt: now - 1, materialType: 'bakery', dietaryTags: [],
      processingOnly: false, status: 'recovery_pending', createdAt: now,
    })
    const declineBatchId = await ctx.db.insert('recoveryBatches', {
      merchantId, surplusItemId: declineItemId, processorId, offeredWeightGrams: 300, status: 'offered',
      offerExpiresAt: now + HOUR_MS, routingAttempts: 1, attemptedProcessorIds: [processorId], declinedByProcessorIds: [], createdAt: now,
    })
    return { processorId, otherProcessorId, batchId, itemId, declineBatchId }
  })

  expect(await t.query(api.recoveryBatches.listQueue, { sessionToken: processorToken, tab: 'offered' })).toHaveLength(2)
  expect(await t.query(api.recoveryBatches.listQueue, { sessionToken: otherToken, tab: 'offered' })).toHaveLength(0)
  await t.run((ctx) => ctx.db.patch(ids.processorId, { verificationStatus: 'pending' }))
  await expect(t.query(api.recoveryBatches.listQueue, { sessionToken: processorToken, tab: 'offered' })).rejects.toThrow('NOT_VERIFIED')
  await t.run((ctx) => ctx.db.patch(ids.processorId, { verificationStatus: 'verified' }))
  await expect(t.query(api.recoveryBatches.get, { sessionToken: otherToken, batchId: ids.batchId })).rejects.toThrow('FORBIDDEN')
  await expect(t.mutation(api.recoveryBatches.accept, { sessionToken: otherToken, batchId: ids.batchId })).rejects.toThrow('FORBIDDEN')

  await t.run((ctx) => ctx.db.patch(ids.batchId, { offerExpiresAt: now - 1 }))
  await expect(t.mutation(api.recoveryBatches.accept, { sessionToken: processorToken, batchId: ids.batchId })).rejects.toThrow('OFFER_EXPIRED')
  await t.run((ctx) => ctx.db.patch(ids.processorId, { acceptedMaterialTypes: ['protein'] }))
  await t.run((ctx) => ctx.db.patch(ids.batchId, { offerExpiresAt: Date.now() + HOUR_MS }))
  await expect(t.mutation(api.recoveryBatches.accept, { sessionToken: processorToken, batchId: ids.batchId })).rejects.toThrow('MATERIAL_TYPE_REJECTED')
  await t.run((ctx) => ctx.db.patch(ids.processorId, { acceptedMaterialTypes: ['bakery'], dailyCapacityGrams: 400 }))
  await expect(t.mutation(api.recoveryBatches.accept, { sessionToken: processorToken, batchId: ids.batchId })).rejects.toThrow('CAPACITY_EXCEEDED')
  await t.run((ctx) => ctx.db.patch(ids.processorId, { dailyCapacityGrams: 2_000 }))

  await t.mutation(api.recoveryBatches.accept, { sessionToken: processorToken, batchId: ids.batchId })
  await expect(t.mutation(api.recoveryBatches.accept, { sessionToken: processorToken, batchId: ids.batchId })).rejects.toThrow('INVALID_TRANSITION')
  for (const acceptedWeightGrams of [0, -1, 12.5, 751]) {
    await expect(t.mutation(api.recoveryBatches.logIntake, { sessionToken: processorToken, batchId: ids.batchId, acceptedWeightGrams })).rejects.toThrow('VALIDATION_FAILED')
  }
  await expect(t.mutation(api.recoveryBatches.logIntake, { sessionToken: processorToken, batchId: ids.batchId, acceptedWeightGrams: 450, collectedAt: Date.now() + HOUR_MS })).rejects.toThrow('VALIDATION_FAILED')
  const intake = await t.mutation(api.recoveryBatches.logIntake, { sessionToken: processorToken, batchId: ids.batchId, acceptedWeightGrams: 450 })
  expect(intake).toMatchObject({ declaredWeightGrams: 500, varianceGrams: -50, variancePercent: -10 })
  await expect(t.mutation(api.recoveryBatches.logIntake, { sessionToken: processorToken, batchId: ids.batchId, acceptedWeightGrams: 450 })).rejects.toThrow('INVALID_TRANSITION')

  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: 400, residualWeightGrams: 100,
  })).rejects.toThrow('VALIDATION_FAILED')
  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'biogas', outputWeightGrams: 300, residualWeightGrams: 50,
  })).rejects.toThrow('VALIDATION_FAILED')
  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: 300.5, residualWeightGrams: 50,
  })).rejects.toThrow('VALIDATION_FAILED')
  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: -1, residualWeightGrams: 50,
  })).rejects.toThrow('VALIDATION_FAILED')
  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: 300, residualWeightGrams: 50, completedAt: Date.now() + HOUR_MS,
  })).rejects.toThrow('VALIDATION_FAILED')
  const outcome = await t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: 300, residualWeightGrams: 50,
  })
  expect(outcome).toEqual({ processLossGrams: 100, conversionRatePercent: 66.7 })
  expect(await t.query(api.recoveryBatches.listQueue, { sessionToken: processorToken, tab: 'collected' })).toMatchObject([{ _id: ids.batchId, status: 'processed' }])
  await expect(t.mutation(api.recoveryBatches.logOutcome, {
    sessionToken: processorToken, batchId: ids.batchId, outputType: 'compost', outputWeightGrams: 300, residualWeightGrams: 50,
  })).rejects.toThrow('INVALID_TRANSITION')
  expect(await t.run((ctx) => ctx.db.get(ids.itemId))).toMatchObject({ status: 'recovered' })

  await expect(t.mutation(api.recoveryBatches.decline, {
    sessionToken: processorToken, batchId: ids.declineBatchId, reason: 'invalid',
  })).rejects.toThrow('VALIDATION_FAILED')
  await t.mutation(api.recoveryBatches.decline, {
    sessionToken: processorToken, batchId: ids.declineBatchId, reason: 'capacity', note: 'Kapasitas penuh',
  })
  const declined = await t.run((ctx) => ctx.db.get(ids.declineBatchId))
  expect(declined).toMatchObject({ processorId: ids.otherProcessorId, status: 'offered', declinedByProcessorIds: [ids.processorId] })
  const events = await t.run((ctx) => ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', ids.itemId)).collect())
  expect(events.filter((event) => event.eventType === 'INTAKE_ACCEPTED')).toMatchObject([{ weightDeltaGrams: 450 }])
  expect(events.filter((event) => event.eventType === 'PROCESSED')).toMatchObject([{ weightDeltaGrams: -450 }])
  const declineEvents = await t.run((ctx) => ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (q) => q.eq('surplusItemId', declined!.surplusItemId)).collect())
  expect(declineEvents.filter((event) => event.eventType === 'INTAKE_DECLINED')).toHaveLength(1)
  expect(declineEvents.find((event) => event.eventType === 'INTAKE_DECLINED')).toMatchObject({ weightDeltaGrams: 0 })
})

test('dua accept bersamaan tidak dapat melampaui kapasitas harian', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const token = 'c'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const merchantOwnerId = await ctx.db.insert('users', {
      name: 'Merchant Concurrency', email: 'merchant.concurrent@example.com', passwordHash: 'test', role: 'merchant', status: 'active', createdAt: now,
    })
    const merchantId = await ctx.db.insert('merchants', {
      ownerId: merchantOwnerId, name: 'Dapur Concurrent', address: 'Semarang', verificationStatus: 'verified', createdAt: now,
    })
    const ownerId = await ctx.db.insert('users', {
      name: 'Processor Concurrent', email: 'processor.concurrent@example.com', passwordHash: 'test', role: 'processor', status: 'active', createdAt: now,
    })
    const processorId = await ctx.db.insert('processors', {
      ownerId, name: 'Kompos Concurrent', facilityType: 'composting', acceptedMaterialTypes: ['bakery'],
      dailyCapacityGrams: 1_000, outputTypes: ['compost'], verificationStatus: 'verified', createdAt: now,
    })
    await ctx.db.insert('sessions', { userId: ownerId, tokenHash: await hashSessionToken(token), expiresAt: now + HOUR_MS, createdAt: now })
    const batchIds = []
    for (const name of ['Batch A', 'Batch B']) {
      const surplusItemId = await ctx.db.insert('surplusItems', {
        merchantId, name, originalPrice: 20_000, floorPrice: 8_000, currentPrice: 10_000,
        initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 600,
        pickupStartAt: now - HOUR_MS, pickupEndAt: now - 1, materialType: 'bakery', dietaryTags: [],
        processingOnly: false, status: 'recovery_pending', createdAt: now,
      })
      batchIds.push(await ctx.db.insert('recoveryBatches', {
        merchantId, surplusItemId, processorId, offeredWeightGrams: 600, status: 'offered',
        offerExpiresAt: now + HOUR_MS, routingAttempts: 1, attemptedProcessorIds: [processorId], declinedByProcessorIds: [], createdAt: now,
      }))
    }
    return batchIds
  })

  const results = await Promise.allSettled(ids.map((batchId) =>
    t.mutation(api.recoveryBatches.accept, { sessionToken: token, batchId }),
  ))
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  const accepted = await t.run((ctx) => ctx.db.query('recoveryBatches').withIndex('by_status', (q) => q.eq('status', 'accepted')).collect())
  expect(accepted).toHaveLength(1)
})
