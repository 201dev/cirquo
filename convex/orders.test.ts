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

test("merchant mengonfirmasi pickup sekali tanpa menerima kode dari antrean", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const merchantToken = "m".repeat(43);
  const adminToken = "a".repeat(43);
  const consumerToken = "c".repeat(43);

  const ids = await t.run(async (ctx) => {
    const merchantUserId = await ctx.db.insert("users", {
      name: "Merchant Pickup",
      email: "merchant.pickup.m401@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const otherMerchantUserId = await ctx.db.insert("users", {
      name: "Merchant Lain",
      email: "merchant.other.m401@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const adminUserId = await ctx.db.insert("users", {
      name: "Admin Pickup",
      email: "admin.pickup.m401@example.com",
      passwordHash: "test-password-hash",
      role: "admin",
      status: "active",
      createdAt: now,
    });
    const consumerId = await ctx.db.insert("users", {
      name: "Consumer Pickup",
      email: "consumer.pickup.m401@example.com",
      passwordHash: "test-password-hash",
      role: "consumer",
      status: "active",
      createdAt: now,
    });
    const [merchantId, otherMerchantId] = await Promise.all([
      ctx.db.insert("merchants", {
        ownerId: merchantUserId,
        name: "Dapur M4",
        address: "Jl. M4, Semarang",
        verificationStatus: "verified",
        createdAt: now,
      }),
      ctx.db.insert("merchants", {
        ownerId: otherMerchantUserId,
        name: "Dapur Lain",
        address: "Jl. Lain, Semarang",
        verificationStatus: "verified",
        createdAt: now,
      }),
    ]);
    await Promise.all([
      ctx.db.insert("sessions", {
        userId: merchantUserId,
        tokenHash: await hashSessionToken(merchantToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
      ctx.db.insert("sessions", {
        userId: adminUserId,
        tokenHash: await hashSessionToken(adminToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
      ctx.db.insert("sessions", {
        userId: consumerId,
        tokenHash: await hashSessionToken(consumerToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
    ]);

    const addItem = (ownerId: typeof merchantId, pickupStartAt: number, pickupEndAt: number) =>
      ctx.db.insert("surplusItems", {
        merchantId: ownerId,
        name: "Rescue Item M4",
        originalPrice: 20_000,
        floorPrice: 8_000,
        currentPrice: 12_000,
        initialQuantity: 1,
        remainingQuantity: 0,
        weightPerItemGrams: 500,
        pickupStartAt,
        pickupEndAt,
        materialType: "bakery" as const,
        dietaryTags: [],
        processingOnly: false,
        status: "sold_out" as const,
        publishedAt: now,
        createdAt: now,
      });
    const inWindowItemId = await addItem(merchantId, now - HOUR_MS, now + HOUR_MS);
    const unpaidItemId = await addItem(merchantId, now - HOUR_MS, now + HOUR_MS);
    const outsideWindowItemId = await addItem(merchantId, now - 3 * HOUR_MS, now - HOUR_MS);
    const otherItemId = await addItem(otherMerchantId, now - HOUR_MS, now + HOUR_MS);

    const addOrder = (surplusItemId: typeof inWindowItemId, status: "reserved" | "paid", pickupCode: string) =>
      ctx.db.insert("orders", {
        userId: consumerId,
        surplusItemId,
        quantity: 1,
        totalPrice: 12_000,
        rescuedWeightGrams: 500,
        pickupCode,
        status,
        createdAt: now,
      });

    return {
      inWindowOrderId: await addOrder(inWindowItemId, "paid", "123456"),
      unpaidOrderId: await addOrder(unpaidItemId, "reserved", "234567"),
      outsideWindowOrderId: await addOrder(outsideWindowItemId, "paid", "345678"),
      otherOrderId: await addOrder(otherItemId, "paid", "456789"),
      inWindowItemId,
    };
  });

  const queue = await t.query(api.orders.listForMerchant, { sessionToken: merchantToken });
  expect(queue.map((order) => order._id)).toEqual(
    expect.arrayContaining([ids.inWindowOrderId, ids.outsideWindowOrderId]),
  );
  expect(queue.map((order) => order._id)).not.toContain(ids.unpaidOrderId);
  expect(queue.map((order) => order._id)).not.toContain(ids.otherOrderId);
  expect(queue.every((order) => !("pickupCode" in order))).toBe(true);

  await expect(
    t.mutation(api.orders.confirmPickup, {
      orderId: ids.inWindowOrderId,
      pickupCode: "000000",
      sessionToken: merchantToken,
    }),
  ).rejects.toThrow("INVALID_PICKUP_CODE");
  await expect(
    t.mutation(api.orders.confirmPickup, {
      orderId: ids.otherOrderId,
      pickupCode: "456789",
      sessionToken: merchantToken,
    }),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    t.mutation(api.orders.confirmPickup, {
      orderId: ids.unpaidOrderId,
      pickupCode: "234567",
      sessionToken: merchantToken,
    }),
  ).rejects.toThrow("INVALID_TRANSITION");
  await expect(
    t.mutation(api.orders.confirmPickup, {
      orderId: ids.outsideWindowOrderId,
      pickupCode: "345678",
      sessionToken: merchantToken,
    }),
  ).rejects.toThrow("PICKUP_WINDOW_CLOSED");

  await t.mutation(api.orders.confirmPickup, {
    orderId: ids.inWindowOrderId,
    pickupCode: "123456",
    sessionToken: merchantToken,
  });
  expect(await t.run((ctx) => ctx.db.get(ids.inWindowOrderId))).toMatchObject({
    status: "picked_up",
  });
  expect(await t.run((ctx) => ctx.db.get(ids.inWindowItemId))).toMatchObject({
    status: "closed",
    remainingQuantity: 0,
  });
  const pickedUpDetail = await t.query(api.orders.get, {
    orderId: ids.inWindowOrderId,
    sessionToken: consumerToken,
  });
  expect(pickedUpDetail).toMatchObject({ status: "picked_up" });
  expect(pickedUpDetail?.pickupCode).toBeUndefined();
  let rescuedEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_order", (q) => q.eq("orderId", ids.inWindowOrderId))
      .collect(),
  );
  expect(rescuedEvents).toMatchObject([
    { eventType: "RESCUED", weightDeltaGrams: -500, actorRole: "merchant" },
  ]);

  await expect(
    t.mutation(api.orders.confirmPickup, {
      orderId: ids.inWindowOrderId,
      pickupCode: "123456",
      sessionToken: merchantToken,
    }),
  ).rejects.toThrow("INVALID_TRANSITION");
  rescuedEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_order", (q) => q.eq("orderId", ids.inWindowOrderId))
      .collect(),
  );
  expect(rescuedEvents).toHaveLength(1);

  await expect(
    t.mutation(api.orders.adminOverridePickup, {
      orderId: ids.outsideWindowOrderId,
      pickupCode: "345678",
      reason: " ",
      sessionToken: adminToken,
    }),
  ).rejects.toThrow("VALIDATION_FAILED");
  await t.mutation(api.orders.adminOverridePickup, {
    orderId: ids.outsideWindowOrderId,
    pickupCode: "345678",
    reason: "Konfirmasi serah terima terlambat tercatat.",
    sessionToken: adminToken,
  });
  const overrideEvent = (await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_order", (q) => q.eq("orderId", ids.outsideWindowOrderId))
      .unique(),
  ));
  expect(overrideEvent).toMatchObject({ eventType: "RESCUED", actorRole: "admin" });
  expect(JSON.parse(overrideEvent!.metadata!)).toMatchObject({
    adminOverride: true,
    overrideReason: "Konfirmasi serah terima terlambat tercatat.",
  });
});

test("expiry pickup membuat satu batch, menjaga hold M3, dan aman saat refund gagal", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const adminToken = "x".repeat(43);
  const consumerToken = "y".repeat(43);

  const ids = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      name: "Admin Expiry",
      email: "admin.expiry.m402@example.com",
      passwordHash: "test-password-hash",
      role: "admin",
      status: "active",
      createdAt: now,
    });
    const consumerId = await ctx.db.insert("users", {
      name: "Consumer No Show",
      email: "consumer.expiry.m402@example.com",
      passwordHash: "test-password-hash",
      role: "consumer",
      status: "active",
      createdAt: now,
    });
    const merchantOwnerId = await ctx.db.insert("users", {
      name: "Merchant Expiry",
      email: "merchant.expiry.m402@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantOwnerId,
      name: "Dapur Expiry",
      address: "Jl. Expiry, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });
    await Promise.all([
      ctx.db.insert("sessions", {
        userId: adminId,
        tokenHash: await hashSessionToken(adminToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
      ctx.db.insert("sessions", {
        userId: consumerId,
        tokenHash: await hashSessionToken(consumerToken),
        expiresAt: now + HOUR_MS,
        createdAt: now,
      }),
    ]);

    const item = {
      merchantId,
      name: "Rescue Item Expired",
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 12_000,
      pickupStartAt: now - 2 * HOUR_MS,
      pickupEndAt: now - HOUR_MS,
      materialType: "bakery" as const,
      dietaryTags: [],
      processingOnly: false,
      publishedAt: now - 3 * HOUR_MS,
      createdAt: now,
    };
    const expiredItemId = await ctx.db.insert("surplusItems", {
      ...item,
      initialQuantity: 3,
      remainingQuantity: 2,
      weightPerItemGrams: 500,
      status: "active",
    });
    const heldItemId = await ctx.db.insert("surplusItems", {
      ...item,
      name: "Rescue Item Hold",
      initialQuantity: 1,
      remainingQuantity: 0,
      weightPerItemGrams: 300,
      status: "sold_out",
    });
    const paidOrderId = await ctx.db.insert("orders", {
      userId: consumerId,
      surplusItemId: expiredItemId,
      quantity: 1,
      totalPrice: 12_000,
      // Deliberately differs from the live item weight: expiry must use this snapshot.
      rescuedWeightGrams: 450,
      pickupCode: "111111",
      status: "paid",
      createdAt: now - 2 * HOUR_MS,
    });
    const heldOrderId = await ctx.db.insert("orders", {
      userId: consumerId,
      surplusItemId: heldItemId,
      quantity: 1,
      totalPrice: 12_000,
      rescuedWeightGrams: 300,
      pickupCode: "222222",
      status: "reserved",
      paymentHoldExpiresAt: now - 1,
      createdAt: now - HOUR_MS,
    });
    await ctx.db.insert("payments", {
      orderId: paidOrderId,
      provider: "midtrans",
      amount: 12_000,
      providerStatus: "settlement",
      createdAt: now - 2 * HOUR_MS,
      updatedAt: now - 2 * HOUR_MS,
    });
    return { consumerId, expiredItemId, heldItemId, paidOrderId, heldOrderId };
  });

  await expect(
    t.mutation(api.surplusItems.triggerPickupWindowExpiry, { sessionToken: consumerToken }),
  ).rejects.toThrow("FORBIDDEN");
  expect(
    await t.mutation(api.surplusItems.triggerPickupWindowExpiry, { sessionToken: adminToken }),
  ).toMatchObject({ batchesCreated: 1, deferredHolds: 1, noShowsExpired: 1 });
  await t.mutation(internal.surplusItems.expirePickupWindows, {});

  expect(await t.run((ctx) => ctx.db.get(ids.expiredItemId))).toMatchObject({
    status: "recovery_pending",
    remainingQuantity: 2,
  });
  expect(await t.run((ctx) => ctx.db.get(ids.paidOrderId))).toMatchObject({ status: "expired" });
  const batch = await t.run((ctx) =>
    ctx.db.query("recoveryBatches").withIndex("by_item", (q) =>
      q.eq("surplusItemId", ids.expiredItemId),
    ).unique(),
  );
  expect(batch).toMatchObject({ offeredWeightGrams: 1_450, status: "pending" });
  const expiryEvents = await t.run((ctx) =>
    ctx.db.query("materialFlowLedger").withIndex("by_rescue_item", (q) =>
      q.eq("surplusItemId", ids.expiredItemId),
    ).collect(),
  );
  expect(expiryEvents.filter((event) => event.eventType === "EXPIRED")).toMatchObject([
    { recoveryBatchId: batch!._id, weightDeltaGrams: -1_450 },
  ]);
  expect(expiryEvents.filter((event) => event.orderId === ids.paidOrderId)).toMatchObject([
    { eventType: "CANCELLED", weightDeltaGrams: 0 },
  ]);

  const paymentBeforeFailure = await t.run((ctx) =>
    ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", ids.paidOrderId)).unique(),
  );
  expect(paymentBeforeFailure).toMatchObject({ refundStatus: "pending" });
  // This is the mutation called by the action when Midtrans rejects the refund.
  await t.mutation(internal.payments.completeSandboxRefund, {
    orderId: ids.paidOrderId,
    status: "failed",
    error: "Sandbox unavailable",
  });
  expect(await t.run((ctx) => ctx.db.get(ids.paidOrderId))).toMatchObject({ status: "expired" });
  expect(
    await t.run((ctx) =>
      ctx.db.query("materialFlowLedger").withIndex("by_rescue_item", (q) =>
        q.eq("surplusItemId", ids.expiredItemId),
      ).collect(),
    ),
  ).toHaveLength(expiryEvents.length);
  expect(
    await t.run((ctx) =>
      ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", ids.paidOrderId)).unique(),
    ),
  ).toMatchObject({ refundStatus: "failed", refundError: "Sandbox unavailable" });

  await t.mutation(internal.orders.expireHold, { orderId: ids.heldOrderId });
  await t.mutation(internal.orders.expireHold, { orderId: ids.heldOrderId });
  expect(await t.run((ctx) => ctx.db.get(ids.heldItemId))).toMatchObject({
    remainingQuantity: 1,
    status: "active",
  });
  const holdEvents = await t.run((ctx) =>
    ctx.db.query("materialFlowLedger").withIndex("by_order", (q) => q.eq("orderId", ids.heldOrderId)).collect(),
  );
  expect(holdEvents).toMatchObject([{ eventType: "CANCELLED", weightDeltaGrams: 0 }]);

  await t.mutation(internal.surplusItems.expirePickupWindows, {});
  await t.mutation(internal.surplusItems.expirePickupWindows, {});
  expect(
    await t.run((ctx) =>
      ctx.db.query("recoveryBatches").withIndex("by_item", (q) =>
        q.eq("surplusItemId", ids.heldItemId),
      ).collect(),
    ),
  ).toMatchObject([{ offeredWeightGrams: 300 }]);

  const lateHoldOrderId = await t.run((ctx) =>
    ctx.db.insert("orders", {
      userId: ids.consumerId,
      surplusItemId: ids.expiredItemId,
      quantity: 1,
      totalPrice: 12_000,
      rescuedWeightGrams: 500,
      pickupCode: "333333",
      status: "reserved",
      paymentHoldExpiresAt: now - 1,
      createdAt: now - HOUR_MS,
    }),
  );
  await t.mutation(internal.orders.expireHold, { orderId: lateHoldOrderId });
  expect(await t.run((ctx) => ctx.db.get(ids.expiredItemId))).toMatchObject({
    status: "recovery_pending",
    remainingQuantity: 2,
  });
  expect(await t.run((ctx) => ctx.db.get(lateHoldOrderId))).toMatchObject({ status: "reserved" });
});
