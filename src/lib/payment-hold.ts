/**
 * Payment-hold arithmetic for reserved orders.
 *
 * Framework-agnostic on purpose: the countdown is the one piece of checkout
 * the UI must get right without asking the server every second, so it is kept
 * pure and covered by tests/payment-hold.test.ts.
 *
 * The frontend never decides that an order is paid or expired — it only mirrors
 * how much of the server-issued hold is left. `expireHold` on the backend is
 * the single authority that actually releases the reservation.
 */

export const PAYMENT_HOLD_MS = 15 * 60 * 1_000;

type HoldSource = {
  /** Absent on pre-M3 reservations; derived from createdAt in that case. */
  paymentHoldExpiresAt?: number | null;
  createdAt: number;
};

export function paymentHoldExpiresAt(order: HoldSource): number {
  return order.paymentHoldExpiresAt ?? order.createdAt + PAYMENT_HOLD_MS;
}

/** Milliseconds left on the hold, clamped so it never goes negative. */
export function holdRemainingMs(expiresAt: number, now: number): number {
  return Math.max(0, expiresAt - now);
}

export function isHoldExpired(expiresAt: number, now: number): boolean {
  return holdRemainingMs(expiresAt, now) === 0;
}

/**
 * "14:59" — rounds up so a live hold never reads 00:00 while it is still open.
 */
export function formatHoldCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Spoken form for assistive technology, announced at minute granularity so a
 * screen reader is not interrupted once per second.
 */
export function formatHoldCountdownLabel(remainingMs: number): string {
  if (remainingMs <= 0) return "Waktu pembayaran habis";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  return `Sisa waktu pembayaran sekitar ${totalMinutes} menit`;
}
