import {
  ArrowRight,
  BadgePercent,
  Clock3,
  MapPin,
  Recycle,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/cirquo-hero.webp";
import { MerchantCard } from "@/components/common/merchant-card";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { groupByMerchant, toRescueItemPreview } from "@/lib/discovery";
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
} from "@/lib/rescue-item-images";

/**
 * Shortcuts into `/explore` with the filter pre-applied. These used to exist
 * twice on this page — once as tall icon cards, once as a chip row that always
 * drew the first chip as "active" no matter what the URL said. One row now,
 * and nothing here claims to be a filter of the grid below it.
 */
const shortcuts = [
  { label: "Dekat saya", hint: "maks. 2 km", to: "/explore?distance=2000", icon: MapPin },
  { label: "Paling hemat", hint: "maks. Rp15.000", to: "/explore?price=15000", icon: BadgePercent },
  { label: "Pickup segera", hint: "mulai sebelum 18.00", to: "/explore?pickup=before_18", icon: Clock3 },
  { label: "Vegetarian", hint: "tanpa daging", to: "/explore?dietary=Vegetarian", icon: Recycle },
];

const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: "Pickup langsung di lokasi",
    body: "Reservasi lewat Cirquo, tunjukkan kode pickup enam digit di Mitra Usaha. Tidak ada pengantaran.",
  },
  {
    icon: BadgePercent,
    title: "Harga turun, mutu tetap",
    body: "Surplus dijual di bawah harga normal karena window pickup-nya pendek, bukan karena kualitasnya turun.",
  },
  {
    icon: Recycle,
    title: "Sisanya tetap tercatat",
    body: "Yang tidak terambil bisa masuk Circular Routing ke Mitra Pengolah, dan setiap perpindahan masuk Material Flow Ledger.",
  },
];

function ItemGridSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NearbyRescueItems() {
  const nearbyData = useNearbyRescueItems();
  const items = useMemo(
    () =>
      nearbyData?.results
        .slice(0, 8)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    [nearbyData],
  );

  if (items === undefined) {
    return <ItemGridSkeleton label="Memuat Rescue Item di dekatmu" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-10 text-center">
        <Search className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold">Belum ada Rescue Item aktif</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Semua window pickup dalam radius 30 km sudah lewat. Coba lagi saat
          Mitra Usaha menambahkan surplus.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/explore">Buka halaman jelajah</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <RescueItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * Same query as the grid above — the Convex client keeps one subscription for
 * identical args, so this is a second view of the same data, not a second read.
 */
function NearbyMerchants() {
  const nearbyData = useNearbyRescueItems();
  const merchants = useMemo(
    () => (nearbyData ? groupByMerchant(nearbyData.results).slice(0, 6) : undefined),
    [nearbyData],
  );

  if (merchants === undefined) {
    return (
      <div
        role="status"
        aria-label="Memuat Mitra Usaha di dekatmu"
        className="grid gap-3 lg:grid-cols-2"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[4.5rem_1fr] items-center gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[5.5rem_1fr] sm:gap-4"
          >
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (merchants.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {merchants.map((merchant) => (
        <MerchantCard key={merchant.id} merchant={merchant} />
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
    navigate(`/explore${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <div className="space-y-10 sm:space-y-14">
      {/*
        Baris lokasi tidak diulang di sini — site-header sudah menampilkan
        "Tembalang, Semarang · radius 30 km" di desktop dan mobile. Gaya banner
        ini dan hero landing (`src/pages/welcome-page.tsx`) dijaga sama.
      */}
      <section className="grid overflow-hidden rounded-xl bg-brand-green text-white lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
            {firstName ? `Halo, ${firstName}. ` : ""}Makanan baik di dekatmu,
            siap diselamatkan.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
            Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-6 flex max-w-xl items-center rounded-lg bg-card p-1.5 text-card-foreground shadow-raised"
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
      <section aria-labelledby="shortcut-title">
        <h2 id="shortcut-title" className="text-lg font-semibold sm:text-xl">
          Lagi cari apa?
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map(({ label, hint, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-leaf-100 text-leaf-700 transition-transform group-hover:scale-105">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="category-title">
        <h2 id="category-title" className="text-lg font-semibold sm:text-xl">
          Pilih berdasarkan kategori
        </h2>
        {/* `sm:grid-cols-7` alone gave each of the seven tracks ~71px at 640px
            while every tile is `min-w-20` (80px), so the row overflowed its
            container. Four up first, seven only once there is room. */}
        <div className="site-bleed no-scrollbar mt-4 flex snap-x gap-4 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 sm:pb-0 lg:grid-cols-7">
          {MATERIAL_CATEGORIES.map((category) => (
            <Link
              key={category.type}
              to={`/category/${category.type}`}
              className="group flex min-w-20 snap-start flex-col items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-0"
            >
              <span className="overflow-hidden rounded-full border bg-muted">
                <img
                  src={category.image}
                  alt=""
                  width="160"
                  height="160"
                  loading="lazy"
                  className="size-20 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="text-balance text-center text-xs font-medium leading-tight">
                {category.label}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="nearby-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="nearby-title" className="text-xl font-bold sm:text-2xl">
              Pilihan bagus di dekatmu
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rescue Item aktif yang bisa direservasi dan diambil hari ini.
            </p>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link to="/explore">
              Lihat semua <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="mt-4">
          <QueryErrorBoundary title="Rescue Item di dekatmu tidak dapat dimuat">
            <NearbyRescueItems />
          </QueryErrorBoundary>
        </div>
      </section>

      <section aria-labelledby="merchant-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="merchant-title" className="text-xl font-bold sm:text-2xl">
              Mitra Usaha terdekat
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tempat pickup yang sedang punya surplus, diurutkan dari yang
              terdekat.
            </p>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link to="/explore">
              <Store aria-hidden="true" /> Lihat di peta
            </Link>
          </Button>
        </div>
        <div className="mt-4">
          <QueryErrorBoundary title="Daftar Mitra Usaha tidak dapat dimuat">
            <NearbyMerchants />
          </QueryErrorBoundary>
        </div>
      </section>
      <section
        aria-labelledby="how-title"
        className="rounded-xl border bg-leaf-50 p-5 sm:p-7"
      >
        <h2 id="how-title" className="text-xl font-bold sm:text-2xl">
          Kenapa lewat Cirquo?
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            /*
              Icon beside the text, not above it. `shrink-0` keeps the tile square
              when the body wraps to a third line, and `items-start` holds it level
              with the heading instead of centring it against the whole block.
            */
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-leaf-100 text-leaf-700">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
