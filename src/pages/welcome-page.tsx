import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/cirquo-hero.webp";
import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <main className="welcome-enter relative isolate min-h-[100dvh] overflow-hidden bg-foreground text-white">
      <img
        src={heroImage}
        alt="Merchant menyiapkan makanan surplus yang masih baik untuk diambil"
        width="1600"
        height="863"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover object-[68%_center] sm:object-[62%_center] lg:object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,31,22,.18)_0%,rgba(8,31,22,.2)_35%,rgba(8,31,22,.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(8,31,22,.9)_0%,rgba(8,31,22,.66)_36%,rgba(8,31,22,.06)_72%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:px-10">
        <header className="flex min-h-14 items-center justify-between">
          <AppLogo className="text-white" />
          <Button
            asChild
            variant="ghost"
            className="border border-white/35 bg-black/15 text-white backdrop-blur-md hover:bg-black/30 hover:text-white"
          >
            <Link to="/login">
              <LogIn aria-hidden="true" />
              Masuk
            </Link>
          </Button>
        </header>

        <section className="mt-auto max-w-xl pb-3 pt-24 sm:pb-8 lg:my-auto lg:pb-0 lg:pt-4">
          <h1 className="max-w-[15ch] text-[clamp(2.8rem,8vw,5.6rem)] font-semibold leading-[.98] tracking-[-0.04em] text-balance">
            Selamatkan makanan baik.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/82 sm:text-lg">
            Temukan Rescue Item terdekat, bayar lebih hemat, lalu ambil langsung
            sesuai pickup window.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="min-h-13 bg-white px-6 text-foreground shadow-[0_16px_40px_-20px_rgba(0,0,0,.7)] hover:bg-white/90"
            >
              <Link to="/register">
                Mulai menyelamatkan
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="min-h-13 border border-white/35 bg-black/15 px-6 text-white backdrop-blur-md hover:bg-black/30 hover:text-white"
            >
              <Link to="/discover">Lihat Rescue Item</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
