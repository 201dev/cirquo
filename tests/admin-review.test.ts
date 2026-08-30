import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  BUSINESS_TYPE_LABELS,
  FACILITY_TYPE_LABELS,
  REVIEW_REASON_MAX,
  REVIEW_REASON_MIN,
  formatWaitingTime,
  partnerTypeLabel,
  reviewReasonError,
  verificationNoteError,
} from "../src/lib/admin-review";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("review reason mirrors the server's 10-500 rule on the trimmed value", () => {
  assert.equal(reviewReasonError("Dokumen izin usaha tidak terbaca."), null);
  assert.equal(reviewReasonError("a".repeat(REVIEW_REASON_MIN)), null);
  assert.equal(reviewReasonError("a".repeat(REVIEW_REASON_MAX)), null);

  assert.notEqual(reviewReasonError(""), null);
  assert.notEqual(reviewReasonError("   "), null);
  assert.notEqual(reviewReasonError("a".repeat(REVIEW_REASON_MIN - 1)), null);
  assert.notEqual(reviewReasonError("a".repeat(REVIEW_REASON_MAX + 1)), null);
});

test("whitespace cannot buy the tenth character", () => {
  // 9 real characters padded to 12 must still fail, or the dialog would enable
  // a submit the mutation rejects.
  assert.notEqual(reviewReasonError("  abcdefghi  "), null);
  assert.equal(reviewReasonError("  abcdefghij  "), null);
});

test("verification note is optional but capped", () => {
  assert.equal(verificationNoteError(""), null);
  assert.equal(verificationNoteError("Sudah dicek via telepon."), null);
  assert.notEqual(verificationNoteError("a".repeat(501)), null);
});

test("partner type label names the business or facility, never invents one", () => {
  assert.equal(
    partnerTypeLabel({ kind: "merchant", businessType: "bakery", facilityType: null }),
    "Merchant · Toko roti",
  );
  assert.equal(
    partnerTypeLabel({ kind: "processor", businessType: null, facilityType: "bsf_farm" }),
    "Organic Processor · Peternakan BSF",
  );
  assert.equal(
    partnerTypeLabel({ kind: "merchant", businessType: null, facilityType: null }),
    "Merchant",
  );
  assert.equal(
    partnerTypeLabel({ kind: "processor", businessType: null, facilityType: "unknown" }),
    "Organic Processor",
  );
  // A merchant row must never borrow a facility label, or the queue would show
  // a composting site where a bakery applied.
  assert.equal(
    partnerTypeLabel({ kind: "merchant", businessType: null, facilityType: "composting" }),
    "Merchant",
  );
});

test("every schema enum value has a label", () => {
  for (const value of ["bakery", "restaurant", "cafe", "grocery", "catering", "warung", "other"]) {
    assert.ok(BUSINESS_TYPE_LABELS[value], `businessType ${value} needs a label`);
  }
  for (const value of ["bsf_farm", "composting", "biogas", "animal_feed"]) {
    assert.ok(FACILITY_TYPE_LABELS[value], `facilityType ${value} needs a label`);
  }
});

test("waiting time reads coarsely and never runs backwards", () => {
  const now = 1_700_000_000_000;
  assert.equal(formatWaitingTime(now, now), "baru saja");
  assert.equal(formatWaitingTime(now - 30_000, now), "baru saja");
  assert.equal(formatWaitingTime(now - 5 * MINUTE, now), "5 menit");
  assert.equal(formatWaitingTime(now - 59 * MINUTE, now), "59 menit");
  assert.equal(formatWaitingTime(now - 3 * HOUR, now), "3 jam");
  assert.equal(formatWaitingTime(now - 23 * HOUR, now), "23 jam");
  assert.equal(formatWaitingTime(now - 2 * DAY, now), "2 hari");
  assert.equal(formatWaitingTime(now - (3 * DAY + 4 * HOUR), now), "3 hari 4 jam");

  // A partner profile stamped in the future must not render "-5 menit".
  assert.equal(formatWaitingTime(now + 10 * MINUTE, now), "baru saja");
});
