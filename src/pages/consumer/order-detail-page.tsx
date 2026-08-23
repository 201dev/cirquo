import { ArrowLeft, Check, Clock3, Copy, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { formatIdr, orders } from "@/constants/mock-data";

export default function OrderDetailPage() {
  const { id } = useParams();
  const order = orders.find((candidate) => candidate.id === id);
  if (!order)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Pesanan tidak ditemukan</h1>
        <Button asChild className="mt-5">
          <Link to="/orders">Kembali ke pesanan</Link>
        </Button>
      </div>
    );

  const pickupCode = order.pickupCode;

  async function copyPickupCode() {
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
      <div className="overflow-hidden rounded-2xl bg-foreground text-background">
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
              {order.pickupCode}
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
      <section className="mt-6 rounded-xl bg-card p-5 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] sm:p-6">
        <div className="flex gap-4">
          <img
            src={order.image}
            alt=""
            className="size-20 rounded-lg object-cover"
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
                {order.pickupWindow}
              </span>
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <MapPin className="size-5 text-primary" />
            <span>
              <strong className="block">Ambil sendiri</strong>
              <span className="text-muted-foreground">
                Lokasi merchant tersedia di detail item
              </span>
            </span>
          </p>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Status pesanan</h2>
        <ol className="mt-4 space-y-0">
          {[
            "Reservasi diterima",
            "Pembayaran terkonfirmasi",
            order.status === "picked_up"
              ? "Pickup selesai"
              : "Siap diambil di merchant",
          ].map((label, index) => (
            <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
              <span className="z-10 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-4" />
              </span>
              {index < 2 ? (
                <span className="absolute left-3.5 top-7 h-full w-px bg-primary/25" />
              ) : null}
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tercatat dalam alur demo Cirquo
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
