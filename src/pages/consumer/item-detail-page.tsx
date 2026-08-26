import {
  ArrowLeft,
  Clock3,
  Info,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIdr, formatKg, rescueItems } from "@/constants/mock-data";

export default function ItemDetailPage() {
  const { id } = useParams();
  const item = rescueItems.find((candidate) => candidate.id === id);
  const [quantity, setQuantity] = useState(() =>
    item && item.remainingQuantity > 0 ? 1 : 0,
  );

  if (!item)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Rescue Item tidak ditemukan</h1>
        <Button asChild className="mt-5">
          <Link to="/discover">Kembali menjelajah</Link>
        </Button>
      </div>
    );
  const hasStock = item.status === "active" && item.remainingQuantity > 0;
  const subtotal = item.currentPrice * quantity;

  return (
    <div className="-mt-2 pb-20 sm:pb-0">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/discover">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-2xl bg-muted">
          <img
            src={item.image}
            alt={`Foto ${item.name}`}
            width="900"
            height="900"
            className="aspect-[4/3] size-full object-cover"
          />
        </div>
        <div className="lg:py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <Badge variant="secondary">
              Hemat{" "}
              {Math.round((1 - item.currentPrice / item.originalPrice) * 100)}%
            </Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-primary">
            {item.merchantName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            {item.name}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="size-4 fill-current text-recovered" />
            {item.rating}
            <span>•</span>
            {item.distanceKm.toLocaleString("id-ID")} km
          </div>
          <p className="mt-6 text-2xl font-semibold text-primary">
            {formatIdr(item.currentPrice)}{" "}
            <s className="ml-2 text-base font-normal text-muted-foreground">
              {formatIdr(item.originalPrice)}
            </s>
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <div className="mt-6 grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
            <p className="flex items-start gap-3 text-sm">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">{item.pickupDate}</strong>
                <span className="text-muted-foreground">
                  {item.pickupWindow}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">Ambil di merchant</strong>
                <span className="text-muted-foreground">{item.address}</span>
              </span>
            </p>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium">Preferensi pangan</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.dietaryTags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Informasi ini membantu penyaringan preferensi, bukan jaminan
              keamanan alergi.
            </p>
          </div>
          <div className="mt-7 flex items-center justify-between border-y py-4">
            <div>
              <p className="text-sm font-medium">Jumlah paket</p>
              <p className="text-xs text-muted-foreground">
                {item.remainingQuantity} tersisa ·{" "}
                {formatKg(item.weightPerItemGrams)} per paket
              </p>
            </div>
            {hasStock ? (
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label="Kurangi jumlah"
                >
                  <Minus />
                </Button>
                <span className="w-5 text-center font-semibold">
                  {quantity}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setQuantity((value) =>
                      Math.min(item.remainingQuantity, value + 1),
                    )
                  }
                  disabled={quantity >= item.remainingQuantity}
                  aria-label="Tambah jumlah"
                >
                  <Plus />
                </Button>
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                Tidak tersedia
              </span>
            )}
          </div>
          <div className="mt-6 hidden items-center justify-between gap-4 sm:flex">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal demo</p>
              <p className="text-xl font-semibold">{formatIdr(subtotal)}</p>
            </div>
            <Button
              size="lg"
              onClick={() =>
                toast.success(
                  "Pratinjau reservasi siap. Pembayaran akan aktif setelah integrasi Midtrans.",
                )
              }
              disabled={!hasStock}
            >
              <ShieldCheck />
              Reservasi untuk pickup
            </Button>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[4.5rem] z-20 flex items-center justify-between gap-4 border-t bg-background/95 p-4 backdrop-blur-xl sm:hidden">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal demo</p>
          <p className="font-semibold">{formatIdr(subtotal)}</p>
        </div>
        <Button
          onClick={() =>
            toast.success(
              "Pratinjau reservasi siap. Pembayaran akan aktif setelah integrasi Midtrans.",
            )
          }
          disabled={!hasStock}
        >
          Reservasi
        </Button>
      </div>
    </div>
  );
}
