import { ArrowLeft, MapPin, Store } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import dryGoodsImage from "@/assets/categories/rescue-dry-goods.webp";
import mixedImage from "@/assets/categories/rescue-mixed.webp";
import proteinImage from "@/assets/categories/rescue-protein.webp";
import bakeryImage from "@/assets/rescue-bakery.webp";
import mealImage from "@/assets/rescue-meal.webp";
import produceImage from "@/assets/rescue-produce.webp";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type MaterialType,
  useNearbyRescueItems,
} from "@/features/discovery/use-nearby-rescue-items";

const categories: Record<
  MaterialType,
  { label: string; image: string }
> = {
  prepared_food: { label: "Siap santap", image: mealImage },
  bakery: { label: "Roti & pastry", image: bakeryImage },
  produce: { label: "Sayur & buah", image: produceImage },
  dairy: { label: "Susu & olahan", image: mealImage },
  mixed: { label: "Paket campur", image: mixedImage },
  dry_goods: { label: "Bahan kering", image: dryGoodsImage },
  protein: { label: "Protein", image: proteinImage },
};

function isMaterialType(value: string | undefined): value is MaterialType {
  return value !== undefined && value in categories;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters).toLocaleString("id-ID")} m`;
  }

  return `${(distanceMeters / 1_000).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })} km`;
}

function CategoryMerchantList({
  materialType,
  fallbackImage,
}: {
  materialType: MaterialType;
  fallbackImage: string;
}) {
  const nearbyData = useNearbyRescueItems({ materialType });
  const merchants = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        address: string;
        distanceMeters: number;
        itemCount: number;
        image: string;
      }
    >();

    for (const item of nearbyData?.results ?? []) {
      const id = item.merchant._id;
      const current = grouped.get(id);
      if (current) {
        current.itemCount += 1;
        current.distanceMeters = Math.min(
          current.distanceMeters,
          item.distanceMeters,
        );
        continue;
      }

      grouped.set(id, {
        id,
        name: item.merchant.name,
        address: item.merchant.address,
        distanceMeters: item.distanceMeters,
        itemCount: 1,
        image: item.imageUrl || fallbackImage,
      });
    }

    return [...grouped.values()].sort(
      (a, b) => a.distanceMeters - b.distanceMeters,
    );
  }, [fallbackImage, nearbyData]);

  if (nearbyData === undefined) {
    return (
      <div role="status" aria-label="Memuat Mitra Usaha" className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid grid-cols-[6rem_1fr] gap-4 rounded-xl border bg-card p-3">
            <Skeleton className="size-24" />
            <div className="space-y-3 py-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-10 text-center">
        <Store className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Belum ada Mitra Usaha aktif</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Coba kategori lain atau buka jelajah untuk melihat semua Rescue Item.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/discover">Jelajahi Rescue Item</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {merchants.map((merchant) => (
        <Link
          key={merchant.id}
          to={`/merchant/${merchant.id}`}
          className="group grid grid-cols-[6rem_1fr] items-center gap-4 rounded-xl border bg-card p-3 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[7rem_1fr]"
        >
          <div className="size-24 overflow-hidden rounded-lg bg-muted sm:size-28">
            <img
              src={merchant.image}
              alt=""
              width="224"
              height="224"
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0 py-1">
            <h2 className="truncate text-base font-semibold sm:text-lg">
              {merchant.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
              {merchant.address}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {formatDistance(merchant.distanceMeters)}
              </span>
              <span className="font-medium text-foreground">
                {merchant.itemCount} Rescue Item aktif
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const materialType = isMaterialType(categorySlug) ? categorySlug : null;
  const category = materialType ? categories[materialType] : null;

  if (!category || !materialType) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Kategori tidak ditemukan</h1>
        <Button asChild className="mt-5">
          <Link to="/">Kembali ke beranda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>

      <header className="mb-8 flex items-center gap-4">
        <div className="size-20 overflow-hidden rounded-full border bg-muted">
          <img
            src={category.image}
            alt=""
            width="160"
            height="160"
            className="size-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
            {category.label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mitra Usaha terdekat dengan Rescue Item aktif
          </p>
        </div>
      </header>

      <QueryErrorBoundary title="Daftar Mitra Usaha tidak dapat dimuat">
        <CategoryMerchantList
          materialType={materialType}
          fallbackImage={category.image}
        />
      </QueryErrorBoundary>
    </div>
  );
}
