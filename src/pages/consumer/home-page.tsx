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
import heroImage from "@/assets/cirquo-hero.webp";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoImpact, rescueItems } from "@/constants/mock-data";

export default function ConsumerHomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="hero-reveal relative isolate grid min-h-[28rem] overflow-hidden rounded-2xl bg-foreground text-background lg:min-h-[31rem] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <p className="flex items-center gap-2 text-sm font-medium text-background/75">
            <MapPin className="size-4" />
            Tembalang, Semarang
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.6rem]">
            Makanan baik punya kesempatan kedua.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-background/75 sm:text-lg">
            Temukan surplus pangan di sekitar, bayar lebih hemat, lalu ambil
            langsung di merchant pada waktu yang ditentukan.
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-8 flex max-w-xl gap-2 rounded-xl bg-background p-2 text-foreground shadow-[0_18px_40px_-20px_black]"
            role="search"
          >
            <Search
              className="ml-2 mt-3 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="Cari roti, makanan, atau merchant"
              aria-label="Cari Rescue Item"
            />
            <Button type="submit" className="shrink-0">
              Cari
            </Button>
          </form>
          <p className="mt-3 flex items-center gap-2 text-xs text-background/65">
            <Clock3 className="size-3.5" />
            Pickup langsung — Cirquo tidak menyediakan pengantaran.
          </p>
        </div>
        <div className="absolute inset-0 min-h-0 lg:relative lg:min-h-full">
          <img
            src={heroImage}
            alt="Pekerja toko roti menata surplus makanan yang masih baik"
            width="1600"
            height="863"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-center lg:[mask-image:linear-gradient(to_right,transparent_0%,black_25%)]"
          />
          <div className="absolute inset-0 bg-foreground/75 lg:hidden" />
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
              Rescue Item aktif dengan waktu pickup terdekat.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/explore">
              Lihat semua <ArrowRight />
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
          <Link to="/explore">
            Lihat semua Rescue Item <ArrowRight />
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
              Lihat dampakmu <ArrowRight />
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
          ].map(({ icon: Icon, title, copy }, index) => (
            <li key={title} className="border-t border-primary/15 pt-4">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-primary/55">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {copy}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <ImpactBreakdown {...demoImpact} />
    </div>
  );
}
