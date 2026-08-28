import { ChevronRight, Clock3, Info, MapPin, ShieldCheck, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { ReserveSheet } from "@/components/common/reserve-sheet";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { toRescueItemPreview } from "@/lib/discovery";
import { getErrorMessage } from "@/lib/errors";
import {
  formatDistance,
  formatIdr,
  formatPickupWindow,
  formatWeight,
  formatWibDay,
} from "@/lib/format";
import { calculateHaversineDistanceMeters } from "@/lib/geo";
import {
  materialCategory,
  rescueItemImageForMaterialType,
} from "@/lib/rescue-item-images";

/**
 * Everything else this merchant has open right now. Reuses the nearby query the
 * rest of discovery already subscribes to, so the section costs no new backend.
 */
function MoreFromMerchant({
  merchantId,
  merchantName,
  excludeItemId,
}: {
  merchantId: string;
  merchantName: string;
  excludeItemId: string;
}) {
  const nearbyData = useNearbyRescueItems();
  const previews = useMemo(
    () =>
      (nearbyData?.results ?? [])
        .filter(
          (item) => item.merchant._id === merchantId && item._id !== excludeItemId,
        )
        .slice(0, 4)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    [excludeItemId, merchantId, nearbyData],
  );

  if (previews.length === 0) return null;

  return (
    <section aria-labelledby="more-title" className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="more-title" className="text-lg font-semibold">
          Rescue Item lain dari {merchantName}
        </h2>
        <Link
          to={`/merchant/${merchantId}`}
          className="rounded text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Lihat semua
        </Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {previews.map((item) => (
          <RescueItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

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
  const category = materialCategory(item.materialType);

  return (
    <div className="-mt-2 pb-20 sm:pb-0 max-w-5xl mx-auto">
      <div className="mb-4">
        <Breadcrumbs
          items={[
            { label: "Beranda", to: "/" },
            ...(category
              ? [{ label: category.label, to: `/category/${category.type}` }]
              : []),
            { label: item.name },
          ]}
        />
      </div>
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
          <Link
            to={`/merchant/${item.merchant._id}`}
            className="mt-5 inline-flex max-w-full items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Store className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.merchant.name}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
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
                ? `${item.remainingQuantity} paket tersisa · ${formatWeight(item.weightPerItemGrams)} per paket`
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
      <MoreFromMerchant
        merchantId={item.merchant._id}
        merchantName={item.merchant.name}
        excludeItemId={item._id}
      />

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
