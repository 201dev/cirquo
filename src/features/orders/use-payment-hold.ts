import { useEffect, useState } from "react";
import {
  formatHoldCountdown,
  formatHoldCountdownLabel,
  holdRemainingMs,
  paymentHoldExpiresAt,
} from "@/lib/payment-hold";

type HoldSource = {
  status: string;
  paymentHoldExpiresAt?: number | null;
  createdAt: number;
};

/**
 * Ticks a reserved order's payment hold once per second and stops as soon as it
 * runs out. Only `reserved` orders hold anything, so anything else reports null
 * and never starts a timer.
 *
 * This mirrors the server-issued deadline; it does not decide the order's fate.
 * `orders.expireHold` is what actually releases the reservation, and the query
 * behind `order` will push that change through on its own.
 */
export function usePaymentHold(order: HoldSource | null | undefined) {
  const isReserved = order?.status === "reserved";
  const expiresAt = order && isReserved ? paymentHoldExpiresAt(order) : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expiresAt === null) return;

    setNow(Date.now());
    if (expiresAt <= Date.now()) return;

    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= expiresAt) window.clearInterval(timer);
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (expiresAt === null) {
    return { remainingMs: null, isExpired: false, countdown: null, label: null };
  }

  const remainingMs = holdRemainingMs(expiresAt, now);

  return {
    remainingMs,
    isExpired: remainingMs === 0,
    countdown: formatHoldCountdown(remainingMs),
    label: formatHoldCountdownLabel(remainingMs),
  };
}
