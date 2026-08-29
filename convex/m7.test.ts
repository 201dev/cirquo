/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import { hashSessionToken } from './lib/tokens'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const HOUR = 60 * 60 * 1_000

test('M7 verifies partners, audits decisions, notifies owners, and blocks non-Admins', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const adminToken = 'a'.repeat(43)
  const merchantToken = 'm'.repeat(43)
  const processorToken = 'p'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const [adminId, merchantOwnerId, processorOwnerId, rejectedOwnerId] = await Promise.all([
      ctx.db.insert('users', { name: 'Admin', email: 'm7.admin@example.com', passwordHash: 'hash', role: 'admin', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Merchant', email: 'm7.merchant@example.com', passwordHash: 'hash', role: 'merchant', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Processor', email: 'm7.processor@example.com', passwordHash: 'hash', role: 'processor', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Merchant Ditolak', email: 'm7.rejected@example.com', passwordHash: 'hash', role: 'merchant', status: 'active', createdAt: now }),
    ])
    await Promise.all([
      ctx.db.insert('sessions', { userId: adminId, tokenHash: await hashSessionToken(adminToken), expiresAt: now + HOUR, createdAt: now }),
      ctx.db.insert('sessions', { userId: merchantOwnerId, tokenHash: await hashSessionToken(merchantToken), expiresAt: now + HOUR, createdAt: now }),
      ctx.db.insert('sessions', { userId: processorOwnerId, tokenHash: await hashSessionToken(processorToken), expiresAt: now + HOUR, createdAt: now }),
    ])
    const merchantId = await ctx.db.insert('merchants', { ownerId: merchantOwnerId, name: 'Toko M7', address: 'Semarang', city: 'Semarang', verificationStatus: 'pending', createdAt: now })
    const rejectedMerchantId = await ctx.db.insert('merchants', { ownerId: rejectedOwnerId, name: 'Toko Ditolak', address: 'Semarang', verificationStatus: 'pending', createdAt: now + 1 })
    const processorId = await ctx.db.insert('processors', {
      ownerId: processorOwnerId, name: 'Processor M7', facilityType: 'composting', city: 'Semarang', acceptedMaterialTypes: ['bakery'],
      dailyCapacityGrams: 10_000, maxPickupRadiusMeters: 10_000, outputTypes: ['compost'], operatingHoursStart: 480, operatingHoursEnd: 1_020,
      verificationStatus: 'pending', createdAt: now,
    })
    return { merchantId, processorId, rejectedMerchantId, merchantOwnerId, processorOwnerId, rejectedOwnerId }
  })

  expect(await t.query(api.admin.listPendingVerifications, { sessionToken: adminToken })).toHaveLength(3)
  await t.mutation(api.admin.verifyMerchant, { sessionToken: adminToken, merchantId: ids.merchantId })
  await t.mutation(api.admin.verifyProcessor, { sessionToken: adminToken, processorId: ids.processorId })
  await t.mutation(api.admin.rejectAccount, { sessionToken: adminToken, kind: 'merchant', entityId: ids.rejectedMerchantId, reason: 'Alamat usaha belum dapat diverifikasi.' })
  expect((await t.run((ctx) => ctx.db.get(ids.merchantId)))?.verificationStatus).toBe('verified')
  expect((await t.run((ctx) => ctx.db.get(ids.processorId)))?.verificationStatus).toBe('verified')
  expect((await t.run((ctx) => ctx.db.get(ids.rejectedMerchantId)))?.rejectionReason).toContain('Alamat usaha')
  expect((await t.run((ctx) => ctx.db.query('notifications').withIndex('by_user_and_visible_at', (index) => index.eq('userId', ids.processorOwnerId)).collect()))[0]?.type).toBe('account_verified')
  await expect(t.query(api.admin.listPendingVerifications, { sessionToken: merchantToken })).rejects.toThrow('FORBIDDEN')

  expect(await t.mutation(api.admin.suspendUser, { sessionToken: adminToken, userId: ids.processorOwnerId, suspend: true, reason: 'Dokumen operasional perlu ditinjau ulang.' })).toMatchObject({ status: 'suspended', sessionsRevoked: 1 })
  await expect(t.query(api.notifications.listMine, { sessionToken: processorToken })).rejects.toThrow('AUTH_REQUIRED')
  expect(await t.mutation(api.admin.suspendUser, { sessionToken: adminToken, userId: ids.processorOwnerId, suspend: false, reason: 'Peninjauan ulang telah selesai.' })).toMatchObject({ status: 'active' })
  expect((await t.run((ctx) => ctx.db.get(ids.processorId)))?.verificationStatus).toBe('pending')
  expect((await t.run((ctx) => ctx.db.query('adminActions').collect()))).toHaveLength(5)
})

test('M7 moderation preserves rescued material, refunds only open paid orders, and enforces notification ownership', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const adminToken = 'z'.repeat(43)
  const consumerToken = 'c'.repeat(43)
  const merchantToken = 'q'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const [adminId, merchantOwnerId, consumerId] = await Promise.all([
      ctx.db.insert('users', { name: 'Admin', email: 'moderation.admin@example.com', passwordHash: 'hash', role: 'admin', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Merchant', email: 'moderation.merchant@example.com', passwordHash: 'hash', role: 'merchant', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Consumer', email: 'moderation.consumer@example.com', passwordHash: 'hash', role: 'consumer', status: 'active', createdAt: now }),
    ])
    await Promise.all([
      ctx.db.insert('sessions', { userId: adminId, tokenHash: await hashSessionToken(adminToken), expiresAt: now + HOUR, createdAt: now }),
      ctx.db.insert('sessions', { userId: consumerId, tokenHash: await hashSessionToken(consumerToken), expiresAt: now + HOUR, createdAt: now }),
      ctx.db.insert('sessions', { userId: merchantOwnerId, tokenHash: await hashSessionToken(merchantToken), expiresAt: now + HOUR, createdAt: now }),
    ])
    const merchantId = await ctx.db.insert('merchants', { ownerId: merchantOwnerId, name: 'Toko Moderasi', address: 'Semarang', verificationStatus: 'verified', createdAt: now })
    const itemId = await ctx.db.insert('surplusItems', { merchantId, name: 'Roti Moderasi', originalPrice: 10_000, floorPrice: 5_000, currentPrice: 8_000, initialQuantity: 3, remainingQuantity: 1, weightPerItemGrams: 500, pickupStartAt: now - HOUR, pickupEndAt: now + HOUR, materialType: 'bakery', dietaryTags: [], processingOnly: false, status: 'active', publishedAt: now, createdAt: now })
    const pickedOrderId = await ctx.db.insert('orders', { userId: consumerId, surplusItemId: itemId, quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000, rescuedWeightGrams: 500, pickupCode: '111111', status: 'picked_up', createdAt: now })
    const paidOrderId = await ctx.db.insert('orders', { userId: consumerId, surplusItemId: itemId, quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000, rescuedWeightGrams: 500, pickupCode: '222222', status: 'paid', createdAt: now })
    await ctx.db.insert('payments', { orderId: paidOrderId, provider: 'midtrans', amount: 8_000, providerStatus: 'settlement', createdAt: now, updatedAt: now })
    const ledger = (eventType: 'LISTED' | 'PAID' | 'RESCUED', weightDeltaGrams: number, orderId?: typeof pickedOrderId, metadata?: Record<string, unknown>) => ctx.db.insert('materialFlowLedger', { surplusItemId: itemId, orderId, eventType, weightDeltaGrams, metadata: metadata ? JSON.stringify(metadata) : undefined, methodologyVersion: 'impact-v1', occurredAt: now })
    await ledger('LISTED', 1_500)
    await ledger('PAID', 0, pickedOrderId)
    await ledger('RESCUED', -500, pickedOrderId, { quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000 })
    await ledger('PAID', 0, paidOrderId)
    return { itemId, paidOrderId, pickedOrderId, consumerId, merchantOwnerId }
  })

  const result = await t.mutation(api.admin.moderateListing, { sessionToken: adminToken, surplusItemId: ids.itemId, reason: 'Deskripsi Rescue Item menyesatkan konsumen.' })
  expect(result).toMatchObject({ status: 'moderated', moderatedWeightGrams: 1_000, ordersRefunded: 1 })
  expect(await t.run((ctx) => ctx.db.get(ids.pickedOrderId))).toMatchObject({ status: 'picked_up' })
  expect(await t.run((ctx) => ctx.db.get(ids.paidOrderId))).toMatchObject({ status: 'expired' })
  expect(await t.run((ctx) => ctx.db.query('payments').withIndex('by_order', (index) => index.eq('orderId', ids.paidOrderId)).first())).toMatchObject({ refundStatus: 'pending' })
  const events = await t.run((ctx) => ctx.db.query('materialFlowLedger').withIndex('by_rescue_item', (index) => index.eq('surplusItemId', ids.itemId)).collect())
  expect(events.filter((event) => event.eventType === 'MODERATED')).toHaveLength(1)
  expect(events.reduce((sum, event) => sum + event.weightDeltaGrams, 0)).toBe(0)
  const mine = await t.query(api.notifications.listMine, { sessionToken: consumerToken })
  expect(JSON.stringify(mine)).not.toContain('222222')
  const notificationId = mine[0]!._id
  await t.mutation(api.notifications.markRead, { sessionToken: consumerToken, notificationId })
  await expect(t.mutation(api.notifications.markRead, { sessionToken: merchantToken, notificationId })).rejects.toThrow('NOT_FOUND')
})
