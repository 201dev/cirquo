import { Bell, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import {
  useMyNotifications,
  type NotificationRow,
} from "@/features/notifications/use-unread-notifications";
import { getErrorMessage } from "@/lib/errors";
import { formatWibDateTime } from "@/lib/format";

function NotificationsContent() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const notifications = useMyNotifications();
  const markRead = useMutation(api.notifications.markRead);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!sessionToken) return null;

  if (notifications === undefined) {
    return (
      <div role="status" aria-label="Memuat notifikasi" className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
      >
        Belum ada notifikasi.
      </p>
    );
  }

  const unreadCount = notifications.filter(
    (notification) => notification.readAt === null,
  ).length;

  /**
   * Marking read must not swallow a failure: if the mutation rejects we say so
   * and stay put, rather than navigating away and leaving the badge stuck.
   */
  const open = async (notification: NotificationRow) => {
    setBusyId(notification._id);
    try {
      if (notification.readAt === null) {
        await markRead({ sessionToken, notificationId: notification._id });
      }
      if (notification.href) navigate(notification.href);
    } catch (error) {
      toast.error(getErrorMessage(error, "Notifikasi tidak dapat diperbarui."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p role="status" className="text-sm text-muted-foreground">
        {unreadCount === 0
          ? `${notifications.length} notifikasi, semuanya sudah dibaca.`
          : `${unreadCount} dari ${notifications.length} notifikasi belum dibaca.`}
      </p>
      {notifications.map((notification) => {
        const read = notification.readAt !== null;
        return (
          <article
            key={notification._id}
            className={`rounded-xl border p-4 ${read ? "bg-card" : "border-primary/40 bg-primary/5"}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                {read ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Bell className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">
                  {notification.title}
                  {read ? null : (
                    <span className="sr-only"> (belum dibaca)</span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {notification.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatWibDateTime(notification.visibleAt)}
                </p>
              </div>
              {notification.href || !read ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busyId === notification._id}
                  onClick={() => open(notification)}
                >
                  {notification.href ? "Buka" : "Tandai dibaca"}
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifikasi"
        description="Pembaruan lifecycle yang relevan untuk akunmu, tanpa pickup code atau data pembayaran privat."
      />
      <QueryErrorBoundary title="Notifikasi tidak dapat dimuat">
        <NotificationsContent />
      </QueryErrorBoundary>
    </>
  );
}
