import assert from "node:assert/strict";
import { suggestRescuePrice } from "../src/lib/pricing";

const bakeryAtOpening = suggestRescuePrice({
  originalPrice: 60_000,
  floorPrice: 15_000,
  pickupStartAt: 0,
  pickupEndAt: 3 * 60 * 60 * 1_000,
  now: 0,
  initialQuantity: 8,
  remainingQuantity: 8,
  materialType: "bakery",
});

assert.equal(bakeryAtOpening.suggestedPrice, 33_000);
assert.equal(bakeryAtOpening.breakdown.base, 0.45);
assert.deepEqual(
  suggestRescuePrice({
    originalPrice: 60_000,
    floorPrice: 15_000,
    pickupStartAt: 0,
    pickupEndAt: 3 * 60 * 60 * 1_000,
    now: 0,
    initialQuantity: 8,
    remainingQuantity: 8,
    materialType: "bakery",
  }),
  bakeryAtOpening,
);

const urgentBakery = suggestRescuePrice({
  originalPrice: 60_000,
  floorPrice: 15_000,
  pickupStartAt: 0,
  pickupEndAt: 3 * 60 * 60 * 1_000,
  now: 3 * 60 * 60 * 1_000,
  initialQuantity: 8,
  remainingQuantity: 8,
  materialType: "bakery",
});

assert.ok(urgentBakery.suggestedPrice < bakeryAtOpening.suggestedPrice);
assert.ok(urgentBakery.suggestedPrice >= 15_000);

const floorClamped = suggestRescuePrice({
  originalPrice: 20_000,
  floorPrice: 18_000,
  pickupStartAt: 0,
  pickupEndAt: 1,
  now: 1,
  initialQuantity: 10,
  remainingQuantity: 10,
  materialType: "prepared_food",
});

assert.equal(floorClamped.suggestedPrice, 18_000);
assert.equal(floorClamped.clampedByFloor, true);

console.log("pricing self-check passed");
