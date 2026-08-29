/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import { hashSessionToken } from './lib/tokens'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const HOUR_MS = 60 * 60 * 1_000

test('ringkasan impact membatasi bukti ledger ke pemilik peran yang benar', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const tokens = {
    consumer: 'c'.repeat(43), merchant: 'm'.repeat(43), processor: 'p'.repeat(43),
    admin: 'a'.repeat(43), otherMerchant: 'o'.repeat(43),
  }
  const ids = await t.run(async (ctx) => {
    const users = await Promise.all([
      ['Consumer', 'consumer.impact@example.com', 'consumer'],
      ['Merchant', 'merchant.impact@example.com', 'merchant'],
      ['Processor', 'processor.impact@example.com', 'processor'],
      ['Admin', 'admin.impact@example.com', 'admin'],
      ['Merchant Lain', 'other.impact@example.com', 'merchant'],
    ].map(([name, email, role]) => ctx.db.insert('users', {
      name, email, passwordHash: 'test', role: role as 'consumer' | 'merchant' | 'processor' | 'admin', status: 'active', createdAt: now,
    })))
    await Promise.all(Object.values(tokens).map(async (token, index) => ctx.db.insert('sessions', {
      userId: users[index]!, tokenHash: await hashSessionToken(token), expiresAt: now + HOUR_MS, createdAt: now,
    })))
    const [merchantId, otherMerchantId, processorId] = await Promise.all([
      ctx.db.insert('merchants', { ownerId: users[1]!, name: 'Merchant', address: 'Semarang', verificationStatus: 'verified', createdAt: now }),
      ctx.db.insert('merchants', { ownerId: users[4]!, name: 'Merchant Lain', address: 'Semarang', verificationStatus: 'verified', createdAt: now }),
      ctx.db.insert('processors', { ownerId: users[2]!, name: 'Processor', verificationStatus: 'verified', createdAt: now }),
    ])
    const item = {
      name: 'Roti impact', originalPrice: 12_000, floorPrice: 8_000, currentPrice: 8_000,
      initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 1_000,
      pickupStartAt: now - HOUR_MS, pickupEndAt: now, materialType: 'bakery' as const,
      dietaryTags: [], processingOnly: false, status: 'recovered' as const, createdAt: now,
    }
    const [itemId, otherItemId] = await Promise.all([
      ctx.db.insert('surplusItems', { ...item, merchantId }),
      ctx.db.insert('surplusItems', { ...item, merchantId: otherMerchantId, name: 'Roti lain' }),
    ])
    const orderId = await ctx.db.insert('orders', {
      userId: users[0]!, surplusItemId: itemId, quantity: 1, totalPrice: 8_000,
      originalPriceSnapshot: 12_000, rescuedWeightGrams: 200, pickupCode: '123456', status: 'picked_up', createdAt: now,
    })
    const batchId = await ctx.db.insert('recoveryBatches', {
      merchantId, surplusItemId: itemId, processorId, offeredWeightGrams: 800,
      status: 'processed', routingAttempts: 1, attemptedProcessorIds: [processorId], declinedByProcessorIds: [], createdAt: now,
    })
    const event = (input: {
      surplusItemId: typeof itemId
      eventType: 'LISTED' | 'RESCUED' | 'EXPIRED' | 'INTAKE_ACCEPTED' | 'PROCESSED'
      weightDeltaGrams: number
      orderId?: typeof orderId
      recoveryBatchId?: typeof batchId
      actorId?: typeof users[number]
      actorRole?: 'consumer' | 'merchant' | 'processor' | 'admin'
      metadata?: Record<string, unknown>
    }) => ctx.db.insert('materialFlowLedger', {
      ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      methodologyVersion: 'impact-v1', occurredAt: now,
    })
    await Promise.all([
      event({ surplusItemId: itemId, eventType: 'LISTED', weightDeltaGrams: 1_000, actorId: users[1], actorRole: 'merchant' }),
      event({ surplusItemId: itemId, orderId, eventType: 'RESCUED', weightDeltaGrams: -200, actorId: users[1], actorRole: 'merchant', metadata: { quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 12_000 } }),
      event({ surplusItemId: itemId, recoveryBatchId: batchId, eventType: 'EXPIRED', weightDeltaGrams: -800 }),
      event({ surplusItemId: itemId, recoveryBatchId: batchId, eventType: 'INTAKE_ACCEPTED', weightDeltaGrams: 800, actorId: users[2], actorRole: 'processor', metadata: { declaredWeightGrams: 800 } }),
      event({ surplusItemId: itemId, recoveryBatchId: batchId, eventType: 'PROCESSED', weightDeltaGrams: -800, actorId: users[2], actorRole: 'processor', metadata: { outputWeightGrams: 600, residualWeightGrams: 100 } }),
      event({ surplusItemId: otherItemId, eventType: 'LISTED', weightDeltaGrams: 500, actorId: users[4], actorRole: 'merchant' }),
    ])
    return { itemId, otherItemId }
  })

  expect(await t.query(api.impact.getConsumerSummary, { sessionToken: tokens.consumer })).toMatchObject({
    listedItemCount: 0, rescuedQuantity: 1, listedGrams: 0, rescuedGrams: 200, revenueRecoveredIdr: 8_000, consumerSavingsIdr: 4_000,
  })
  expect(await t.query(api.impact.getMerchantSummary, { sessionToken: tokens.merchant })).toMatchObject({
    listedItemCount: 1, rescuedQuantity: 1, listedGrams: 1_000, rescuedGrams: 200, recoveredGrams: 600, residualGrams: 100,
    processLossGrams: 100, inProgressGrams: 0, revenueRecoveredIdr: 8_000,
    conservation: { itemBalances: [{ surplusItemId: String(ids.itemId), balanceGrams: 0 }] },
  })
  expect(await t.query(api.impact.getMerchantSummary, { sessionToken: tokens.otherMerchant })).toMatchObject({
    listedGrams: 500, rescuedGrams: 0, recoveredGrams: 0,
  })
  expect(await t.query(api.impact.getProcessorSummary, { sessionToken: tokens.processor })).toMatchObject({
    listedGrams: 0, recoveredGrams: 600, residualGrams: 100, processLossGrams: 100,
  })
  expect(await t.query(api.impact.getPlatformSummary, { sessionToken: tokens.admin })).toMatchObject({
    listedGrams: 1_500, rescuedGrams: 200, recoveredGrams: 600, residualGrams: 100,
  })
  await expect(t.query(api.impact.getConsumerSummary, { sessionToken: tokens.merchant })).rejects.toThrow('FORBIDDEN')
})
