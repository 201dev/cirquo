import { ArrowRight, Clock3, MapPin, Search } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/landing/hero.png";
import mascotDekat from "@/assets/mascot/mascot-dekat.webp";
import mascotHemat from "@/assets/mascot/mascot-hemat.webp";
import mascotLedger from "@/assets/mascot/mascot-ledger.webp";
import mascotPickup from "@/assets/mascot/mascot-pickup.webp";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useNearbyRescueItems } from "@/features/discovery/use-nearby-rescue-items";
import { isConvexConfigured } from "@/lib/convex";
import { toRescueItemPreview } from "@/lib/discovery";
import { formatIdr } from "@/lib/format";
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
} from "@/lib/rescue-item-images";
import type { RescueItemPreview } from "@/types/domain";

/**
 * Four distinct reasons, not the same card four times. Copy tracks the terms in
 * `docs/domain/DOMAIN.md` — Rescue Item, Mitra Usaha, Material Flow Ledger —
 * and claims nothing the ledger cannot back.
 */
const WHY_CIRQUO = [
  {
    image: mascotHemat,
    title: "Hemat & berkualitas",
    body: "Dapatkan makanan enak dengan harga lebih ramah di kantong.",
  },
  {
    image: mascotDekat,
    title: "Dekat dari rumah",
    body: "Rescue Item dalam radius 30 km, diurutkan dari yang paling dekat.",
  },
  {
    image: mascotPickup,
    title: "Pickup tanpa ribet",
    body: "Reservasi di aplikasi, tunjukkan kode pickup di Mitra Usaha. Tanpa pengantaran.",
  },
  {
    image: mascotLedger,
    title: "Tercatat sampai akhir",
    body: "Setiap perpindahan masuk Material Flow Ledger, termasuk yang berlanjut ke Mitra Pengolah.",
  },
] as const;

/**
 * Scrolls edge to edge below `lg`, becomes a five-up grid above it. `.site-bleed`
 * keeps the first card flush with the heading instead of hardcoding a negative
 * margin that has to be kept in step with the container's gutter by hand.
 */
const PICK_ROW =
  "site-bleed no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0";

function LandingRescueItemCard({ item }: { item: RescueItemPreview }) {
  const discount =
    item.originalPrice > 0
      ? Math.max(0, Math.round((1 - item.currentPrice / item.originalPrice) * 100))
      : 0;

  return (
    <Link
      to={"/item/" + item.id}
      className="group relative block min-h-[320px] w-[200px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-black/10 bg-white p-1.5 text-[#272727] shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full"
    >
      <div className="relative h-[165px] overflow-hidden rounded-[14px] bg-[#f0f3f1] lg:h-[180px]">
        <img
          src={item.image}
          alt={"Foto " + item.name + " dari " + item.merchantName}
          width="188"
          height="165"
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {discount > 0 ? (
          <span className="absolute -left-7 -top-4 flex h-11 w-[92px] rotate-[-45deg] items-end justify-center bg-[#1bac4b]/80 pb-1 text-xs font-semibold text-white">
            -{discount}%
          </span>
        ) : null}
      </div>
      <div className="px-2 pt-2">
        <h3 className="truncate text-base font-semibold leading-5">{item.name}</h3>
        <p className="truncate text-xs font-medium leading-4 text-[#5b5b5b]">
          {item.merchantName}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold leading-4">
          <MapPin className="size-3.5 shrink-0 text-[#5b5b5b]" aria-hidden="true" />
          {item.distanceKm.toLocaleString("id-ID")} km
        </p>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-sm font-semibold leading-5">{formatIdr(item.currentPrice)}</span>
          <s className="truncate text-xs font-semibold text-[#787878]/70">
            {formatIdr(item.originalPrice)}
          </s>
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold leading-4 text-[#1bac4b]">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.pickupWindow}</span>
        </p>
      </div>
    </Link>
  );
}

function LandingPickSkeleton() {
  return (
    <div className="min-h-[320px] w-[200px] shrink-0 overflow-hidden rounded-[20px] border border-black/10 bg-white p-1.5 lg:w-full">
      <Skeleton className="h-[165px] rounded-[14px] lg:h-[180px]" />
      <div className="space-y-2 px-2 pt-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-2 w-1/2" />
        <Skeleton className="h-2 w-3/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function NearbyPicks() {
  const nearbyData = useNearbyRescueItems();
  const items = useMemo(
    () =>
      nearbyData?.results
        .slice(0, 5)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    [nearbyData],
  );

  if (items === undefined) {
    return (
      <div role="status" aria-label="Memuat Rescue Item di dekatmu" className={PICK_ROW}>
        {Array.from({ length: 5 }, (_, index) => (
          <LandingPickSkeleton key={index} />
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
          Semua window pickup dalam radius 30 km sudah lewat. Coba lagi saat Mitra
          Usaha menambahkan surplus.
        </p>
      </div>
    );
  }

  return (
    <div className={PICK_ROW}>
      {items.map((item) => (
        <LandingRescueItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function WhyCard({
  image,
  title,
  body,
}: {
  image: string;
  title: string;
  body: string;
}) {
  return (
    <article className="flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-[#e9fddd] p-2 text-[#272727] sm:w-full">
      {/*
        The mascot used to be one sprite sheet cropped with per-breakpoint pixel
        offsets, which came apart at every width in between. One image per card,
        contained in a fixed-ratio box, needs no offsets at all.
      */}
      <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[#c3e994]/50 p-3">
        <img
          src={image}
          alt=""
          loading="lazy"
          className="size-full object-contain"
        />
      </div>
      <h3 className="mt-4 px-3 text-base font-bold leading-snug">{title}</h3>
      <p className="mt-2 px-3 pb-3 text-sm font-medium leading-5 text-[#5b5b5b]">
        {body}
      </p>
    </article>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate("/explore" + (value ? "?q=" + encodeURIComponent(value) : ""));
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7faf8] text-[#272727]">
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      <SiteHeader />

      <main id="main-content" className="site-container pb-4">
        {/*
          `min-h` rather than `h`: the section is `overflow-hidden`, so a fixed
          400px box silently clipped the heading and the search bar at tablet
          widths where the text column is at its narrowest.
        */}
        <section
          id="beranda"
          aria-labelledby="hero-title"
          className="mt-6 grid scroll-mt-[var(--site-header-h)] overflow-hidden rounded-2xl bg-[#1bac4b] text-white sm:mt-8 md:min-h-[400px] md:grid-cols-2 lg:min-h-[450px] lg:grid-cols-[521fr_455fr]"
        >
          <div className="flex flex-col justify-center px-5 py-9 sm:px-8 sm:py-12 md:px-8 lg:px-14 lg:py-16">
            <p className="flex items-center gap-2 text-sm font-medium sm:text-base">
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              Tembalang, Semarang · radius 30 km
            </p>
            {/*
              Steps down at `md`, where the two-column split makes this the
              narrowest the text column ever gets. A vw-based clamp cannot see
              that and overflowed the column.
            */}
            <h1
              id="hero-title"
              className="mt-4 max-w-[560px] text-balance text-3xl font-bold leading-[1.15] tracking-[-0.025em] sm:text-4xl md:text-3xl lg:text-4xl xl:text-5xl"
            >
              Makanan baik di dekatmu, siap diselamatkan.
            </h1>
            <p className="mt-4 max-w-[540px] text-base leading-relaxed sm:text-lg">
              Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
            </p>
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-7 flex h-14 w-full max-w-[560px] items-center rounded-xl bg-white p-2 text-[#444053] shadow-raised sm:mt-8 sm:h-16"
            >
              <Search className="ml-2 size-5 shrink-0 sm:ml-3 sm:size-6" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari makanan atau Mitra Usaha"
                aria-label="Cari Rescue Item"
                className="w-0 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#444053] sm:px-3 sm:text-base"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#107333] px-4 text-sm font-medium text-[#f7faf8] shadow-sm transition-colors hover:bg-[#0e5b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-12 sm:px-5 sm:text-base"
              >
                Cari <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
          <div className="relative min-h-56 overflow-hidden sm:min-h-72 md:min-h-0">
            <img
              src={heroImage}
              alt="Makanan surplus yang masih baik dan siap diselamatkan"
              width="1600"
              height="863"
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </section>

        <section
          id="kategori"
          aria-labelledby="category-title"
          className="mt-12 scroll-mt-[var(--site-header-h)]"
        >
          <h2 id="category-title" className="text-2xl font-bold leading-8">
            Mau cari apa hari ini?
          </h2>
          <div className="site-bleed no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:px-0 sm:pb-0 lg:grid-cols-7 lg:gap-6">
            {MATERIAL_CATEGORIES.map((category) => (
              <Link
                key={category.type}
                to={"/category/" + category.type}
                className="flex w-[104px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d9dedb] bg-[#f0f3f1] sm:size-24">
                  <img
                    src={category.image}
                    alt=""
                    width="94"
                    height="94"
                    loading="lazy"
                    className="size-full rounded-full object-cover"
                  />
                </span>
                {/* No `whitespace-nowrap`: at `lg` a 7-up track is ~117px, and a
                    label that refuses to wrap pushes the grid past its container. */}
                <span className="text-center text-sm font-medium leading-tight text-balance">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="picks-title" className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id="picks-title" className="text-2xl font-bold leading-tight sm:text-3xl">
                Pilihan bagus di dekatmu
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#444053] sm:text-base">
                Surplus enak, aman, dan tentunya murah!
              </p>
            </div>
            {/* One "lihat semua" per breakpoint — the pill below covers mobile. */}
            <Link
              to="/explore"
              className="hidden h-12 shrink-0 items-center gap-2 rounded-[10px] px-4 text-base font-medium transition-colors hover:bg-[#edf7f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              Lihat semua <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6">
            {isConvexConfigured ? (
              <QueryErrorBoundary title="Rescue Item di dekatmu tidak dapat dimuat">
                <NearbyPicks />
              </QueryErrorBoundary>
            ) : (
              <div className={PICK_ROW} role="status" aria-label="Memuat tampilan Rescue Item">
                {Array.from({ length: 5 }, (_, index) => (
                  <LandingPickSkeleton key={index} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center sm:hidden">
            <Link
              to="/explore"
              className="inline-flex h-11 items-center rounded-full bg-[#45de78]/40 px-6 text-sm font-semibold text-[#186832] transition-colors hover:bg-[#45de78]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Lihat semua Rescue Item
            </Link>
          </div>
        </section>

        <section
          id="kenapa"
          aria-labelledby="why-title"
          className="mt-12 scroll-mt-[var(--site-header-h)]"
        >
          <h2 id="why-title" className="text-2xl font-bold leading-tight sm:text-3xl">
            Kenapa beli pakai Cirquo?
          </h2>
          <div className="site-bleed no-scrollbar mt-6 flex snap-x gap-5 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:px-0 sm:pb-0 lg:grid-cols-4">
            {WHY_CIRQUO.map((card) => (
              <WhyCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
