import { Suspense } from "react";
import {
  CircleUserRound,
  Compass,
  Home,
  Leaf,
  LogOut,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";
import { DemoNotice } from "@/components/common/demo-notice";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Beranda", icon: Home, end: true },
  { href: "/discover", label: "Jelajah", icon: Compass },
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/impact", label: "Dampak", icon: Leaf },
  { href: "/profile", label: "Profil", icon: CircleUserRound },
];

export function ConsumerLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-svh bg-background">
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center px-4 sm:px-6">
          <AppLogo />
          <nav
            className="ml-5 hidden h-full items-center gap-1 md:flex"
            aria-label="Navigasi konsumen"
          >
            {navigation.map(({ href, label, icon: Icon, end }) => (
              <NavLink
                key={href}
                end={end}
                to={href}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-full items-center gap-2 px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                    isActive
                      ? "text-foreground after:bg-primary"
                      : "text-muted-foreground after:bg-transparent hover:text-foreground",
                  )
                }
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="outline"
            className="ml-auto hidden max-w-56 justify-start gap-2 rounded-full bg-background lg:flex"
            aria-label="Lokasi saat ini: Tembalang, Semarang"
          >
            <MapPin className="text-primary" aria-hidden="true" />
            <span className="truncate">Tembalang, Semarang</span>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keluar"
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-6 pb-28 focus:outline-none sm:px-6 sm:py-8 sm:pb-12"
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
