import { Suspense, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/common/app-logo";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { UnreadBadge } from "@/components/common/unread-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useUnreadNotificationCount } from "@/features/notifications/use-unread-notifications";

interface RoleShellProps {
  roleLabel: string;
  navigation: NavigationItem[];
  children?: ReactNode;
}

function RoleNavigation({ navigation }: { navigation: NavigationItem[] }) {
  const unreadCount = useUnreadNotificationCount();
  return (
    <nav aria-label="Navigasi utama" className="space-y-1.5">
      {navigation.map(({ href, icon: Icon, label, end }) => {
        // One badge, on whichever route this role uses for notifications.
        const badgeCount = href.endsWith("/notifications") ? unreadCount : 0;
        return (
          <NavLink
            key={href}
            end={end}
            to={href}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-14px_var(--primary)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <UnreadBadge
                  count={badgeCount}
                  className={isActive ? "bg-primary-foreground text-primary" : undefined}
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function RoleShell({ roleLabel, navigation, children }: RoleShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-svh bg-muted/35">
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-sidebar p-5 lg:flex lg:flex-col">
        <AppLogo />
        <Badge variant="secondary" className="mt-3 w-fit">
          {roleLabel}
        </Badge>
        <div className="mt-8">
          <RoleNavigation navigation={navigation} />
        </div>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-background/70 p-4">
            <p className="text-sm font-semibold">{user?.name ?? 'Akun'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {user?.email ?? 'Semarang · Indonesia'}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Buka navigasi"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-5">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <AppLogo />
                </SheetTitle>
              </SheetHeader>
              <Badge variant="secondary" className="mt-3">
                {roleLabel}
              </Badge>
              <div className="mt-8">
                <RoleNavigation navigation={navigation} />
              </div>
            </SheetContent>
          </Sheet>
          <p className="font-medium">{roleLabel}</p>
          <div className="ml-auto">
            <Button variant="ghost" size="icon" aria-label="Keluar" onClick={handleLogout}>
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl p-4 focus:outline-none sm:p-6 lg:p-8"
        >
          {children ?? (
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
