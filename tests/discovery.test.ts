import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  groupByMerchant,
  isPublicDiscoveryItem,
  pickupMinutesLeft,
  pickupUrgencyLabel,
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
  assert.equal(preview.pickupEndAt, Date.UTC(2026, 7, 28, 12));
});

test("sisa waktu pickup dibulatkan ke atas dan berhenti di nol", () => {
  const endAt = Date.UTC(2026, 7, 28, 12);

  assert.equal(pickupMinutesLeft(endAt, endAt - 30 * 60_000), 30);
  assert.equal(pickupMinutesLeft(endAt, endAt - 1), 1);
  assert.equal(pickupMinutesLeft(endAt, endAt), 0);
  assert.equal(pickupMinutesLeft(endAt, endAt + 60 * 60_000), 0);
});

test("badge urgensi hanya muncul di jam terakhir sebelum window tutup", () => {
  const endAt = Date.UTC(2026, 7, 28, 12);

  assert.equal(pickupUrgencyLabel(endAt, endAt - 3 * 60 * 60_000), null);
  assert.equal(pickupUrgencyLabel(endAt, endAt - 60 * 60_000), null);
  assert.equal(pickupUrgencyLabel(endAt, endAt - 59 * 60_000), "59 mnt lagi");
  assert.equal(pickupUrgencyLabel(endAt, endAt - 60_000), "1 mnt lagi");
  assert.equal(pickupUrgencyLabel(endAt, endAt), "Tutup");
  assert.equal(pickupUrgencyLabel(endAt, endAt + 60_000), "Tutup");
});

test("merchant dikelompokkan dari itemnya: jarak terdekat, harga termurah, diskon terbaik", () => {
  const source = (
    id: string,
    overrides: Partial<{
      imageUrl: string;
      materialType: string;
      originalPrice: number;
      currentPrice: number;
      distanceMeters: number;
    }> = {},
  ) => ({
    imageUrl: undefined,
    materialType: "bakery",
    originalPrice: 20_000,
    currentPrice: 10_000,
    distanceMeters: 1_000,
    ...overrides,
    merchant: { _id: id, name: `Mitra ${id}`, address: `Jalan ${id}` },
  });

  const groups = groupByMerchant([
    source("far", { distanceMeters: 5_000 }),
    source("near", { distanceMeters: 900, currentPrice: 12_000, originalPrice: 20_000 }),
    source("near", { distanceMeters: 700, currentPrice: 8_000, originalPrice: 20_000, imageUrl: "photo.webp", materialType: "produce" }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.id),
    ["near", "far"],
  );

  const [nearest] = groups;
  assert.ok(nearest !== undefined);
  assert.equal(nearest.itemCount, 2);
  assert.equal(nearest.distanceMeters, 700);
  assert.equal(nearest.cheapestPrice, 8_000);
  assert.equal(nearest.bestDiscountPercent, 60);
  // The first item carried no photo, so the group adopts the one that has it —
  // along with the material type that resolves its fallback.
  assert.equal(nearest.imageUrl, "photo.webp");
  assert.equal(nearest.materialType, "produce");
  assert.equal(groups.at(-1)?.bestDiscountPercent, 50);
});

test("diskon dibulatkan ke bawah dan harga nol tidak memicu pembagian nol", () => {
  const [group] = groupByMerchant([
    {
      materialType: "mixed", originalPrice: 3, currentPrice: 2, distanceMeters: 10,
      merchant: { _id: "m", name: "Mitra", address: "Jalan" },
    },
    {
      materialType: "mixed", originalPrice: 0, currentPrice: 0, distanceMeters: 20,
      merchant: { _id: "m", name: "Mitra", address: "Jalan" },
    },
  ]);

  // 1/3 is 33.33%, never 34% — a rounded-up discount overstates the saving.
  assert.equal(group?.bestDiscountPercent, 33);
  assert.equal(group?.cheapestPrice, 0);
});
