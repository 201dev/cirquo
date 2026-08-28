import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  PAYMENT_HOLD_MS,
  formatHoldCountdown,
  formatHoldCountdownLabel,
  holdRemainingMs,
  isHoldExpired,
  paymentHoldExpiresAt,
} from "../src/lib/payment-hold";

const createdAt = Date.UTC(2026, 7, 28, 9, 0, 0);

test("deadline hold diambil dari server, dengan fallback untuk reservasi lama", () => {
  assert.equal(
    paymentHoldExpiresAt({ createdAt, paymentHoldExpiresAt: createdAt + 60_000 }),
    createdAt + 60_000,
  );
  assert.equal(
    paymentHoldExpiresAt({ createdAt }),
    createdAt + PAYMENT_HOLD_MS,
  );
});

test("sisa waktu hold berhenti di nol dan tidak pernah negatif", () => {
  const expiresAt = createdAt + PAYMENT_HOLD_MS;

  assert.equal(holdRemainingMs(expiresAt, createdAt), PAYMENT_HOLD_MS);
  assert.equal(holdRemainingMs(expiresAt, expiresAt - 1), 1);
  assert.equal(holdRemainingMs(expiresAt, expiresAt), 0);
  assert.equal(holdRemainingMs(expiresAt, expiresAt + 60_000), 0);
});

test("hold dinyatakan habis tepat pada deadline, bukan sesudahnya", () => {
  const expiresAt = createdAt + PAYMENT_HOLD_MS;

  assert.equal(isHoldExpired(expiresAt, expiresAt - 1), false);
  assert.equal(isHoldExpired(expiresAt, expiresAt), true);
  assert.equal(isHoldExpired(expiresAt, expiresAt + 1), true);
});

test("hitung mundur dibulatkan ke atas agar tidak pernah menampilkan 00.00 saat masih hidup", () => {
  assert.equal(formatHoldCountdown(PAYMENT_HOLD_MS), "15:00");
  assert.equal(formatHoldCountdown(61_000), "01:01");
  assert.equal(formatHoldCountdown(59_400), "01:00");
  assert.equal(formatHoldCountdown(1), "00:01");
  assert.equal(formatHoldCountdown(0), "00:00");
  assert.equal(formatHoldCountdown(-5_000), "00:00");
});

test("label untuk pembaca layar diucapkan per menit dan menyatakan habis", () => {
  assert.equal(
    formatHoldCountdownLabel(PAYMENT_HOLD_MS),
    "Sisa waktu pembayaran sekitar 15 menit",
  );
  assert.equal(
    formatHoldCountdownLabel(61_000),
    "Sisa waktu pembayaran sekitar 2 menit",
  );
  assert.equal(formatHoldCountdownLabel(0), "Waktu pembayaran habis");
});
