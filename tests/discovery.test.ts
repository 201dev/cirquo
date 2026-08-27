import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  isPublicDiscoveryItem,
  sortByDistanceThenUrgency,
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
