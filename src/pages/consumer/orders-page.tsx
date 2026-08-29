import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMyOrders,
  type ConsumerOrderSummary,
} from "@/features/orders/use-consumer-orders";
import { usePaymentHold } from "@/features/orders/use-payment-hold";
import { formatIdr, formatPickupWindow, formatWibDate } from "@/lib/format";
import { groupOrdersByActivity } from "@/lib/orders";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

function OrdersSkeleton() {
  return (
    <div className="space-y-4" aria-label="Memuat pesanan">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-xl border bg-card p-3"
        >
          <Skeleton className="aspect-square size-full rounded-lg" />
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyOrders({ message }: { message: string }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/explore">Jelajah Rescue Item</Link>
      </Button>
    </div>
  );
}

/**
 * A list card never shows a pickup code — `orders.listMine` does not return one.
 * The code lives only in the owned detail view, and only once payment is
 * verified.
 */
function OrderCard({ order }: { order: ConsumerOrderSummary }) {
  const hold = usePaymentHold(order);
  const needsPayment = order.status === "reserved" && !hold.isExpired;

  return (
    <article className="rounded-xl border bg-card p-3">
      <div className="grid grid-cols-[5.5rem_1fr] gap-4">
        <img
          src={
            order.imageUrl ?? rescueItemImageForMaterialType(order.materialType)
          }
          alt=""
          className="aspect-square size-full rounded-lg bg-muted object-cover"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-muted-foreground">
              {order.quantity} paket
            </span>
          </div>
          <h3 className="mt-2 truncate font-semibold">{order.itemName}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{order.merchantName}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" />
            {formatWibDate(order.pickupStartAt)},{" "}
            {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
          </p>
        </div>
      </div>

      {order.status === "reserved" && (
        <p className="mt-3 rounded-lg bg-in-progress/10 px-3 py-2 text-xs">
          {needsPayment ? (
            <>
              Belum dibayar · sisa waktu{" "}
              <span
                aria-label={hold.label ?? undefined}
                className="font-mono font-semibold tabular-nums"
              >
                {hold.countdown}
              </span>
            </>
          ) : (
            "Waktu pembayaran habis. Reservasi sedang dilepas."
          )}
        </p>
      )}

      {order.status === "expired" && order.refundStatus && (
        <p role="status" className="mt-3 rounded-lg bg-in-progress/10 px-3 py-2 text-xs">
          Pickup tidak dilakukan · {order.refundStatus === "succeeded"
            ? "refund Sandbox telah diproses."
            : order.refundStatus === "failed"
              ? "refund Sandbox perlu ditindaklanjuti."
              : "refund Sandbox sedang diproses."}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <p className="font-semibold tabular-nums">
          {formatIdr(order.totalPrice)}
        </p>
        {needsPayment ? (
          <Button asChild size="sm" className="min-h-11">
            <Link to={`/checkout/${order._id}`}>Bayar sekarang</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="min-h-11">
            <Link to={`/orders/${order._id}`}>
              Detail
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function OrdersContent() {
  const orders = useMyOrders();

  if (orders === undefined) return <OrdersSkeleton />;

  const { active, past } = groupOrdersByActivity(orders);

  return (
    <Tabs defaultValue="active">
      <TabsList className="mb-5 h-11">
        <TabsTrigger value="active" className="min-h-9">
          Aktif{active.length > 0 ? ` (${active.length})` : ""}
        </TabsTrigger>
        <TabsTrigger value="past" className="min-h-9">
          Riwayat
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="space-y-4">
        {active.length === 0 ? (
          <EmptyOrders message="Belum ada pesanan aktif." />
        ) : (
          active.map((order) => <OrderCard key={order._id} order={order} />)
        )}
      </TabsContent>
      <TabsContent value="past" className="space-y-4">
        {past.length === 0 ? (
          <EmptyOrders message="Riwayat pesananmu masih kosong." />
        ) : (
          past.map((order) => <OrderCard key={order._id} order={order} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Pesananmu"
        description="Bayar reservasi sebelum waktunya habis, lalu ambil langsung di merchant. Kode pickup ada di detail pesanan."
      />
      <QueryErrorBoundary title="Daftar pesanan tidak dapat dimuat">
        <OrdersContent />
      </QueryErrorBoundary>
    </>
  );
}
