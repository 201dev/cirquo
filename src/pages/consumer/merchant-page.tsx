import { ArrowLeft, MapPin, Store } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { toRescueItemPreview } from "@/lib/discovery";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

function MerchantRescueItems({ merchantId }: { merchantId: string }) {
  const nearbyData = useNearbyRescueItems();
  const merchantItems = useMemo(
    () =>
      nearbyData?.results.filter((item) => item.merchant._id === merchantId),
    [merchantId, nearbyData],
  );
  const previews = useMemo(
    () =>
      merchantItems?.map((item) =>
        toRescueItemPreview(
          item,
          rescueItemImageForMaterialType(item.materialType),
        ),
      ),
    [merchantItems],
  );

  if (merchantItems === undefined || previews === undefined) {
    return (
      <div role="status" aria-label="Memuat Mitra Usaha">
        <div className="grid grid-cols-[5rem_1fr] gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="size-20" />
          <div className="space-y-3 py-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border bg-card">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const firstItem = merchantItems[0];
  if (!firstItem) {
    return (
      <div className="rounded-xl border bg-card px-5 py-12 text-center">
        <Store className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">
          Mitra Usaha tidak ditemukan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Mitra ini tidak tersedia atau belum memiliki Rescue Item aktif.
        </p>
        <Button asChild className="mt-5">
          <Link to="/discover">Kembali menjelajah</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="grid grid-cols-[5rem_1fr] items-center gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[6rem_1fr] sm:p-5">
        <div className="size-20 overflow-hidden rounded-lg bg-muted sm:size-24">
          <img
            src={
              firstItem.imageUrl ||
              rescueItemImageForMaterialType(firstItem.materialType)
            }
            alt=""
            width="192"
            height="192"
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            {firstItem.merchant.name}
          </h1>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{firstItem.merchant.address}</span>
          </p>
          <p className="mt-2 text-xs font-medium text-foreground">
            {merchantItems.length} Rescue Item aktif
          </p>
        </div>
      </header>

      <section aria-labelledby="merchant-items-title" className="mt-8">
        <h2 id="merchant-items-title" className="text-xl font-semibold">
          Rescue Item tersedia
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previews.map((item) => (
            <RescueItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}

export default function MerchantPage() {
  const { merchantId } = useParams<{ merchantId: string }>();

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>

      {merchantId ? (
        <QueryErrorBoundary title="Mitra Usaha tidak dapat dimuat">
          <MerchantRescueItems merchantId={merchantId} />
        </QueryErrorBoundary>
      ) : (
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold">Mitra Usaha tidak ditemukan</h1>
          <Button asChild className="mt-5">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
