import { Loader2, Minus, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDay,
} from "@/lib/format";
import { PAYMENT_HOLD_MS } from "@/lib/payment-hold";

const HOLD_MINUTES = PAYMENT_HOLD_MS / 60_000;

export type ReserveSheetItem = {
  name: string;
  merchantName: string;
  merchantAddress: string;
  currentPrice: number;
  remainingQuantity: number;
  weightPerItemGrams: number;
  pickupStartAt: number;
  pickupEndAt: number;
};

export function ReserveSheet({
  open,
  onOpenChange,
  item,
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReserveSheetItem;
  isSubmitting: boolean;
  onConfirm: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = item.remainingQuantity;
  const isUnavailable = maxQuantity <= 0;

  useEffect(() => {
    if (open) setQuantity(1);
  }, [open]);

  // Stock is reactive. If it drops below the chosen amount while the sheet is
  // open, follow it down instead of letting the server reject the reservation.
  useEffect(() => {
    setQuantity((value) => Math.min(value, Math.max(1, maxQuantity)));
  }, [maxQuantity]);

  const subtotal = item.currentPrice * quantity;
  const weightGrams = item.weightPerItemGrams * quantity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Reservasi Rescue Item</SheetTitle>
          <SheetDescription>
            Reservasi menahan porsi untukmu. Pembayaran belum selesai — kamu punya{" "}
            {HOLD_MINUTES} menit untuk membayar setelah ini.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div>
            <p className="font-semibold leading-tight">{item.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.merchantName} · {item.merchantAddress}
            </p>
          </div>

          <dl className="grid gap-2 rounded-xl bg-secondary p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Waktu pickup</dt>
              <dd className="text-right font-medium">
                {formatWibDay(item.pickupStartAt)},{" "}
                {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Harga per paket</dt>
              <dd className="font-medium">{formatIdr(item.currentPrice)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Berat per paket</dt>
              <dd className="font-medium">
                {formatKg(item.weightPerItemGrams)}
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between border-y py-4">
            <div>
              <p className="text-sm font-medium" id="reserve-quantity-label">
                Jumlah paket
              </p>
              <p className="text-xs text-muted-foreground">
                {isUnavailable
                  ? "Stok sudah habis"
                  : `${maxQuantity} tersisa saat ini`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1 || isSubmitting || isUnavailable}
                aria-label="Kurangi jumlah paket"
              >
                <Minus />
              </Button>
              <output
                aria-labelledby="reserve-quantity-label"
                className="w-8 text-center text-lg font-semibold tabular-nums"
              >
                {quantity}
              </output>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11"
                onClick={() =>
                  setQuantity((value) => Math.min(maxQuantity, value + 1))
                }
                disabled={
                  quantity >= maxQuantity || isSubmitting || isUnavailable
                }
                aria-label="Tambah jumlah paket"
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total reservasi</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatIdr(subtotal)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Berat total {formatKg(weightGrams)}
            </p>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => onConfirm(quantity)}
            disabled={isSubmitting || isUnavailable}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Memproses reservasi…
              </>
            ) : (
              <>
                <ShieldCheck />
                Reservasi &amp; lanjut bayar
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
