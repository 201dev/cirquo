import {
  ArrowRight,
  BadgePercent,
  Clock3,
  MapPin,
  Recycle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dryGoodsImage from "@/assets/categories/rescue-dry-goods.webp";
import mixedImage from "@/assets/categories/rescue-mixed.webp";
import proteinImage from "@/assets/categories/rescue-protein.webp";
import heroImage from "@/assets/cirquo-hero.webp";
import bakeryImage from "@/assets/rescue-bakery.webp";
import mealImage from "@/assets/rescue-meal.webp";
import produceImage from "@/assets/rescue-produce.webp";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { toRescueItemPreview } from "@/lib/discovery";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

const quickActions = [
  {
    label: "Dekat saya",
    description: "Maks. 2 km",
    href: "/discover?distance=2000",
    icon: MapPin,
  },
  {
    label: "Paling hemat",
    description: "Maks. Rp15.000",
    href: "/discover?price=15000",
    icon: BadgePercent,
  },
  {
    label: "Pickup segera",
    description: "Mulai sebelum 18.00",
    href: "/discover?pickup=before_18",
    icon: Clock3,
  },
];

const categoryShortcuts = [
  { label: "Siap santap", image: mealImage, href: "/category/prepared_food" },
  { label: "Roti & pastry", image: bakeryImage, href: "/category/bakery" },
  { label: "Sayur & buah", image: produceImage, href: "/category/produce" },
  { label: "Paket campur", image: mixedImage, href: "/category/mixed" },
  { label: "Bahan kering", image: dryGoodsImage, href: "/category/dry_goods" },
  { label: "Protein", image: proteinImage, href: "/category/protein" },
];

const discoveryFilters = [
  { label: "Semua", href: "/discover" },
  { label: "Di bawah 2 km", href: "/discover?distance=2000" },
  { label: "Maks. Rp15.000", href: "/discover?price=15000" },
  { label: "Vegetarian", href: "/discover?dietary=Vegetarian" },
];

function NearbyRescueItems() {
  const nearbyData = useNearbyRescueItems();
  const items = useMemo(
    () =>
      nearbyData?.results.slice(0, 8).map((item) =>
        toRescueItemPreview(
          item,
          rescueItemImageForMaterialType(item.materialType),
        ),
      ),
    [nearbyData],
  );

  if (items === undefined) {
    return (
      <div
        role="status"
        aria-label="Memuat Rescue Item di dekatmu"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-10 text-center">
        <Search className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold">Belum ada Rescue Item aktif</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Coba perluas jarak atau lihat lagi saat Mitra Usaha menambahkan surplus.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/discover">Buka halaman jelajah</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <RescueItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default function ConsumerHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const firstName = user?.name.trim().split(/\s+/)[0]?.slice(0, 20);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/discover${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="grid overflow-hidden rounded-xl bg-brand-green text-brand-charcoal lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-charcoal/75">
            <MapPin className="size-4" aria-hidden="true" />
            Tembalang, Semarang
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
            {firstName ? `Halo, ${firstName}. ` : ""}Makanan baik di dekatmu,
            siap diselamatkan.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-charcoal/75 sm:text-base">
            Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-6 flex max-w-xl items-center rounded-lg bg-card p-1.5 text-card-foreground shadow-[0_16px_34px_-24px_rgba(39,39,39,.55)]"
            role="search"
          >
            <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="Cari makanan atau Mitra Usaha"
              aria-label="Cari Rescue Item"
            />
            <Button type="submit" className="h-11 shrink-0 rounded-md px-4">
              <span className="hidden sm:inline">Cari</span>
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </div>
        <div className="relative hidden min-h-80 lg:block">
          <img
            src={heroImage}
            alt="Makanan surplus yang masih baik dan siap diselamatkan"
            width="1600"
            height="863"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/20 to-transparent" />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-14 sm:space-y-16">
        <section aria-labelledby="quick-action-title" className="text-center">
          <h2 id="quick-action-title" className="text-xl font-bold sm:text-2xl">
            Lagi cari apa? Mulai dari sini
          </h2>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
            {quickActions.map(({ label, description, href, icon: Icon }) => (
              <Link
                key={label}
                to={href}
                className="group flex min-h-36 flex-col items-center justify-center rounded-xl border bg-card px-2 py-4 text-center transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-40"
              >
                <Icon
                  className="size-10 text-primary transition-transform group-hover:scale-105 sm:size-12"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                <span className="mt-3 text-sm font-semibold sm:text-base">{label}</span>
                <span className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="category-title" className="text-center">
          <h2 id="category-title" className="text-xl font-bold sm:text-2xl">
            Pilih berdasarkan kategori
          </h2>
          <div className="-mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0">
            {categoryShortcuts.map((category) => (
              <Link
                key={category.label}
                to={category.href}
                className="group flex min-w-24 snap-start flex-col items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="overflow-hidden rounded-full border bg-muted">
                  <img
                    src={category.image}
                    alt=""
                    width="160"
                    height="160"
                    loading="lazy"
                    className="size-20 object-cover transition-transform duration-300 group-hover:scale-105 sm:size-24"
                  />
                </span>
                <span className="text-xs font-medium sm:text-sm">{category.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="nearby-title">
          <div className="text-center">
            <h2 id="nearby-title" className="text-2xl font-bold sm:text-3xl">
              Pilihan bagus di dekatmu
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Rescue Item aktif yang bisa direservasi dan diambil langsung hari ini.
            </p>
          </div>
          <nav
            aria-label="Filter cepat Rescue Item"
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:justify-center sm:px-0"
          >
            {discoveryFilters.map((filter, index) => (
              <Link
                key={filter.label}
                to={filter.href}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  index === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground hover:border-primary/40 hover:bg-accent"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5">
            <QueryErrorBoundary title="Rescue Item di dekatmu tidak dapat dimuat">
              <NearbyRescueItems />
            </QueryErrorBoundary>
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="secondary">
              <Link to="/discover">
                Lihat semua Rescue Item <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <aside
          className="grid gap-5 border-y py-7 text-sm sm:grid-cols-2"
          aria-label="Tentang pickup Cirquo"
        >
          <p className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <strong className="block">Pickup langsung di lokasi</strong>
              <span className="text-muted-foreground">
                Cirquo tidak menyediakan layanan pengantaran.
              </span>
            </span>
          </p>
          <p className="flex items-start gap-3">
            <Recycle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <strong className="block">Aliran material tetap tercatat</strong>
              <span className="text-muted-foreground">
                Surplus yang tidak terambil dapat masuk Circular Routing.
              </span>
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}
