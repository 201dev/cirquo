/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { hashSessionToken } from "./lib/tokens";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const HOUR_MS = 60 * 60 * 1_000;

test("draft tidak menulis ledger, lalu publish menulis satu LISTED", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const sessionToken = "m".repeat(43);

  const { merchantId, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Merchant Terverifikasi",
      email: "merchant.m202@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });

    const merchantId = await ctx.db.insert("merchants", {
      ownerId: userId,
      name: "Roti Semarang",
      address: "Jl. Pandanaran, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });

    await ctx.db.insert("sessions", {
      userId,
      tokenHash: await hashSessionToken(sessionToken),
      expiresAt: now + HOUR_MS,
      createdAt: now,
    });

    return { merchantId, userId };
  });

  const draftId = await t.mutation(api.surplusItems.create, {
    name: "Roti Gandum",
    description: "Roti surplus hari ini.",
    originalPrice: 20_000,
    floorPrice: 8_000,
    currentPrice: 12_000,
    initialQuantity: 3,
    weightPerItemGrams: 450,
    pickupStartAt: now + HOUR_MS,
    pickupEndAt: now + 3 * HOUR_MS,
    materialType: "bakery",
    dietaryTags: ["vegetarian"],
    sessionToken,
  });

  const draftEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (index) =>
        index.eq("surplusItemId", draftId),
      )
      .collect(),
  );
  expect(draftEvents).toEqual([]);

  await t.mutation(api.surplusItems.publish, { id: draftId, sessionToken });

  const published = await t.run((ctx) => ctx.db.get(draftId));
  const publishedEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (index) =>
        index.eq("surplusItemId", draftId),
      )
      .collect(),
  );

  expect(published).toMatchObject({
    merchantId,
    status: "active",
    remainingQuantity: 3,
  });
  expect(publishedEvents).toHaveLength(1);
  expect(publishedEvents[0]).toMatchObject({
    eventType: "LISTED",
    weightDeltaGrams: 1_350,
    actorId: userId,
    actorRole: "merchant",
  });
  expect(JSON.parse(publishedEvents[0].metadata ?? "{}")).toMatchObject({
    originalPrice: 20_000,
    currentPrice: 12_000,
    floorPrice: 8_000,
    materialType: "bakery",
    initialQuantity: 3,
    weightPerItemGrams: 450,
    pickupStartAt: now + HOUR_MS,
    pickupEndAt: now + 3 * HOUR_MS,
    processingOnly: false,
  });

  await expect(
    t.mutation(api.surplusItems.publish, { id: draftId, sessionToken }),
  ).rejects.toThrow("Hanya draft yang dapat di-publish");

  const eventsAfterRetry = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (index) =>
        index.eq("surplusItemId", draftId),
      )
      .collect(),
  );
  expect(eventsAfterRetry).toHaveLength(1);

  await expect(
    t.mutation(api.surplusItems.create, {
      name: "Harga tidak valid",
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 20_000,
      initialQuantity: 1,
      weightPerItemGrams: 450,
      pickupStartAt: now + HOUR_MS,
      pickupEndAt: now + 3 * HOUR_MS,
      materialType: "bakery",
      dietaryTags: [],
      sessionToken,
    }),
  ).rejects.toThrow('"code":"PRICE_ABOVE_ORIGINAL","field":"currentPrice"');
});

test("Merchant yang belum terverifikasi tidak dapat membuat Rescue Item", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const sessionToken = "p".repeat(43);

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Merchant Pending",
      email: "merchant.pending.m202@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });

    await ctx.db.insert("merchants", {
      ownerId: userId,
      name: "Roti Pending",
      address: "Jl. Pemuda, Semarang",
      verificationStatus: "pending",
      createdAt: now,
    });

    await ctx.db.insert("sessions", {
      userId,
      tokenHash: await hashSessionToken(sessionToken),
      expiresAt: now + HOUR_MS,
      createdAt: now,
    });
  });

  await expect(
    t.mutation(api.surplusItems.create, {
      name: "Roti Pending",
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 12_000,
      initialQuantity: 1,
      weightPerItemGrams: 450,
      pickupStartAt: now + HOUR_MS,
      pickupEndAt: now + 3 * HOUR_MS,
      materialType: "bakery",
      dietaryTags: [],
      sessionToken,
    }),
  ).rejects.toThrow("Profil Merchant belum terverifikasi");
});

test("edit dan cancel menjaga lock reservasi serta Material Flow Ledger", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const sessionToken = "e".repeat(43);

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Merchant Editor",
      email: "merchant.editor.m203@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });

    await ctx.db.insert("merchants", {
      ownerId: userId,
      name: "Roti Editor",
      address: "Jl. Gajah Mada, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });

    await ctx.db.insert("sessions", {
      userId,
      tokenHash: await hashSessionToken(sessionToken),
      expiresAt: now + HOUR_MS,
      createdAt: now,
    });
  });

  const createArgs = {
    name: "Roti M2-03",
    originalPrice: 20_000,
    floorPrice: 8_000,
    currentPrice: 12_000,
    initialQuantity: 3,
    weightPerItemGrams: 450,
    pickupStartAt: now + HOUR_MS,
    pickupEndAt: now + 3 * HOUR_MS,
    materialType: "bakery" as const,
    dietaryTags: [],
    sessionToken,
  };

  const draftId = await t.mutation(api.surplusItems.create, createArgs);
  await t.mutation(api.surplusItems.update, {
    id: draftId,
    name: "Roti M2-03 diperbarui",
    sessionToken,
  });
  expect(await t.run((ctx) => ctx.db.get(draftId))).toMatchObject({
    name: "Roti M2-03 diperbarui",
  });

  await expect(
    t.mutation(api.surplusItems.update, { id: draftId, sessionToken }),
  ).rejects.toThrow("EMPTY_UPDATE");
  await expect(
    t.mutation(api.surplusItems.update, {
      id: draftId,
      floorPrice: 9_000,
      sessionToken,
    }),
  ).rejects.toThrow("Floor price hanya boleh diturunkan");

  await t.mutation(api.surplusItems.cancel, { id: draftId, sessionToken });
  expect(await t.run((ctx) => ctx.db.get(draftId))).toMatchObject({
    status: "closed",
  });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("materialFlowLedger")
        .withIndex("by_rescue_item", (index) =>
          index.eq("surplusItemId", draftId),
        )
        .collect(),
    ),
  ).toEqual([]);

  const activeId = await t.mutation(api.surplusItems.create, createArgs);
  await t.mutation(api.surplusItems.publish, { id: activeId, sessionToken });
  await t.mutation(api.surplusItems.update, {
    id: activeId,
    currentPrice: 11_000,
    sessionToken,
  });
  await expect(
    t.mutation(api.surplusItems.update, {
      id: activeId,
      currentPrice: 7_000,
      sessionToken,
    }),
  ).rejects.toThrow('"code":"PRICE_BELOW_FLOOR","field":"currentPrice"');
  await expect(
    t.mutation(api.surplusItems.update, {
      id: activeId,
      pickupEndAt: now + 2 * HOUR_MS,
      sessionToken,
    }),
  ).rejects.toThrow("Waktu pickup hanya boleh diperpanjang");

  await t.mutation(api.surplusItems.cancel, { id: activeId, sessionToken });
  const activeEvents = await t.run((ctx) =>
    ctx.db
      .query("materialFlowLedger")
      .withIndex("by_rescue_item", (index) =>
        index.eq("surplusItemId", activeId),
      )
      .collect(),
  );
  expect(activeEvents).toMatchObject([
    { eventType: "LISTED", weightDeltaGrams: 1_350 },
    {
      eventType: "PRICE_ADJUSTED",
      weightDeltaGrams: 0,
      metadata: JSON.stringify({
        previousPrice: 12_000,
        newPrice: 11_000,
        floorPrice: 8_000,
        trigger: "merchant_edit",
      }),
    },
    { eventType: "CANCELLED", weightDeltaGrams: -1_350 },
  ]);

  const reservedId = await t.mutation(api.surplusItems.create, createArgs);
  await t.run((ctx) => ctx.db.patch(reservedId, { remainingQuantity: 2 }));
  await expect(
    t.mutation(api.surplusItems.update, {
      id: reservedId,
      name: "Tidak boleh diubah",
      sessionToken,
    }),
  ).rejects.toThrow("ALREADY_RESERVED");
  await expect(
    t.mutation(api.surplusItems.cancel, { id: reservedId, sessionToken }),
  ).rejects.toThrow("ALREADY_RESERVED");
});

test("listMine hanya mengembalikan Rescue Item milik Merchant pada sesi", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const merchantToken = "l".repeat(43);
  const otherMerchantToken = "o".repeat(43);

  const { merchantItemId, otherMerchantItemId } = await t.run(async (ctx) => {
    const merchantUserId = await ctx.db.insert("users", {
      name: "Merchant Pending",
      email: "merchant.listmine@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const otherMerchantUserId = await ctx.db.insert("users", {
      name: "Merchant Lain",
      email: "merchant.lain.listmine@example.com",
      passwordHash: "test-password-hash",
      role: "merchant",
      status: "active",
      createdAt: now,
    });
    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantUserId,
      name: "Roti Pending",
      address: "Jl. Pandanaran, Semarang",
      verificationStatus: "pending",
      createdAt: now,
    });
    const otherMerchantId = await ctx.db.insert("merchants", {
      ownerId: otherMerchantUserId,
      name: "Roti Lain",
      address: "Jl. Pemuda, Semarang",
      verificationStatus: "verified",
      createdAt: now,
    });

    await ctx.db.insert("sessions", {
      userId: merchantUserId,
      tokenHash: await hashSessionToken(merchantToken),
      expiresAt: now + HOUR_MS,
      createdAt: now,
    });
    await ctx.db.insert("sessions", {
      userId: otherMerchantUserId,
      tokenHash: await hashSessionToken(otherMerchantToken),
      expiresAt: now + HOUR_MS,
      createdAt: now,
    });

    const item = {
      originalPrice: 20_000,
      floorPrice: 8_000,
      currentPrice: 12_000,
      initialQuantity: 3,
      remainingQuantity: 3,
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

    const merchantItemId = await ctx.db.insert("surplusItems", {
      ...item,
      merchantId,
      name: "Roti Merchant Sendiri",
    });
    const otherMerchantItemId = await ctx.db.insert("surplusItems", {
      ...item,
      merchantId: otherMerchantId,
      name: "Roti Merchant Lain",
      processingOnly: true,
    });

    return { merchantItemId, otherMerchantItemId };
  });

  const merchantItems = await t.query(api.surplusItems.listMine, {
    sessionToken: merchantToken,
  });
  const otherMerchantItems = await t.query(api.surplusItems.listMine, {
    sessionToken: otherMerchantToken,
  });

  expect(merchantItems).toHaveLength(1);
  expect(merchantItems[0]).toMatchObject({
    _id: merchantItemId,
    name: "Roti Merchant Sendiri",
    currentPrice: 12_000,
    processingOnly: false,
  });
  expect(merchantItems.map((item) => item._id)).not.toContain(otherMerchantItemId);
  expect(otherMerchantItems.map((item) => item._id)).toEqual([otherMerchantItemId]);
});
