import { ArrowLeft, Check, Clock3, Copy, MapPin, Package } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyOrder,
  type ConsumerOrderDetail,
} from "@/features/orders/use-consumer-orders";
import { usePaymentHold } from "@/features/orders/use-payment-hold";
import {
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDate,
} from "@/lib/format";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-label="Memuat pesanan">
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

async function copyPickupCode(code: string) {
  if (!navigator.clipboard) {
    toast.error("Clipboard tidak tersedia. Salin kode secara manual.");
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Kode pickup disalin.");
  } catch {
    toast.error("Kode gagal disalin. Salin kode secara manual.");
  }
}

function PaymentPendingPanel({ order }: { order: ConsumerOrderDetail }) {
  const hold = usePaymentHold(order);
  const isOver = hold.isExpired;

  return (
    <section className="mb-6 rounded-xl border border-in-progress/30 bg-in-progress/10 p-5">
      <h2 className="font-semibold">
        {isOver ? "Waktu pembayaran habis" : "Menunggu pembayaran"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isOver
          ? "Reservasi sedang dilepas dan paketnya kembali ke stok."
          : "Pesanan ini belum dibayar. Kode pickup baru muncul setelah pembayaran terverifikasi."}
      </p>
      {!isOver && (
        <>
          <p
            className="mt-3 font-mono text-2xl font-semibold tabular-nums"
            aria-label={hold.label ?? undefined}
          >
            {hold.countdown}
          </p>
          <Button asChild className="mt-4 h-11 w-full sm:w-auto">
            <Link to={`/checkout/${order._id}`}>Bayar sekarang</Link>
          </Button>
        </>
      )}
    </section>
  );
}

function PickupCodePanel({ code }: { code: string }) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl bg-foreground text-background">
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <StatusBadge
            status="paid"
            className="border-background/20 bg-background/10 text-background"
          />
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
            Kode pickup
          </h2>
          <p className="mt-2 max-w-md text-sm text-background/70">
            Tunjukkan kode ini ke merchant saat mengambil. Jangan bagikan
            sebelum kamu tiba di lokasi.
          </p>
        </div>
        <div className="self-center rounded-xl bg-background px-6 py-5 text-center text-foreground">
          <p className="text-xs font-medium text-muted-foreground">KODE</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-[0.18em] tabular-nums">
            {code}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 min-h-11"
            onClick={() => void copyPickupCode(code)}
          >
            <Copy />
            Salin
          </Button>
        </div>
      </div>
    </section>
  );
}

function CompletedPanel({ order }: { order: ConsumerOrderDetail }) {
  return (
    <section className="mb-6 rounded-xl border border-rescued/30 bg-rescued/10 p-6 text-center">
      <span className="inline-grid size-12 place-items-center rounded-full bg-rescued/20">
        <Check className="size-6 text-foreground" />
      </span>
      <h2 className="mt-3 text-lg font-semibold">Sudah diambil</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {order.pickedUpAt
          ? `Diambil pada ${formatWibDate(order.pickedUpAt)}.`
          : "Pickup sudah dikonfirmasi merchant."}{" "}
        {formatKg(order.rescuedWeightGrams)} material tercatat sebagai Rescued.
      </p>
    </section>
  );
}

function NoShowRefundPanel({ order }: { order: ConsumerOrderDetail }) {
  const message = {
    pending: "Refund Sandbox sedang diproses. Status ini akan diperbarui otomatis.",
    succeeded: "Refund Sandbox telah berhasil diproses.",
    failed: "Refund Sandbox belum berhasil diproses. Tim Cirquo akan menindaklanjuti.",
  }[order.refundStatus ?? "pending"];

  return (
    <section
      role="status"
      aria-live="polite"
      className="mb-6 rounded-xl border border-in-progress/30 bg-in-progress/10 p-5"
    >
      <h2 className="font-semibold">Pickup tidak dilakukan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Window pickup telah berakhir sehingga pesanan tidak dapat diambil. {message}
      </p>
    </section>
  );
}

function OrderTimeline({ order }: { order: ConsumerOrderDetail }) {
  const steps = [
    { label: "Reservasi diterima", done: true, note: formatWibDate(order.createdAt) },
    {
      label: "Pembayaran terverifikasi",
      done: order.status === "paid" || order.status === "picked_up",
      note: "Diverifikasi server, bukan dari browser.",
    },
    {
      label: "Pickup selesai",
      done: order.status === "picked_up",
      note: order.pickedUpAt ? formatWibDate(order.pickedUpAt) : "Menunggu konfirmasi merchant.",
    },
  ];

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Status pesanan</h2>
      <ol className="mt-4">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
            <span
              className={`z-10 grid size-7 shrink-0 place-items-center rounded-full ${
                step.done
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.done ? (
                <Check className="size-4" />
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
            {index < steps.length - 1 && (
              <span
                className={`absolute left-3.5 top-7 h-full w-px ${
                  step.done ? "bg-primary/25" : "bg-border"
                }`}
              />
            )}
            <div className={step.done ? "" : "text-muted-foreground"}>
              <p className="text-sm font-medium">{step.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrderDetailContent() {
  const { id } = useParams();
  const order = useMyOrder(id);

  if (order === undefined) return <OrderDetailSkeleton />;

  // The server answers `null` for both a missing order and someone else's, so
  // this page cannot leak whether an order id exists.
  if (order === null) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Pesanan tidak ditemukan</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Pesanan ini tidak ada atau bukan milikmu.
        </p>
        <Button asChild className="mt-5">
          <Link to="/orders">Kembali ke pesanan</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/orders">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>

      <h1 className="sr-only">Detail pesanan {order.itemName}</h1>

      {order.status === "reserved" && <PaymentPendingPanel order={order} />}
      {order.status === "paid" && order.pickupCode && (
        <PickupCodePanel code={order.pickupCode} />
      )}
      {order.status === "picked_up" && <CompletedPanel order={order} />}
      {order.status === "expired" && order.refundStatus && (
        <NoShowRefundPanel order={order} />
      )}
      {(order.status === "cancelled" || (order.status === "expired" && !order.refundStatus)) && (
        <section className="mb-6 rounded-xl border bg-card p-5">
          <StatusBadge status={order.status} />
          <p className="mt-3 text-sm text-muted-foreground">
            Pesanan ini sudah ditutup, jadi tidak ada kode pickup untuk
            ditampilkan.
          </p>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex gap-4">
          <img
            src={
              order.imageUrl ??
              rescueItemImageForMaterialType(order.materialType)
            }
            alt=""
            className="size-20 rounded-lg bg-muted object-cover"
          />
          <div className="min-w-0">
            <h2 className="font-semibold">{order.itemName}</h2>
            <p className="text-sm text-muted-foreground">
              {order.merchantName} · {order.quantity} paket
            </p>
            <p className="mt-2 font-semibold tabular-nums">
              {formatIdr(order.totalPrice)}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
          <div className="flex gap-3 text-sm">
            <Clock3 className="size-5 shrink-0 text-primary" />
            <div>
              <dt className="font-medium">Waktu pickup</dt>
              <dd className="text-muted-foreground">
                {formatWibDate(order.pickupStartAt)},{" "}
                {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <MapPin className="size-5 shrink-0 text-primary" />
            <div>
              <dt className="font-medium">Lokasi merchant</dt>
              <dd className="text-muted-foreground">{order.merchantAddress}</dd>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <Package className="size-5 shrink-0 text-primary" />
            <div>
              <dt className="font-medium">Berat tercatat</dt>
              <dd className="text-muted-foreground">
                {formatKg(order.rescuedWeightGrams)} · dikunci saat reservasi
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <OrderTimeline order={order} />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <QueryErrorBoundary title="Detail pesanan tidak dapat dimuat">
      <OrderDetailContent />
    </QueryErrorBoundary>
  );
}
