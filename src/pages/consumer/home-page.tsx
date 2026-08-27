import {
  ArrowRight,
  Clock3,
  MapPin,
  Recycle,
  Search,
  ShoppingBag,
  Sprout,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bakeryImage from "@/assets/rescue-bakery.webp";
import heroImage from "@/assets/cirquo-hero.webp";
import mealImage from "@/assets/rescue-meal.webp";
import produceImage from "@/assets/rescue-produce.webp";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoImpact, rescueItems } from "@/constants/mock-data";
import { useAuth } from "@/contexts/auth-context";

const categoryShortcuts = [
  {
    label: "Roti & pastry",
    description: "Paket bakery hari ini",
    image: bakeryImage,
    href: "/discover?category=bakery",
  },
  {
    label: "Siap santap",
    description: "Menu makan lengkap",
    image: mealImage,
    href: "/discover?category=meal",
  },
  {
    label: "Sayur & buah",
    description: "Segar dan layak konsumsi",
    image: produceImage,
    href: "/discover?category=produce",
  },
];

export default function ConsumerHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const rawFirstName = user?.name.trim().split(/\s+/)[0];
  const firstName =
    rawFirstName && rawFirstName.length > 20
      ? `${rawFirstName.slice(0, 20)}…`
      : rawFirstName;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/discover${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <div className="space-y-11 sm:space-y-14">
      <section className="relative isolate overflow-hidden rounded-2xl bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-9 lg:px-10">
        <img
          src={heroImage}
          alt=""
          width="1600"
          height="863"
          className="absolute inset-y-0 right-0 hidden h-full w-[42%] object-cover object-[72%_center] opacity-20 lg:block [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-foreground/75">
            <MapPin className="size-4" aria-hidden="true" />
            Tembalang, Semarang
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            {firstName ? `Halo, ${firstName}. ` : ""}Mau selamatkan apa hari
            ini?
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
            Pilih makanan yang masih baik, lalu ambil langsung pada waktunya.
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-6 flex max-w-xl items-center gap-1 rounded-full bg-background p-1.5 text-foreground shadow-[0_18px_38px_-24px_rgba(0,0,0,.65)]"
            role="search"
          >
            <Search
              className="ml-3 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="Cari makanan atau merchant"
              aria-label="Cari Rescue Item"
            />
            <Button
              type="submit"
              className="size-11 shrink-0 rounded-full px-0"
              aria-label="Cari"
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>

      <section aria-labelledby="category-title">
        <div className="mb-5">
          <h2
            id="category-title"
            className="text-2xl font-semibold tracking-[-0.025em]"
          >
            Mulai dari yang kamu suka
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih kategori untuk mempersempit pencarianmu.
          </p>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {categoryShortcuts.map((category) => (
            <Link
              key={category.label}
              to={category.href}
              className="group grid min-w-[15.5rem] snap-start grid-cols-[5.25rem_1fr] items-center gap-4 rounded-2xl border bg-card p-2.5 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-0"
            >
              <img
                src={category.image}
                alt=""
                width="160"
                height="160"
                loading="lazy"
                className="aspect-square size-[5.25rem] rounded-xl object-cover"
              />
              <span className="min-w-0 pr-2">
                <strong className="block font-semibold">{category.label}</strong>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {category.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="nearby-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2
              id="nearby-title"
              className="text-2xl font-semibold tracking-[-0.025em]"
            >
              Dekat kamu hari ini
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rescue Item aktif dengan pickup terdekat.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/discover">
              Lihat semua <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rescueItems
            .filter((item) => item.status === "active")
            .map((item) => (
              <RescueItemCard key={item.id} item={item} />
            ))}
        </div>
        <Button asChild variant="outline" className="mt-5 w-full sm:hidden">
          <Link to="/discover">
            Lihat semua Rescue Item <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section
        aria-labelledby="flow-title"
        className="grid gap-8 rounded-2xl bg-secondary p-6 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:p-10"
      >
        <div>
          <p className="text-sm font-semibold text-primary">
            Bukan sekadar diskon
          </p>
          <h2
            id="flow-title"
            className="mt-2 text-3xl font-semibold tracking-[-0.035em]"
          >
            Satu alur, tiga kesempatan.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Yang tidak terserap konsumen masuk Circular Routing menuju Organic
            Processor. Setiap hasil akhirnya tetap tercatat.
          </p>
          <Button asChild variant="outline" className="mt-6 bg-background">
            <Link to="/impact">
              Lihat dampakmu <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: ShoppingBag,
              title: "Temukan",
              copy: "Pilih Rescue Item yang masih baik di dekatmu.",
            },
            {
              icon: Sprout,
              title: "Selamatkan",
              copy: "Reservasi dan ambil langsung saat pickup window.",
            },
            {
              icon: Recycle,
              title: "Pulihkan",
              copy: "Surplus tersisa diarahkan ke pengolahan organik.",
            },
          ].map(({ icon: Icon, title, copy }) => (
            <li key={title} className="border-t border-primary/15 pt-4">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {copy}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <ImpactBreakdown {...demoImpact} />
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" aria-hidden="true" />
        Cirquo memakai pickup langsung, tanpa layanan pengantaran.
      </p>
    </div>
  );
}
