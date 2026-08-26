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
  ).rejects.toThrow("Harga tidak memenuhi batasan");
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
