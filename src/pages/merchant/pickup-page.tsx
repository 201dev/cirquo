import { KeyRound, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { formatIdr, formatPickupWindow, formatWibDate } from "@/lib/format";
import { pickupCodeSchema } from "@/lib/validations";

export default function PickupPage() {
  const { sessionToken } = useAuth();
  const pendingPickups = useQuery(
    api.orders.listForMerchant,
    sessionToken ? { sessionToken } : "skip",
  );
  const confirmPickup = useMutation(api.orders.confirmPickup);
  const [orderId, setOrderId] = useState<Id<"orders"> | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedOrder = pendingPickups?.find((order) => order._id === orderId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = pickupCodeSchema.safeParse(code);
    if (!result.success) {
      setCodeError(result.error.issues[0]?.message ?? "Kode pickup tidak valid.");
      return;
    }
    if (!orderId || !sessionToken) {
      toast.error("Pilih pesanan yang akan dikonfirmasi.");
      return;
    }

    setCodeError(null);
    setIsSubmitting(true);
    try {
      await confirmPickup({ orderId, pickupCode: result.data, sessionToken });
      setOrderId(null);
      setCode("");
      toast.success("Pickup dikonfirmasi dan Rescue tercatat.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Pickup gagal dikonfirmasi."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Konfirmasi pickup"
        description="Masukkan kode yang ditunjukkan konsumen saat mereka tiba di merchant."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <h2 className="text-lg font-semibold">Menunggu pickup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih pesanan yang sudah dibayar. Kode hanya diverifikasi saat konsumen menunjukkannya.
          </p>
          <div className="mt-4 space-y-3">
            {pendingPickups === undefined ? (
              [0, 1].map((row) => <Skeleton key={row} className="h-28 w-full" />)
            ) : pendingPickups.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card px-5 py-12 text-center text-sm text-muted-foreground">
                Belum ada pesanan berbayar yang menunggu pickup.
              </div>
            ) : (
              pendingPickups.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setOrderId(order._id)}
                  className={`w-full rounded-xl border bg-card p-4 text-left transition-colors ${
                    orderId === order._id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{order.itemName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <UserRound className="size-4" />
                        {order.consumerName}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatIdr(order.totalPrice)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {order.quantity} paket · {formatWibDate(order.pickupStartAt)}, {" "}
                    {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
        <form onSubmit={submit} className="h-fit rounded-xl bg-card p-6 shadow-sm">
          <label htmlFor="pickup-code" className="text-sm font-medium">
            Kode pickup
          </label>
          <p className="mt-1 min-h-5 text-xs text-muted-foreground">
            {selectedOrder
              ? `${selectedOrder.itemName} · ${selectedOrder.consumerName}`
              : "Pilih pesanan dari antrean terlebih dahulu."}
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              id="pickup-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError(null);
              }}
              className="font-mono text-lg tracking-widest"
              placeholder="000000"
              autoComplete="off"
              inputMode="numeric"
              maxLength={6}
              aria-invalid={Boolean(codeError)}
              aria-describedby={codeError ? "pickup-code-error" : undefined}
            />
            <Button type="submit" disabled={!selectedOrder || isSubmitting}>
              <KeyRound />
              Konfirmasi
            </Button>
          </div>
          {codeError && <p id="pickup-code-error" className="mt-2 text-xs text-destructive">{codeError}</p>}
        </form>
      </div>
    </>
  );
}
