import { Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import {
  CircleUserRound,
  Compass,
  Home,
  LogIn,
  ShoppingBag,
  Leaf,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const mobileNavigation = [
  { href: "/home", label: "Beranda", icon: Home, end: true },
  { href: "/explore", label: "Jelajah", icon: Compass },
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/impact", label: "Dampak", icon: Leaf },
  { href: "/profile", label: "Profil", icon: CircleUserRound },
];

/**
 * A visitor who has not signed in gets the two surfaces that need no account,
 * plus the way in. The account tabs are left out rather than shown and bounced:
 * a tab that always redirects to login teaches the reader nothing.
 */
const guestMobileNavigation = [
  { href: "/home", label: "Beranda", icon: Home, end: true },
  { href: "/explore", label: "Jelajah", icon: Compass },
  { href: "/login", label: "Masuk", icon: LogIn },
];

export function ConsumerLayout() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith("/checkout/");
  const isAndroid = Capacitor.getPlatform() === "android";
  const showFooter = !isCheckout && !isAndroid;
  const bottomNavigation = isAuthenticated
    ? mobileNavigation
    : guestMobileNavigation;

  return (
    <div
      className={cn(
        "min-h-svh bg-background",
        /*
          Clearance for the fixed tab bar belongs to the layout that renders it.
          It used to live on `SiteFooter`, which also serves the landing route —
          a route with no tab bar, which therefore carried 4.5rem of dead space.
          Android keeps its own allowance on `main` below.
          ponytail: Android's 6rem is a pre-existing guess; the bar is 4.5rem.
          Left alone because it cannot be verified from here.
        */
        !isAndroid && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="site-container py-6 focus:outline-none sm:py-8"
        style={
          isAndroid
            ? { paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {/* Checkout owns the bottom of the viewport with its own pay bar. */}
      {showFooter && <SiteFooter />}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden",
          bottomNavigation.length === 3 ? "grid-cols-3" : "grid-cols-5",
        )}
        aria-label="Navigasi konsumen seluler"
      >
        {bottomNavigation.map(({ href, label, icon: Icon, end }) => (
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
