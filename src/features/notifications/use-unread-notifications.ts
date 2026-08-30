import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";

export type NotificationRow = FunctionReturnType<
  typeof api.notifications.listMine
>[number];

function useNotificationNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

/**
 * Reactive notification feed for the signed-in account, scoped server-side by
 * the session token.
 */
export function useMyNotifications() {
  const { sessionToken } = useAuth();
  const now = useNotificationNow();
  return useQuery(
    api.notifications.listMine,
    sessionToken ? { sessionToken, now } : "skip",
  );
}

/**
 * How many notifications are still unread, for the navigation badge. Uses the
 * exact same query and args as the notifications page so Convex serves both
 * from one subscription instead of opening a second one.
 *
 * Returns 0 while loading and when signed out — the badge must not flash a
 * count that a moment later turns out to be wrong.
 */
export function useUnreadNotificationCount(): number {
  const notifications = useMyNotifications();
  if (notifications === undefined) return 0;
  return notifications.reduce(
    (total, notification) => (notification.readAt === null ? total + 1 : total),
    0,
  );
}
