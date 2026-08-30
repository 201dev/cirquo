import { cn } from "@/lib/utils";

/**
 * Unread notification count for navigation entries. Renders nothing at zero so
 * a quiet account carries no badge, and caps the display at 99+ so a long
 * backlog cannot stretch the sidebar.
 */
export function UnreadBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} notifikasi belum dibaca`}
      className={cn(
        "min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold text-primary-foreground tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
