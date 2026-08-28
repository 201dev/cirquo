import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  isPublicDiscoveryItem,
  sortByDistanceThenUrgency,
  toRescueItemPreview,
} from "../src/lib/discovery";
import { calculateHaversineDistanceMeters } from "../src/lib/geo";

const now = Date.UTC(2026, 7, 27, 12);
const item = {
  status: "active",
  processingOnly: false,
  remainingQuantity: 1,
  pickupEndAt: now + 60_000,
};
const merchant = {
  verificationStatus: "verified",
  latitude: -6.9932,
  longitude: 110.4203,
};

test("jarak Haversine dan visibilitas discovery", () => {
  assert.equal(
    calculateHaversineDistanceMeters(
      merchant.latitude,
      merchant.longitude,
      merchant.latitude,
      merchant.longitude,
    ),
    0,
  );
  assert.ok(
    calculateHaversineDistanceMeters(-6.9932, 110.4203, -6.9895, 110.4229) > 0,
  );
  assert.equal(isPublicDiscoveryItem(item, merchant, now), true);

  for (const hiddenItem of [
    { ...item, status: "draft" },
    { ...item, processingOnly: true },
    { ...item, remainingQuantity: 0 },
    { ...item, pickupEndAt: now },
  ]) {
    assert.equal(isPublicDiscoveryItem(hiddenItem, merchant, now), false);
  }
  assert.equal(
    isPublicDiscoveryItem(item, { ...merchant, verificationStatus: "pending" }, now),
    false,
  );
});

test("discovery mengurutkan jarak lalu urgensi", () => {
  assert.deepEqual(
    sortByDistanceThenUrgency([
      { id: "later", distanceMeters: 1_000, pickupEndAt: now + 120_000 },
      { id: "nearer", distanceMeters: 500, pickupEndAt: now + 180_000 },
      { id: "sooner", distanceMeters: 1_000, pickupEndAt: now + 60_000 },
    ]).map((entry) => entry.id),
    ["nearer", "sooner", "later"],
  );
});

test("proyeksi kartu mempertahankan ID Convex dan waktu WIB", () => {
  const preview = toRescueItemPreview(
    {
      _id: "valid-convex-id",
      name: "Paket makan sore",
      materialType: "prepared_food",
      dietaryTags: ["Tanpa babi"],
      originalPrice: 30_000,
      currentPrice: 15_000,
      remainingQuantity: 2,
      weightPerItemGrams: 500,
      pickupStartAt: Date.UTC(2026, 7, 28, 10),
      pickupEndAt: Date.UTC(2026, 7, 28, 12),
      distanceMeters: 1_250,
      merchant: {
        name: "Dapur Tembalang",
        address: "Tembalang, Semarang",
      },
    },
    "fallback.webp",
  );

  assert.equal(preview.id, "valid-convex-id");
  assert.equal(preview.pickupWindow, "17.00-19.00 WIB");
  assert.equal(preview.distanceKm, 1.3);
  assert.equal(preview.image, "fallback.webp");
});
