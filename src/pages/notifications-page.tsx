import { Bell, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { formatWibDateTime } from "@/lib/format";

function NotificationsContent() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.listMine, sessionToken ? { sessionToken } : "skip");
  const markRead = useMutation(api.notifications.markRead);
  if (!sessionToken) return null;
  if (notifications === undefined) return <div role="status" aria-label="Memuat notifikasi" className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>;
  if (notifications.length === 0) return <p role="status" className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>;
  const open = async (notification: typeof notifications[number]) => {
    await markRead({ sessionToken, notificationId: notification._id });
    if (notification.href) navigate(notification.href);
  };
  return <div className="space-y-3" aria-live="polite">{notifications.map((notification) => <article key={notification._id} className={`rounded-xl border p-4 ${notification.readAt ? "bg-card" : "border-primary/40 bg-primary/5"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{notification.readAt ? <CheckCircle2 className="size-5" /> : <Bell className="size-5" />}</span><div className="min-w-0 flex-1"><h2 className="font-semibold">{notification.title}</h2><p className="mt-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{formatWibDateTime(notification.visibleAt)}</p></div><Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => open(notification)}>{notification.href ? "Buka" : "Tandai dibaca"}</Button></div></article>)}</div>;
}

export default function NotificationsPage() {
  return <><PageHeader title="Notifikasi" description="Pembaruan lifecycle yang relevan untuk akunmu, tanpa pickup code atau data pembayaran privat." /><QueryErrorBoundary title="Notifikasi tidak dapat dimuat"><NotificationsContent /></QueryErrorBoundary></>;
}
