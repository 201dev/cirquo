import { ArrowLeft, Clock3, Info, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ReserveSheet } from "@/components/common/reserve-sheet";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";
import {
  formatDistance,
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDay,
} from "@/lib/format";
import { calculateHaversineDistanceMeters } from "@/lib/geo";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const item = useQuery(
    api.discovery.getListing,
    id ? { id: id as Id<"surplusItems"> } : "skip",
  );

  const reserve = useMutation(api.orders.reserve);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  useEffect(() => {
    if (!item) {
      setDistanceMeters(null);
      return;
    }

    let mounted = true;
    const fallbackLocation = { lat: -6.9932, lng: 110.4203 };
    const updateDistance = (latitude: number, longitude: number) => {
      if (!mounted) return;
      setDistanceMeters(
        calculateHaversineDistanceMeters(
          latitude,
          longitude,
          item.merchant.latitude,
          item.merchant.longitude,
        ),
      );
    };

    updateDistance(fallbackLocation.lat, fallbackLocation.lng);
    navigator.geolocation?.getCurrentPosition(
      (position) => updateDistance(position.coords.latitude, position.coords.longitude),
      () => undefined,
      { timeout: 8_000, maximumAge: 0 },
    );

    return () => {
      mounted = false;
    };
  }, [item]);

  if (item === undefined) {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 py-8 lg:grid-cols-2" aria-label="Memuat detail Rescue Item">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-5 py-3">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Rescue Item tidak ditemukan atau sudah tidak aktif</h1>
        <Button asChild className="mt-5">
          <Link to="/">Kembali menjelajah</Link>
        </Button>
      </div>
    );
  }

  const hasStock = item.remainingQuantity > 0;

  const handleReserve = async (quantity: number) => {
    if (!hasStock || quantity < 1 || quantity > item.remainingQuantity) return;

    try {
      setIsReserving(true);
      // One key per attempt: a retry of the same submit reuses it, so a
      // duplicated request resolves to the same order instead of a second one.
      const idempotencyKey = crypto.randomUUID();

      const orderId = await reserve({
        surplusItemId: item._id,
        quantity,
        idempotencyKey,
        sessionToken: sessionToken || undefined,
      });

      setIsSheetOpen(false);
      toast.success("Berhasil direservasi. Selesaikan pembayaran sekarang.");
      navigate(`/checkout/${orderId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal melakukan reservasi."));
      setIsReserving(false);
    }
  };

  const formattedPickupDate = formatWibDay(item.pickupStartAt);
  const formattedPickupWindow = formatPickupWindow(
    item.pickupStartAt,
    item.pickupEndAt,
  );

  return (
    <div className="-mt-2 pb-20 sm:pb-0 max-w-5xl mx-auto">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/explore">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-2xl bg-muted">
          <img
            src={
              item.imageUrl || rescueItemImageForMaterialType(item.materialType)
            }
            alt={`Foto ${item.name}`}
            className="aspect-[4/3] size-full object-cover"
          />
        </div>
        <div className="lg:py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={hasStock ? "active" : "sold_out"} />
            <Badge variant="secondary">
              Hemat {item.discountPercentage}%
            </Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-primary">
            {item.merchant.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            {item.name}
          </h1>
          <p className="mt-6 text-2xl font-semibold text-primary">
            {formatIdr(item.currentPrice)}{" "}
            <s className="ml-2 text-base font-normal text-muted-foreground">
              {formatIdr(item.originalPrice)}
            </s>
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {item.description || "Makanan sisa berkualitas dari merchant ini."}
          </p>
          <div className="mt-6 grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
            <p className="flex items-start gap-3 text-sm">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">{formattedPickupDate}</strong>
                <span className="text-muted-foreground">
                  {formattedPickupWindow}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">Ambil di merchant</strong>
                <span className="text-muted-foreground">
                  {item.merchant.address}
                  {distanceMeters !== null ? ` · ${formatDistance(distanceMeters)} dari lokasimu` : ""}
                </span>
              </span>
            </p>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium">Preferensi pangan</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.dietaryTags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              {item.dietaryTags.length === 0 && (
                <span className="text-sm text-muted-foreground">Tidak ada tag.</span>
              )}
            </div>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Informasi ini membantu penyaringan preferensi, bukan jaminan keamanan alergi.
            </p>
          </div>
          <div className="mt-7 border-y py-4">
            <p className="text-sm font-medium">Ketersediaan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasStock
                ? `${item.remainingQuantity} paket tersisa · ${formatKg(item.weightPerItemGrams)} per paket`
                : "Semua paket sudah habis direservasi."}
            </p>
          </div>
          <div className="mt-6 hidden items-center justify-between gap-4 sm:flex">
            <div>
              <p className="text-xs text-muted-foreground">Harga per paket</p>
              <p className="text-xl font-semibold">
                {formatIdr(item.currentPrice)}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setIsSheetOpen(true)}
              disabled={!hasStock || isReserving}
            >
              <ShieldCheck />
              {hasStock ? "Reservasi untuk pickup" : "Stok habis"}
            </Button>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[4.5rem] z-20 flex items-center justify-between gap-4 border-t bg-background/95 p-4 backdrop-blur-xl sm:hidden">
        <div>
          <p className="text-xs text-muted-foreground">Harga per paket</p>
          <p className="font-semibold">{formatIdr(item.currentPrice)}</p>
        </div>
        <Button
          onClick={() => setIsSheetOpen(true)}
          disabled={!hasStock || isReserving}
        >
          {hasStock ? "Reservasi" : "Stok habis"}
        </Button>
      </div>

      <ReserveSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!isReserving) setIsSheetOpen(open);
        }}
        isSubmitting={isReserving}
        onConfirm={handleReserve}
        item={{
          name: item.name,
          merchantName: item.merchant.name,
          merchantAddress: item.merchant.address,
          currentPrice: item.currentPrice,
          remainingQuantity: item.remainingQuantity,
          weightPerItemGrams: item.weightPerItemGrams,
          pickupStartAt: item.pickupStartAt,
          pickupEndAt: item.pickupEndAt,
        }}
      />
    </div>
  );
}
