import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import heroImage from "@/assets/cirquo-hero.webp";
import { AppLogo } from "@/components/common/app-logo";
import { DemoNotice } from "@/components/common/demo-notice";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { ThemeToggle } from "@/components/common/theme-toggle";

export function AuthLayout() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[.9fr_1.1fr]">
      <RouteFocus />
      <aside className="relative hidden overflow-hidden bg-foreground lg:block">
        <img
          src={heroImage}
          alt="Merchant menata makanan surplus yang masih baik"
          width="1600"
          height="863"
          className="absolute inset-0 size-full object-cover opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-background">
          <p className="text-sm font-semibold text-background/70">
            Cirquo · Semarang
          </p>
          <p className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.04em]">
            Selamatkan makanan. Pulihkan sisanya. Catat setiap kilogram.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-background/70">
            Satu platform untuk consumer, merchant, Organic Processor, dan
            admin.
          </p>
        </div>
      </aside>
      <main
        tabIndex={-1}
        className="flex min-h-svh flex-col focus:outline-none"
      >
        <header className="flex h-[4.5rem] items-center border-b px-5 sm:px-8">
          <AppLogo />
          <DemoNotice compact className="ml-auto" />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-lg">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
