/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import { hashSessionToken } from './lib/tokens'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

test('Admin ledger is guarded, reconciled, paginated, and redacted', async () => {
  const t = convexTest(schema, modules)
  const now = Date.now()
  const adminToken = 'a'.repeat(43)
  const consumerToken = 'c'.repeat(43)
  const ids = await t.run(async (ctx) => {
    const [adminId, consumerId, merchantOwnerId] = await Promise.all([
      ctx.db.insert('users', { name: 'Admin', email: 'admin.ledger@example.com', passwordHash: 'hash', role: 'admin', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Consumer', email: 'consumer.ledger@example.com', passwordHash: 'hash', role: 'consumer', status: 'active', createdAt: now }),
      ctx.db.insert('users', { name: 'Merchant Owner', email: 'merchant.ledger@example.com', passwordHash: 'hash', role: 'merchant', status: 'active', createdAt: now }),
    ])
    await Promise.all([
      ctx.db.insert('sessions', { userId: adminId, tokenHash: await hashSessionToken(adminToken), expiresAt: now + 60_000, createdAt: now }),
      ctx.db.insert('sessions', { userId: consumerId, tokenHash: await hashSessionToken(consumerToken), expiresAt: now + 60_000, createdAt: now }),
    ])
    const merchantId = await ctx.db.insert('merchants', { ownerId: merchantOwnerId, name: 'Toko Audit', address: 'Semarang', verificationStatus: 'verified', createdAt: now })
    const itemId = await ctx.db.insert('surplusItems', {
      merchantId, name: 'Roti Audit', originalPrice: 10_000, floorPrice: 5_000, currentPrice: 8_000,
      initialQuantity: 1, remainingQuantity: 0, weightPerItemGrams: 500, pickupStartAt: now - 1_000,
      pickupEndAt: now + 1_000, materialType: 'bakery', dietaryTags: [], processingOnly: false, status: 'closed', createdAt: now,
    })
    const orderId = await ctx.db.insert('orders', { userId: consumerId, surplusItemId: itemId, quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000, rescuedWeightGrams: 500, pickupCode: '123456', status: 'picked_up', createdAt: now })
    const event = (eventType: 'LISTED' | 'PAID' | 'RESCUED', weightDeltaGrams: number, occurredAt: number, metadata?: Record<string, unknown>) => ctx.db.insert('materialFlowLedger', {
      surplusItemId: itemId, orderId: eventType === 'LISTED' ? undefined : orderId, eventType, weightDeltaGrams,
      actorId: eventType === 'RESCUED' ? merchantOwnerId : undefined, actorRole: eventType === 'RESCUED' ? 'merchant' as const : undefined,
      metadata: metadata ? JSON.stringify(metadata) : undefined, methodologyVersion: 'impact-v1', occurredAt,
    })
    await event('LISTED', 500, now)
    await event('PAID', 0, now + 1)
    await event('RESCUED', -500, now + 2, { quantity: 1, totalPrice: 8_000, originalPriceSnapshot: 10_000, pickupCode: '123456', nested: { sessionToken: 'secret' } })
    const incompleteItemId = await ctx.db.insert('surplusItems', {
      merchantId, name: 'Roti Tidak Lengkap', originalPrice: 10_000, floorPrice: 5_000, currentPrice: 8_000,
      initialQuantity: 1, remainingQuantity: 1, weightPerItemGrams: 500, pickupStartAt: now - 1_000,
      pickupEndAt: now + 1_000, materialType: 'bakery', dietaryTags: [], processingOnly: false, status: 'active', createdAt: now,
    })
    await ctx.db.insert('materialFlowLedger', {
      surplusItemId: incompleteItemId, eventType: 'RESCUED', weightDeltaGrams: -500,
      methodologyVersion: 'impact-v1', occurredAt: now + 3,
    })
    return { itemId, incompleteItemId }
  })

  const detail = await t.query(api.admin.getItemLedger, { sessionToken: adminToken, surplusItemId: ids.itemId })
  expect(detail?.issues).toEqual([])
  expect(JSON.stringify(detail?.events)).not.toContain('123456')
  expect(JSON.stringify(detail?.events)).not.toContain('secret')
  expect(JSON.stringify(detail?.events)).toContain('[DIHAPUS]')
  expect(await t.query(api.admin.checkWeightConservation, { sessionToken: adminToken })).toMatchObject({ checkedItems: 1, violations: [] })
  const completeness = await t.query(api.admin.checkLedgerCompleteness, { sessionToken: adminToken })
  expect(completeness.checkedItems).toBe(2)
  expect(completeness.violations.find((item) => item.surplusItemId === ids.incompleteItemId)?.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    'LISTED_COUNT', 'RESCUED_BEFORE_PAID', 'MALFORMED_RESCUED_METADATA',
  ]))
  const search = await t.query(api.admin.searchLedger, { sessionToken: adminToken, query: 'Toko Audit', paginationOpts: { numItems: 10, cursor: null } })
  expect(search.page.map((item) => item.surplusItemId)).toEqual(expect.arrayContaining([ids.itemId, ids.incompleteItemId]))
  const filteredSearch = await t.query(api.admin.searchLedger, {
    sessionToken: adminToken, eventType: 'RESCUED', fromAt: now + 2, toAt: now + 3,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(filteredSearch.page.map((item) => item.surplusItemId)).toEqual([ids.itemId])

  await expect(t.query(api.admin.getItemLedger, { sessionToken: consumerToken, surplusItemId: ids.itemId })).rejects.toThrow('FORBIDDEN')
  await expect(t.query(api.admin.checkWeightConservation, { sessionToken: consumerToken })).rejects.toThrow('FORBIDDEN')
  await expect(t.query(api.admin.checkLedgerCompleteness, { sessionToken: consumerToken })).rejects.toThrow('FORBIDDEN')
  await expect(t.query(api.admin.searchLedger, { sessionToken: consumerToken, paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow('FORBIDDEN')
})
