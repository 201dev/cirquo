import { Clock3, MapPin, Package, Store, Tag } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { BUSINESS_TYPE_LABELS } from "@/lib/admin-review";
import { toRescueItemPreview } from "@/lib/discovery";
import { formatDistance, formatIdr, formatWibTime } from "@/lib/format";
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
} from "@/lib/rescue-item-images";

/**
 * One fact per column, all of it derived from the merchant's live items — there
 * is no merchant-detail query yet, so this page shows exactly what discovery
 * already knows and nothing more.
 */
function InfoStrip({
  items,
}: {
  items: { pickupStartAt: number; pickupEndAt: number; currentPrice: number; distanceMeters: number }[];
}) {
  const first = items[0];
  if (first === undefined) return null;

  const prices = items.map((item) => item.currentPrice);
  const cheapest = Math.min(...prices);
  const dearest = Math.max(...prices);
  const soonest = items.reduce(
    (earliest, item) => Math.min(earliest, item.pickupStartAt),
    first.pickupStartAt,
  );
  const latest = items.reduce(
    (last, item) => Math.max(last, item.pickupEndAt),
    first.pickupEndAt,
  );

  const facts = [
    { icon: MapPin, label: "Jarak", value: formatDistance(first.distanceMeters) },
    { icon: Package, label: "Item aktif", value: `${items.length} Rescue Item` },
    {
      icon: Tag,
      label: "Rentang harga",
      value:
        cheapest === dearest
          ? formatIdr(cheapest)
          : `${formatIdr(cheapest)}–${formatIdr(dearest)}`,
    },
    {
      icon: Clock3,
      label: "Window pickup",
      value: `${formatWibTime(soonest)}–${formatWibTime(latest)}`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="bg-card px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {label}
          </dt>
          <dd className="mt-1 text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MerchantSkeleton() {
  return (
    <div role="status" aria-label="Memuat Mitra Usaha">
      <Skeleton className="h-36 w-full rounded-xl sm:h-48" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="mt-5 h-20 w-full rounded-xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MerchantNotFound() {
  return (
    <div className="rounded-xl border bg-card px-5 py-12 text-center">
      <Store className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold">Mitra Usaha tidak ditemukan</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Mitra ini belum punya Rescue Item aktif, atau berada di luar radius 30 km
        dari Tembalang.
      </p>
      <Button asChild className="mt-5">
        <Link to="/explore">Kembali menjelajah</Link>
      </Button>
    </div>
  );
}

function MerchantDetail({ merchantId }: { merchantId: string }) {
  const nearbyData = useNearbyRescueItems();

  const items = useMemo(
    () =>
      nearbyData?.results.filter((item) => item.merchant._id === merchantId),
    [merchantId, nearbyData],
  );

  /** Items grouped into the same category order the rest of the app uses. */
  const sections = useMemo(() => {
    if (items === undefined) return [];
    return MATERIAL_CATEGORIES.map((category) => ({
      label: category.label,
      type: category.type,
      previews: items
        .filter((item) => item.materialType === category.type)
        .map((item) =>
          toRescueItemPreview(item, rescueItemImageForMaterialType(item.materialType)),
        ),
    })).filter((section) => section.previews.length > 0);
  }, [items]);

  if (items === undefined) return <MerchantSkeleton />;

  const first = items[0];
  if (first === undefined) return <MerchantNotFound />;

  const cover =
    first.imageUrl || rescueItemImageForMaterialType(first.materialType);
  const businessLabel =
    BUSINESS_TYPE_LABELS[first.merchant.businessType ?? "other"] ??
    "Mitra Usaha";

  return (
    <>
      <div className="mb-4">
        <Breadcrumbs
          items={[
            { label: "Beranda", to: "/" },
            { label: "Mitra Usaha", to: "/explore" },
            { label: first.merchant.name },
          ]}
        />
      </div>

      <div className="relative -mx-4 h-36 overflow-hidden sm:mx-0 sm:h-48 sm:rounded-xl">
        <img src={cover} alt="" className="size-full object-cover" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/30 to-transparent"
          aria-hidden="true"
        />
      </div>

      <header className="relative z-10 -mt-10 px-1 sm:-mt-12 sm:px-5">
        <div className="grid grid-cols-[4.5rem_1fr] items-end gap-4 sm:grid-cols-[6rem_1fr]">
          <div className="aspect-square overflow-hidden rounded-xl border-4 border-background bg-muted shadow-card">
            <img
              src={cover}
              alt=""
              width="192"
              height="192"
              className="size-full object-cover"
            />
          </div>
          <p className="pb-1 text-xs font-semibold text-white sm:text-sm">
            {businessLabel} · {first.merchant.address.split(",")[0]}
          </p>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
          {first.merchant.name}
        </h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{first.merchant.address}</span>
        </p>
      </header>

      <div className="mt-5 sm:px-5">
        <InfoStrip items={items} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
        Pengambilan dilakukan langsung di lokasi ini dengan kode pickup enam
        digit. Cirquo tidak melakukan pengantaran.
      </p>

      {sections.map((section) => (
        <section key={section.type} aria-labelledby={`section-${section.type}`} className="mt-8 sm:px-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id={`section-${section.type}`} className="text-lg font-semibold">
              {section.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              {section.previews.length} item
            </p>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.previews.map((item) => (
              <RescueItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default function MerchantPage() {
  const { merchantId } = useParams<{ merchantId: string }>();

  return (
    <div className="mx-auto max-w-5xl">
      {merchantId ? (
        <QueryErrorBoundary title="Mitra Usaha tidak dapat dimuat">
          <MerchantDetail merchantId={merchantId} />
        </QueryErrorBoundary>
      ) : (
        <MerchantNotFound />
      )}
    </div>
  );
}
