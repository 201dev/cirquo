/**
 * Order-status grouping. Kept out of the pages so the split between what still
 * needs the Consumer's attention and what is finished has one definition.
 */

export const ACTIVE_ORDER_STATUSES = ["reserved", "paid"] as const;
export const PAST_ORDER_STATUSES = [
  "picked_up",
  "cancelled",
  "expired",
] as const;

export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function groupOrdersByActivity<T extends { status: string }>(
  orders: readonly T[],
): { active: T[]; past: T[] } {
  const active: T[] = [];
  const past: T[] = [];
  for (const order of orders) {
    if (isActiveOrderStatus(order.status)) active.push(order);
    else past.push(order);
  }
  return { active, past };
}
