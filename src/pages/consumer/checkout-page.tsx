import { ArrowLeft, Clock, Loader2, MapPin, RotateCcw, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";
import { useMyOrder } from "@/features/orders/use-consumer-orders";
import { usePaymentHold } from "@/features/orders/use-payment-hold";
import { loadMidtransSnap, SnapUnavailableError } from "@/features/payments/midtrans-snap";
import { getErrorMessage } from "@/lib/errors";
import { formatIdr, formatPickupWindow, formatWibDate } from "@/lib/format";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

/**
 * A browser callback from Snap is never proof of payment. `awaiting_webhook` is
 * the furthest this page can get on its own: the order only becomes `paid` when
 * the verified Midtrans webhook says so, and the reactive query brings that in.
 */
type PaymentPhase =
  | "idle"
  | "preparing"
  | "open"
  | "awaiting_webhook"
  | "script_error";

const phaseMessages: Record<PaymentPhase, string> = {
  idle: "",
  preparing: "Menyiapkan pembayaran…",
  open: "Jendela pembayaran terbuka. Selesaikan pembayaran di sana.",
  awaiting_webhook:
    "Pembayaran diterima Midtrans. Menunggu verifikasi dari server — halaman ini akan berpindah sendiri.",
  script_error:
    "Sistem pembayaran gagal dimuat. Periksa koneksi, lalu coba lagi.",
};

export default function CheckoutPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const order = useMyOrder(orderId);
  const createTransaction = useAction(api.payments.createTransaction);
  const hold = usePaymentHold(order);

  const [phase, setPhase] = useState<PaymentPhase>("idle");

  // Reactive: the webhook flipping the order to paid is what moves the Consumer
  // on, not the Snap callback.
  useEffect(() => {
    if (!order) return;
    if (order.status === "paid" || order.status === "picked_up") {
      navigate(`/orders/${order._id}`, { replace: true });
    }
  }, [order, navigate]);

  if (order === undefined) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-4" aria-label="Memuat pesanan">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

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

  const isHoldOver = hold.isExpired || order.status === "expired";
  const isCancelled = order.status === "cancelled";
  const isClosed = isHoldOver || isCancelled;
  const unitPrice = order.totalPrice / order.quantity;

  const handlePayment = async () => {
    if (isClosed) return;

    try {
      setPhase("preparing");
      const snap = await loadMidtransSnap();
      const { snapToken } = await createTransaction({
        orderId: order._id as Id<"orders">,
        sessionToken: sessionToken || undefined,
      });

      setPhase("open");
      snap.pay(snapToken, {
        onSuccess: () => setPhase("awaiting_webhook"),
        onPending: () => setPhase("awaiting_webhook"),
        onError: () => {
          setPhase("idle");
          toast.error("Pembayaran gagal. Coba metode lain.");
        },
        onClose: () =>
          setPhase((current) =>
            current === "awaiting_webhook" ? current : "idle",
          ),
      });
    } catch (error) {
      if (error instanceof SnapUnavailableError) {
        setPhase("script_error");
        return;
      }
      setPhase("idle");
      toast.error(getErrorMessage(error, "Gagal memulai pembayaran."));
    }
  };

  return (
    <div className="mx-auto max-w-md pb-28 sm:pb-0">
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2"
          aria-label="Kembali"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-semibold">Selesaikan pembayaran</h1>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {phaseMessages[phase]}
      </p>

      {isHoldOver ? (
        <section className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <h2 className="font-semibold text-destructive">
            Waktu pembayaran habis
          </h2>
          <p className="mt-1 text-sm text-destructive/85">
            Reservasi dilepas otomatis dan paketnya dikembalikan ke stok. Kamu
            bisa mencari Rescue Item lain.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/explore">Jelajah Rescue Item</Link>
          </Button>
        </section>
      ) : isCancelled ? (
        <section className="mb-6 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Pesanan dibatalkan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pesanan ini sudah tidak bisa dibayar.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/orders">Lihat pesanan lain</Link>
          </Button>
        </section>
      ) : (
        <section
          className="mb-6 flex items-start gap-3 rounded-xl border border-in-progress/30 bg-in-progress/10 p-4"
          aria-label="Batas waktu pembayaran"
        >
          <Clock className="mt-0.5 size-5 shrink-0 text-in-progress" />
          <div>
            <p className="text-sm font-medium">Selesaikan pembayaran dalam</p>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-wider">
              {hold.countdown ?? "--:--"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Setelah itu reservasi dilepas otomatis.
            </p>
          </div>
        </section>
      )}

      {phase === "script_error" && (
        <section className="mb-6 rounded-xl border border-destructive/30 bg-card p-4">
          <h2 className="font-semibold">Sistem pembayaran gagal dimuat</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {phaseMessages.script_error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setPhase("idle");
              void handlePayment();
            }}
          >
            <RotateCcw />
            Coba lagi
          </Button>
        </section>
      )}

      <div className="space-y-4">
        <section className="overflow-hidden rounded-xl border bg-card">
          <h2 className="flex items-center gap-2 border-b bg-muted/30 p-4 font-semibold">
            <Store className="size-4 text-muted-foreground" />
            {order.merchantName}
          </h2>
          <div className="flex gap-4 p-4">
            <img
              src={
                order.imageUrl ??
                rescueItemImageForMaterialType(order.materialType)
              }
              alt=""
              className="size-20 rounded-lg bg-muted object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium leading-tight">{order.itemName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.quantity} paket
              </p>
              <p className="mt-2 font-semibold">
                {formatIdr(order.totalPrice)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Informasi pengambilan</h2>
          <p className="flex gap-3 text-sm">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="block font-medium">Waktu pengambilan</strong>
              <span className="text-muted-foreground">
                {formatWibDate(order.pickupStartAt)},{" "}
                {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
              </span>
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="block font-medium">Lokasi merchant</strong>
              <span className="text-muted-foreground">
                {order.merchantAddress}
              </span>
            </span>
          </p>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">Rincian pembayaran</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Harga per paket</dt>
              <dd className="tabular-nums">{formatIdr(unitPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Jumlah</dt>
              <dd className="tabular-nums">×{order.quantity}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total tagihan</dt>
              <dd className="tabular-nums">{formatIdr(order.totalPrice)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Total ini dikunci server saat reservasi dan tidak berubah di
            halaman ini.
          </p>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[4.5rem] border-t bg-background p-4 sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-md">
          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={handlePayment}
            disabled={isClosed || phase !== "idle"}
          >
            {phase === "preparing" || phase === "awaiting_webhook" ? (
              <>
                <Loader2 className="animate-spin" />
                {phase === "preparing"
                  ? "Menyiapkan…"
                  : "Menunggu verifikasi…"}
              </>
            ) : isHoldOver ? (
              "Waktu habis"
            ) : isCancelled ? (
              "Pesanan dibatalkan"
            ) : phase === "open" ? (
              "Selesaikan di jendela pembayaran"
            ) : (
              `Bayar ${formatIdr(order.totalPrice)}`
            )}
          </Button>
          {phase === "awaiting_webhook" && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Kode pickup muncul setelah pembayaran terverifikasi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
