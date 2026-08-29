/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { internal } from './_generated/api'
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
