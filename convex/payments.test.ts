/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import { isValidMidtransSignature } from "./lib/midtrans";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("webhook Midtrans memverifikasi signature, nominal, dan replay PAID", async () => {
  expect(
    await isValidMidtransSignature(
      "order-123",
      "200",
      "15000.00",
      "sandbox-key",
      "dadbd06c9776553355691a71cb914b23e2d1050164dc3744ed255f867323b5dd0e22dfec8b9f3b0a30ccff03422ac5b0feeb340fbbcb5e6a2b19d7bd522e96ed",
    ),
  ).toBe(true);
  expect(
    await isValidMidtransSignature("order-123", "200", "15000.00", "sandbox-key", "invalid"),
  ).toBe(false);

  const t = convexTest(schema, modules);
  const now = Date.now();
  const { orderId, secondOrderId } = await t.run(async (ctx) => {
    const consumerId = await ctx.db.insert("users", {
      name: "Consumer Pembayaran",
      email: "consumer.payments.m304@example.com",
      passwordHash: "test-password-hash",
      role: "consumer",
      status: "active",
      createdAt: now,
    });
    const merchantOwnerId = await ctx.db.insert("users", {
      name: "Merchant Pembayaran",
      email: "merchant.payments.m304@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantOwnerId,
      name: "Roti Semarang",
      address: "Jl. Pandanaran, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });
    const itemId = await ctx.db.insert("surplusItems", {
      merchantId,
      name: "Roti Surplus",
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 12_000,
      initialQuantity: 2,
      remainingQuantity: 0,
      weightPerItemGrams: 450,
      pickupStartAt: now,
      pickupEndAt: now + 60 * 60 * 1_000,
      materialType: "bakery",
      dietaryTags: [],
      processingOnly: false,
      status: "sold_out",
      publishedAt: now,
      createdAt: now,
    });
    const order = {
      userId: consumerId,
      surplusItemId: itemId,
      quantity: 1,
      totalPrice: 12_000,
      rescuedWeightGrams: 450,
      status: "reserved" as const,
      paymentHoldExpiresAt: now + 15 * 60 * 1_000,
      createdAt: now,
    };
    const orderId = await ctx.db.insert("orders", { ...order, pickupCode: "000001" });
    const secondOrderId = await ctx.db.insert("orders", { ...order, pickupCode: "000002" });
    return { orderId, secondOrderId };
  });

  const settlement = {
    grossAmount: "12000.00",
    transactionStatus: "settlement",
    paymentType: "qris",
    transactionId: "midtrans-txn-1",
    rawPayload: "{}",
  };
  await t.mutation(internal.http.handleWebhook, { orderId, ...settlement, grossAmount: "11999.00" });
  expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({ status: "reserved" });

  await t.mutation(internal.http.handleWebhook, { orderId, ...settlement });
  await t.mutation(internal.http.handleWebhook, { orderId, ...settlement });
  expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({ status: "paid" });
  expect(
    await t.run((ctx) =>
      ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).collect(),
    ),
  ).toHaveLength(1);
  const events = await t.run((ctx) =>
    ctx.db.query("materialFlowLedger").withIndex("by_order", (q) => q.eq("orderId", orderId)).collect(),
  );
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ eventType: "PAID", weightDeltaGrams: 0 });

  await t.mutation(internal.http.handleWebhook, { orderId: secondOrderId, ...settlement });
  expect(await t.run((ctx) => ctx.db.get(secondOrderId))).toMatchObject({ status: "reserved" });
});
