import { Store } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { MerchantCard } from "@/components/common/merchant-card";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type MaterialType,
  useNearbyRescueItems,
} from "@/features/discovery/use-nearby-rescue-items";
import { groupByMerchant, toRescueItemPreview } from "@/lib/discovery";
import {
  materialCategory,
  rescueItemImageForMaterialType,
} from "@/lib/rescue-item-images";

function isMaterialType(value: string | undefined): value is MaterialType {
  return value !== undefined && materialCategory(value) !== undefined;
}

function CategoryResults({
  materialType,
  label,
}: {
  materialType: MaterialType;
  label: string;
}) {
  const nearbyData = useNearbyRescueItems({ materialType });
  const fallbackImage = rescueItemImageForMaterialType(materialType);

  const items = useMemo(
    () =>
      (nearbyData?.results ?? []).map((item) =>
        toRescueItemPreview(item, fallbackImage),
      ),
    [fallbackImage, nearbyData],
  );

  const merchants = useMemo(
    () => groupByMerchant(nearbyData?.results ?? []),
    [nearbyData],
  );

  if (nearbyData === undefined) {
    return (
      <div
        role="status"
        aria-label={`Memuat ${label}`}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-12 text-center">
        <Store
          className="mx-auto size-9 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-lg font-semibold">
          Belum ada {label.toLowerCase()} aktif
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Window pickup di kategori ini sudah lewat semua. Coba kategori lain
          atau buka jelajah untuk melihat seluruh Rescue Item.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/explore">Jelajahi Rescue Item</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {items.length} Rescue Item aktif
        </h2>
        <p className="text-sm text-muted-foreground">
          dari {merchants.length} Mitra Usaha · diurutkan dari yang terdekat
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <RescueItemCard key={item.id} item={item} />
        ))}
      </div>

      <h2 className="mt-12 text-lg font-semibold">
        Mitra Usaha dengan {label.toLowerCase()}
      </h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {merchants.map((merchant) => (
          <MerchantCard key={merchant.id} merchant={merchant} />
        ))}
      </div>
    </>
  );
}

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const category = isMaterialType(categorySlug)
    ? materialCategory(categorySlug)
    : undefined;

  if (category === undefined) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Kategori tidak ditemukan</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Alamat kategori ini tidak dikenali.
        </p>
        <Button asChild className="mt-5">
          <Link to="/home">Kembali ke beranda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="relative h-40 overflow-hidden sm:h-56">
          <img
            src={category.image}
            alt=""
            className="size-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/45 to-ink-900/10"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 pb-5 sm:pb-7">
            <div className="site-container">
              <h1 className="text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl lg:text-4xl">
                {category.label}
              </h1>
              <p className="mt-1 max-w-lg text-xs text-white/80 sm:text-sm">
                {category.blurb} · dalam radius 30 km dari Tembalang
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Breadcrumbs
          items={[
            { label: "Beranda", to: "/" },
            { label: "Kategori", to: "/explore" },
            { label: category.label },
          ]}
        />
      </div>

      <div className="mt-6">
        <QueryErrorBoundary title="Daftar kategori tidak dapat dimuat">
          <CategoryResults
            materialType={category.type}
            label={category.label}
          />
        </QueryErrorBoundary>
      </div>
    </div>
  );
}
