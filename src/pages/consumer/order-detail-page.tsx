import { ArrowLeft, Check, Clock3, Copy, MapPin, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { formatIdr } from "@/constants/mock-data";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { sessionToken } = useAuth();
  const order = useQuery(api.orders.get, id && sessionToken ? { orderId: id as Id<"orders">, sessionToken } : "skip");

  if (order === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Pesanan tidak ditemukan</h1>
        <Button asChild className="mt-5">
          <Link to="/orders">Kembali ke pesanan</Link>
        </Button>
      </div>
    );
  }

  const pickupCode = order.pickupCode;

  async function copyPickupCode() {
    if (!pickupCode) return;
    
    if (!navigator.clipboard) {
      toast.error("Clipboard tidak tersedia. Salin kode secara manual.");
      return;
    }

    try {
      await navigator.clipboard.writeText(pickupCode);
      toast.success("Kode pickup disalin.");
    } catch {
      toast.error("Kode gagal disalin. Salin kode secara manual.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/orders">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>

      {order.status === "reserved" && (
        <div className="mb-6 rounded-2xl bg-yellow-50 border border-yellow-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-yellow-800">Menunggu Pembayaran</h2>
            <p className="text-sm text-yellow-700 mt-1">
              Selesaikan pembayaran Anda sebelum waktu habis.
            </p>
          </div>
          <Button asChild className="bg-yellow-600 hover:bg-yellow-700 shrink-0 w-full sm:w-auto">
            <Link to={`/checkout/${order._id}`}>
              Bayar Sekarang
            </Link>
          </Button>
        </div>
      )}

      {order.status === "paid" && pickupCode ? (
        <div className="overflow-hidden rounded-2xl bg-foreground text-background mb-6">
          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div>
              <StatusBadge
                status={order.status}
                className="border-background/20 bg-background/10 text-background"
              />
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
                Kode pickup
              </h1>
              <p className="mt-2 max-w-md text-sm text-background/65">
                Tunjukkan kode ini kepada merchant. Jangan bagikan sebelum kamu
                tiba di lokasi.
              </p>
            </div>
            <div className="self-center rounded-xl bg-background px-6 py-5 text-center text-foreground">
              <p className="text-xs font-medium text-muted-foreground">KODE</p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.18em]">
                {pickupCode}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={copyPickupCode}
              >
                <Copy />
                Salin
              </Button>
            </div>
          </div>
        </div>
      ) : order.status === "picked_up" ? (
        <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 p-6 flex items-center justify-center text-center">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-green-800">Pesanan Sudah Diambil</h2>
            <p className="text-sm text-green-700 mt-1">
              Terima kasih telah membantu mengurangi food waste!
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-xl bg-card p-5 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] sm:p-6">
        <div className="flex gap-4">
          <img
            src={order.image}
            alt=""
            className="size-20 rounded-lg object-cover bg-muted"
          />
          <div>
            <h2 className="font-semibold">{order.itemName}</h2>
            <p className="text-sm text-muted-foreground">
              {order.merchantName} · {order.quantity} paket
            </p>
            <p className="mt-2 font-semibold">{formatIdr(order.totalPrice)}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
          <p className="flex gap-3 text-sm">
            <Clock3 className="size-5 text-primary" />
            <span>
              <strong className="block">Waktu pickup</strong>
              <span className="text-muted-foreground">
                {order.pickupDate}, {order.pickupWindow}
              </span>
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <MapPin className="size-5 text-primary" />
            <span>
              <strong className="block">Lokasi merchant</strong>
              <span className="text-muted-foreground">
                {order.merchantAddress}
              </span>
            </span>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Status pesanan</h2>
        <ol className="mt-4 space-y-0">
          {[
            { label: "Reservasi diterima", done: true },
            { label: "Pembayaran terkonfirmasi", done: ["paid", "picked_up"].includes(order.status) },
            { label: "Pickup selesai", done: order.status === "picked_up" },
          ].map((step, index) => (
            <li key={step.label} className={`relative flex gap-4 pb-6 last:pb-0 ${!step.done ? 'opacity-50 grayscale' : ''}`}>
              <span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step.done ? <Check className="size-4" /> : <div className="size-2 rounded-full bg-current" />}
              </span>
              {index < 2 ? (
                <span className={`absolute left-3.5 top-7 h-full w-px ${step.done ? 'bg-primary/25' : 'bg-border'}`} />
              ) : null}
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                {step.done && index === 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Menunggu Anda menyelesaikan pembayaran
                  </p>
                )}
                {step.done && index === 1 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Siap diambil di lokasi merchant
                  </p>
                )}
                {step.done && index === 2 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Diambil pada {order.pickupDate}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
