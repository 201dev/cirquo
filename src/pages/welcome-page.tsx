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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
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
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  // Same slice as the consumer homepage: first word, capped so a long legal
  // name cannot push the heading onto an extra line.
  const firstName = user?.name.trim().split(/\s+/)[0]?.slice(0, 20);

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
          Ukuran dan isi mengikuti hero `/home` (`src/pages/consumer/home-page.tsx`)
          supaya dua beranda tidak tampil dua gaya: tinggi 320px lewat `min-h-80`
          di kolom foto, dan sapaan nama di depan judul. `scroll-mt` tetap dipakai
          karena nav landing menuju `#beranda`.

          Baris "Tembalang, Semarang · radius 30 km" tidak diulang di sini —
          site-header sudah menampilkannya di desktop dan mobile.
        */}
        <section
          id="beranda"
          aria-labelledby="hero-title"
          className="mt-6 grid scroll-mt-[var(--site-header-h)] overflow-hidden rounded-xl bg-brand-green text-white sm:mt-8 md:grid-cols-2 lg:grid-cols-[1.15fr_.85fr]"
        >
          <div className="flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <h1
              id="hero-title"
              className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl"
            >
              {firstName ? `Halo, ${firstName}. ` : ""}Makanan baik di dekatmu,
              siap diselamatkan.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
              Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
            </p>
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-6 flex max-w-xl items-center rounded-lg bg-card p-1.5 text-card-foreground shadow-raised"
            >
              <Search
                className="ml-3 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari makanan atau Mitra Usaha"
                aria-label="Cari Rescue Item"
                className="h-11 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" className="h-11 shrink-0 rounded-md px-4">
                <span className="hidden sm:inline">Cari</span>
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          </div>
          {/*
            Foto ikut disembunyikan di HP, sama seperti `/home`. Di layar sempit
            foto hanya menumpuk di bawah panel hijau dan memanjangkan layar
            pertama tanpa menambah informasi, jadi yang tersisa panel hijaunya
            saja. Dari `md` ke atas foto jadi kolom di samping teks.
          */}
          <div className="relative hidden overflow-hidden md:block lg:min-h-80">
            <img
              src={heroImage}
              alt="Makanan surplus yang masih baik dan siap diselamatkan"
              width="1600"
              height="863"
              // `hidden` alone still downloads the 120 kB photo on phones that
              // never show it. `loading="lazy"` makes Chrome skip a fetch for a
              // `display:none` image entirely, and from `md` up the photo is in
              // the first viewport, where lazy images still load immediately.
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            {/*
              Fades the green panel into the photo instead of butting the two
              against each other. The photo now only ever renders as a side
              column, so the fade only ever runs rightward.
            */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/20 to-transparent" />
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
