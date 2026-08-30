import { Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import {
  CircleUserRound,
  Compass,
  Home,
  LogIn,
  LogOut,
  Search,
  ShoppingBag,
  Leaf,
  Bell,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { SiteFooter } from "@/components/common/site-footer";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UnreadBadge } from "@/components/common/unread-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useUnreadNotificationCount } from "@/features/notifications/use-unread-notifications";
import { cn } from "@/lib/utils";
import { useState, type FormEvent } from "react";

/**
 * Icon-only shortcuts that sit beside the theme toggle and account menu. Dampak
 * is deliberately absent: it already has an entry in the account dropdown, and
 * repeating it here spent header width on a link nobody reaches for mid-task.
 */
const quickNavigation = [
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
];

const mobileNavigation = [
  { href: "/", label: "Beranda", icon: Home, end: true },
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
  { href: "/", label: "Beranda", icon: Home, end: true },
  { href: "/explore", label: "Jelajah", icon: Compass },
  { href: "/login", label: "Masuk", icon: LogIn },
];

export function ConsumerLayout() {
  const { logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [query, setQuery] = useState("");
  const unreadCount = useUnreadNotificationCount();
  const isCheckout = pathname.startsWith("/checkout/");
  const showFooter = !isCheckout && Capacitor.getPlatform() !== "android";
  const bottomNavigation = isAuthenticated
    ? mobileNavigation
    : guestMobileNavigation;
  const returnTo = `${pathname}${search}`;

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    navigate(`/explore${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  };

  return (
    <div className="min-h-svh bg-background">
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4 sm:px-6">
          <AppLogo />
          <form
            onSubmit={handleSearch}
            className="ml-4 hidden flex-1 max-w-sm items-center rounded-full bg-secondary px-4 md:flex"
            role="search"
          >
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="Cari makanan atau Mitra"
              aria-label="Cari Rescue Item"
            />
          </form>

          {/*
            One flex row for every header control. As two separate containers the
            nav and the toggle/account pair inherited the header's wider gap-4
            between them, which read as a hole beside the bell.
          */}
          <div className="ml-auto flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex">
              {isAuthenticated
                ? quickNavigation.map(({ href, label, icon: Icon }) => (
                    <NavLink
                      key={href}
                      to={href}
                      className={({ isActive }) =>
                        cn(
                          "relative grid size-11 place-items-center rounded-full transition-colors",
                          isActive
                            ? "text-primary bg-secondary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {/*
                        The icon carries no text, so the label stays in the accessible
                        name — as real text rather than aria-label, which would replace
                        the unread count instead of reading alongside it.
                      */}
                      <span className="sr-only">{label}</span>
                      <UnreadBadge
                        count={href === "/notifications" ? unreadCount : 0}
                        className="absolute -right-0.5 -top-0.5 border-2 border-background"
                      />
                    </NavLink>
                  ))
                : null}
            </nav>

            <ThemeToggle />
            {isAuthenticated ? (
              <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Menu akun"
              >
                <CircleUserRound aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-base">
                {user?.name || "Akun"}
              </DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {user?.email || "Tidak masuk"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/orders" className="flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  Pesanan
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/impact" className="flex items-center gap-2">
                  <Leaf className="size-4" />
                  Dampak Saya
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/notifications" className="flex w-full items-center gap-2">
                  <Bell className="size-4" />
                  Notifikasi
                  <UnreadBadge count={unreadCount} className="ml-auto" />
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2">
                  <CircleUserRound className="size-4" />
                  Profil
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="size-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            ) : (
              /*
                returnTo carries the page the visitor was reading, so signing in
                from an item page comes back to that item instead of dropping
                them on the homepage to find it again.
              */
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <NavLink to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
                    Masuk
                  </NavLink>
                </Button>
                <Button size="sm" asChild>
                  <NavLink to="/register">Daftar</NavLink>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8"
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
