/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { hashSessionToken } from "./lib/tokens";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const HOUR_MS = 60 * 60 * 1_000;

test("reservasi unit terakhir dan retry idempoten tidak menggandakan stok atau ledger", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const consumerAToken = "a".repeat(43);
  const consumerBToken = "b".repeat(43);

  const { finalUnitItemId, replayItemId } = await t.run(async (ctx) => {
    const merchantUserId = await ctx.db.insert("users", {
      name: "Merchant Terverifikasi",
      email: "merchant.orders.m303@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantUserId,
      name: "Roti Semarang",
      address: "Jl. Pandanaran, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });

    const [consumerAId, consumerBId] = await Promise.all([
      ctx.db.insert("users", {
        name: "Consumer A",
        email: "consumer.a.m303@example.com",
        passwordHash: "test-password-hash",
        role: "consumer",
        status: "active",
        createdAt: now,
      }),
      ctx.db.insert("users", {
        name: "Consumer B",
        email: "consumer.b.m303@example.com",
        passwordHash: "test-password-hash",
        role: "consumer",
        status: "active",
        createdAt: now,
      }),
    ]);
    await Promise.all([
      ctx.db.insert("sessions", {
        userId: consumerAId,
        tokenHash: await hashSessionToken(consumerAToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
      ctx.db.insert("sessions", {
        userId: consumerBId,
        tokenHash: await hashSessionToken(consumerBToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
    ]);

    const item = {
      merchantId,
      name: "Roti Surplus",
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 12_000,
      weightPerItemGrams: 450,
      pickupStartAt: now + HOUR_MS,
      pickupEndAt: now + 3 * HOUR_MS,
      materialType: "bakery" as const,
      dietaryTags: [],
      processingOnly: false,
      status: "active" as const,
      publishedAt: now,
      createdAt: now,
    };
    const finalUnitItemId = await ctx.db.insert("surplusItems", {
      ...item,
      initialQuantity: 1,
      remainingQuantity: 1,
    });
    const replayItemId = await ctx.db.insert("surplusItems", {
      ...item,
      initialQuantity: 2,
      remainingQuantity: 2,
    });
    return { finalUnitItemId, replayItemId };
  });

  const finalUnitResults = await Promise.allSettled([
    t.mutation(api.orders.reserve, {
      surplusItemId: finalUnitItemId,
      quantity: 1,
      idempotencyKey: "final-unit-a",
      sessionToken: consumerAToken,
    }),
    t.mutation(api.orders.reserve, {
      surplusItemId: finalUnitItemId,
      quantity: 1,
      idempotencyKey: "final-unit-b",
      sessionToken: consumerBToken,
    }),
  ]);
  expect(finalUnitResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.get(finalUnitItemId))).toMatchObject({
    remainingQuantity: 0,
    status: "sold_out",
  });
  const finalUnitEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (q) => q.eq("surplusItemId", finalUnitItemId))
      .collect(),
  );
  expect(finalUnitEvents).toHaveLength(1);
  expect(finalUnitEvents[0]).toMatchObject({
    eventType: "RESERVED",
    weightDeltaGrams: 0,
  });

  const firstOrderId = await t.mutation(api.orders.reserve, {
    surplusItemId: replayItemId,
    quantity: 1,
    idempotencyKey: "retry-key",
    sessionToken: consumerAToken,
  });
  const retriedOrderId = await t.mutation(api.orders.reserve, {
    surplusItemId: replayItemId,
    quantity: 1,
    idempotencyKey: "retry-key",
    sessionToken: consumerAToken,
  });
  expect(retriedOrderId).toEqual(firstOrderId);
  expect(await t.run((ctx) => ctx.db.get(firstOrderId))).toMatchObject({
    totalPrice: 12_000,
    rescuedWeightGrams: 450,
  });
  const firstOrder = await t.run((ctx) => ctx.db.get(firstOrderId));
  expect(firstOrder?.pickupCode).toMatch(/^\d{6}$/);
  expect(firstOrder?.paymentHoldExpiresAt).toBe(firstOrder!.createdAt + 15 * 60 * 1_000);
  expect(await t.run((ctx) => ctx.db.get(replayItemId))).toMatchObject({
    remainingQuantity: 1,
  });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("materialFlowLedger")
        .withIndex("by_rescue_item", (q) => q.eq("surplusItemId", replayItemId))
        .collect(),
    ),
  ).toHaveLength(1);

  await expect(
    t.mutation(api.orders.reserve, {
      surplusItemId: replayItemId,
      quantity: 1,
      idempotencyKey: "another-key",
      sessionToken: consumerAToken,
    }),
  ).rejects.toThrow("ALREADY_RESERVED");
  await expect(
    t.mutation(api.orders.reserve, {
      surplusItemId: replayItemId,
      quantity: 1,
      idempotencyKey: "retry-key",
      sessionToken: consumerBToken,
    }),
  ).resolves.not.toEqual(firstOrderId);

  await t.run((ctx) =>
    ctx.db.patch(firstOrderId, { paymentHoldExpiresAt: Date.now() - 1 }),
  );
  await t.mutation(internal.orders.expireHold, { orderId: firstOrderId });
  await t.mutation(internal.orders.expireHold, { orderId: firstOrderId });

  expect(await t.run((ctx) => ctx.db.get(firstOrderId))).toMatchObject({
    status: "expired",
  });
  expect(await t.run((ctx) => ctx.db.get(replayItemId))).toMatchObject({
    remainingQuantity: 1,
    status: "active",
  });
  const replayEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (q) => q.eq("surplusItemId", replayItemId))
      .collect(),
  );
  expect(replayEvents.filter((event) => event.eventType === "CANCELLED")).toHaveLength(1);
  expect(replayEvents.find((event) => event.eventType === "CANCELLED")).toMatchObject({
    orderId: firstOrderId,
    weightDeltaGrams: 0,
  });
});

test("kode pickup tidak pernah ada di daftar pesanan dan hanya terbuka setelah pembayaran terverifikasi", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const ownerToken = "c".repeat(43);
  const strangerToken = "d".repeat(43);

  const itemId = await t.run(async (ctx) => {
    const merchantUserId = await ctx.db.insert("users", {
      name: "Merchant Kode",
      email: "merchant.orders.m306@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantUserId,
      name: "Dapur Tembalang",
      address: "Jl. Prof. Soedarto, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });

    for (const [name, email, token] of [
      ["Pemilik Pesanan", "owner.m306@example.com", ownerToken],
      ["Consumer Lain", "stranger.m306@example.com", strangerToken],
    ] as const) {
      const userId = await ctx.db.insert("users", {
        name,
        email,
        passwordHash: "test-password-hash",
        role: "consumer",
        status: "active",
        createdAt: now,
      });
      await ctx.db.insert("sessions", {
        userId,
        tokenHash: await hashSessionToken(token),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      });
    }

    return ctx.db.insert("surplusItems", {
      merchantId,
      name: "Nasi Kotak Surplus",
      originalPrice: 25_000,
      floorPrice: 9_000,
      currentPrice: 15_000,
      weightPerItemGrams: 600,
      pickupStartAt: now + HOUR_MS,
      pickupEndAt: now + 3 * HOUR_MS,
      materialType: "prepared_food" as const,
      dietaryTags: [],
      processingOnly: false,
      status: "active" as const,
      initialQuantity: 2,
      remainingQuantity: 2,
      publishedAt: now,
      createdAt: now,
    });
  });

  const orderId = await t.mutation(api.orders.reserve, {
    surplusItemId: itemId,
    quantity: 1,
    idempotencyKey: "pickup-code-visibility",
    sessionToken: ownerToken,
  });

  // The code exists in the database from the moment of reservation. Everything
  // below asserts that no read path hands it out early.
  expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({
    status: "reserved",
    pickupCode: expect.stringMatching(/^\d{6}$/),
  });

  const reservedList = await t.query(api.orders.listMine, {
    sessionToken: ownerToken,
  });
  expect(reservedList).toHaveLength(1);
  expect(Object.keys(reservedList[0])).not.toContain("pickupCode");

  const reservedDetail = await t.query(api.orders.get, {
    orderId,
    sessionToken: ownerToken,
  });
  expect(reservedDetail).toMatchObject({ status: "reserved" });
  expect(reservedDetail?.pickupCode).toBeUndefined();

  // Only the verified webhook flips an order to paid; simulate that write.
  await t.run((ctx) => ctx.db.patch(orderId, { status: "paid" }));

  const paidDetail = await t.query(api.orders.get, {
    orderId,
    sessionToken: ownerToken,
  });
  expect(paidDetail?.pickupCode).toMatch(/^\d{6}$/);

  // Paid or not, the list projection stays code-free.
  const paidList = await t.query(api.orders.listMine, {
    sessionToken: ownerToken,
  });
  expect(Object.keys(paidList[0])).not.toContain("pickupCode");

  // A non-owner gets the same answer as for an order that does not exist, so
  // the response cannot confirm that this order id is real.
  expect(
    await t.query(api.orders.get, { orderId, sessionToken: strangerToken }),
  ).toBeNull();
  expect(
    await t.query(api.orders.listMine, { sessionToken: strangerToken }),
  ).toHaveLength(0);
});
