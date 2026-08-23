import { Suspense } from "react";
import {
  CircleUserRound,
  Compass,
  Home,
  Leaf,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";
import { DemoNotice } from "@/components/common/demo-notice";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Beranda", icon: Home, end: true },
  { href: "/explore", label: "Jelajah", icon: Compass },
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/impact", label: "Dampak", icon: Leaf },
  { href: "/profile", label: "Profil", icon: CircleUserRound },
];

export function ConsumerLayout() {
  return (
    <div className="min-h-svh bg-background">
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center px-4 sm:px-6">
          <AppLogo />
          <Button
            variant="ghost"
            className="ml-2 hidden max-w-48 justify-start gap-2 lg:flex"
            aria-label="Lokasi saat ini: Tembalang, Semarang"
          >
            <MapPin className="text-primary" aria-hidden="true" />
            <span className="truncate">Tembalang, Semarang</span>
          </Button>
          <nav
            className="ml-auto hidden items-center gap-1 sm:flex"
            aria-label="Navigasi konsumen"
          >
            {navigation.map(({ href, label, icon: Icon, end }) => (
              <NavLink
                key={href}
                end={end}
                to={href}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6 pb-28 focus:outline-none sm:px-6 sm:py-8 sm:pb-12"
      >
        <DemoNotice className="mb-5 flex w-full justify-center sm:w-fit" />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        aria-label="Navigasi konsumen seluler"
      >
        {navigation.map(({ href, label, icon: Icon, end }) => (
          <NavLink
            key={href}
            end={end}
            to={href}
            className={({ isActive }) =>
              cn(
                "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-5" aria-hidden="true" />
                {label}
                {isActive ? (
                  <span className="absolute top-1.5 h-1 w-5 rounded-full bg-primary" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
