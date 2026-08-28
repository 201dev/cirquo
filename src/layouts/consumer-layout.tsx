import { Suspense } from "react";
import {
  CircleUserRound,
  Compass,
  Home,
  LogOut,
  Search,
  ShoppingBag,
  Leaf,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { SiteFooter } from "@/components/common/site-footer";
import { ThemeToggle } from "@/components/common/theme-toggle";
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
import { cn } from "@/lib/utils";
import { useState, type FormEvent } from "react";

const quickNavigation = [
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/impact", label: "Dampak", icon: Leaf },
];

const mobileNavigation = [
  { href: "/", label: "Beranda", icon: Home, end: true },
  { href: "/explore", label: "Jelajah", icon: Compass },
  { href: "/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/impact", label: "Dampak", icon: Leaf },
  { href: "/profile", label: "Profil", icon: CircleUserRound },
];

export function ConsumerLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const isCheckout = pathname.startsWith("/checkout/");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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

          <nav className="hidden items-center gap-1 md:flex ml-auto">
            {quickNavigation.map(({ href, label, icon: Icon }) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeToggle />
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
      {!isCheckout && <SiteFooter />}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        aria-label="Navigasi konsumen seluler"
      >
        {mobileNavigation.map(({ href, label, icon: Icon, end }) => (
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
