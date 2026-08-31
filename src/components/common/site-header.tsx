import { Bell, CircleUserRound, LogOut, MapPin, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UnreadBadge } from "@/components/common/unread-badge";
import { useAuth } from "@/contexts/auth-context";
import { useUnreadNotificationCount } from "@/features/notifications/use-unread-notifications";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Beranda", to: "/", end: true },
  { label: "Jelajahi Rescue Item", to: "/explore", end: false },
] as const;

/** In-page sections of the landing route, so they stay plain anchors. */
const anchors = [
  { label: "Tentang Kami", href: "/#kenapa" },
  { label: "Download", href: "/#download" },
] as const;

const linkClass =
  "rounded-sm py-2 text-sm font-semibold text-[#5b5b5b] transition-colors hover:text-[#272727] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative whitespace-nowrap",
    linkClass,
    isActive &&
      "text-[#272727] after:absolute after:inset-x-0 after:-bottom-[13px] after:h-px after:bg-[#272727]",
  );

/**
 * Below `lg` the nav links have nowhere to go, and the landing route has no
 * bottom tab bar to fall back on — without this a phone visitor cannot reach
 * Jelajahi, Tentang Kami, or Download at all. "Masuk" lives here too below
 * `sm`, because logo + menu + Masuk + Daftar overflows a 320px viewport.
 */
function MobileNav({ loginTo }: { loginTo: string | null }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Closing on click is handled by SheetClose; this covers back/forward, where
  // Radix would otherwise leave a stale sheet holding focus.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0 rounded-full lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[17rem] px-0 py-5">
        <SheetHeader className="px-5">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Navigasi utama seluler" className="mt-5 grid">
          {navigation.map((item) => (
            <SheetClose asChild key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 items-center px-5 text-sm font-semibold text-[#5b5b5b]",
                    isActive && "bg-secondary text-[#272727]",
                  )
                }
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
          {anchors.map((anchor) => (
            <SheetClose asChild key={anchor.href}>
              <a
                href={anchor.href}
                className="flex min-h-12 items-center px-5 text-sm font-semibold text-[#5b5b5b]"
              >
                {anchor.label}
              </a>
            </SheetClose>
          ))}
        </nav>
        <p className="mt-5 flex items-center gap-1.5 border-t px-5 pt-5 text-xs font-medium text-[#5b5b5b]">
          <MapPin className="size-4 shrink-0 text-[#1bac4b]" aria-hidden="true" />
          Tembalang, Semarang · radius 30 km
        </p>
        {/* Only below `sm`, and only for a visitor who is not signed in — the
            bar itself has no room for Masuk at that width. */}
        {loginTo !== null ? (
          <div className="px-5 pt-4 sm:hidden">
            <SheetClose asChild>
              <Link
                to={loginTo}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#1bac4b]/50 px-4 text-sm font-medium"
              >
                Masuk
              </Link>
            </SheetClose>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** Shared public chrome for the landing page and consumer routes. */
export function SiteHeader() {
  const { isAuthenticated, logout, user } = useAuth();
  const unreadCount = useUnreadNotificationCount();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const loginTo = `/login?returnTo=${encodeURIComponent(`${pathname}${search}`)}`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9dedb]/70 bg-white/95 backdrop-blur-xl">
      <div className="site-container flex h-[var(--site-header-h)] items-center gap-2">
        <MobileNav loginTo={isAuthenticated ? null : loginTo} />
        <AppLogo className="min-w-0 gap-2.5 text-[#1bac4b] [&>img]:h-9 [&>img]:w-auto [&>span]:text-lg sm:gap-3 sm:[&>img]:h-10 sm:[&>span]:text-xl" />

        <nav
          aria-label="Navigasi utama"
          className="ml-8 hidden items-center gap-6 lg:flex xl:ml-12"
        >
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
          {anchors.map((anchor) => (
            <a key={anchor.href} href={anchor.href} className={linkClass}>
              {anchor.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <p className="hidden h-10 items-center gap-1.5 rounded-full border border-[#1bac4b]/50 px-3 text-xs font-medium xl:flex">
            <MapPin className="size-4 text-[#1bac4b]" aria-hidden="true" />
            Tembalang, Semarang
          </p>

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label="Notifikasi"
              >
                <NavLink to="/notifications">
                  <Bell className="size-5" aria-hidden="true" />
                  <UnreadBadge
                    count={unreadCount}
                    className="absolute -right-0.5 -top-0.5 border-2 border-white"
                  />
                </NavLink>
              </Button>
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
                    <NavLink to="/orders">Pesanan</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/impact">Dampak Saya</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile">Profil</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              {/* Below `sm` this lives in the mobile sheet instead. */}
              <Link
                to={loginTo}
                className="hidden h-10 items-center justify-center rounded-full border border-[#1bac4b]/50 px-4 text-sm font-medium transition-colors hover:bg-[#edf7f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#1bac4b] px-4 text-sm font-medium text-[#f7faf8] transition-colors hover:bg-[#107333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
