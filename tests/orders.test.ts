import assert from "node:assert/strict";
import { test } from "bun:test";
import { groupOrdersByActivity } from "../src/lib/orders";

test("riwayat pesanan memisahkan status aktif dari riwayat", () => {
  const grouped = groupOrdersByActivity([
    { id: "reserved", status: "reserved" },
    { id: "paid", status: "paid" },
    { id: "picked-up", status: "picked_up" },
    { id: "cancelled", status: "cancelled" },
    { id: "expired", status: "expired" },
  ]);

  assert.deepEqual(grouped.active.map((order) => order.id), ["reserved", "paid"]);
  assert.deepEqual(grouped.past.map((order) => order.id), [
    "picked-up",
    "cancelled",
    "expired",
  ]);
});
