import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { PageLoader } from "@/components/common/page-loader";

/**
 * Wraps routes that require authentication.
 * Shows a neutral loader while session is being restored (prevents login flash).
 * Redirects unauthenticated users to /login with a returnTo param.
 */
export function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles?: readonly string[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is logged in but wrong role — send them to their own home
    const homeRoutes: Record<string, string> = {
      consumer: "/",
      merchant: "/merchant",
      processor: "/processor",
      admin: "/admin",
    };
    return <Navigate to={homeRoutes[user.role] || "/"} replace />;
  }

  return <Outlet />;
}

/**
 * Wraps auth pages (login, register).
 * If already authenticated, redirects to the role-appropriate home.
 */
export function GuestRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <PageLoader />;

  if (isAuthenticated && user) {
    const homeRoutes: Record<string, string> = {
      consumer: "/",
      merchant: "/merchant",
      processor: "/processor",
      admin: "/admin",
    };
    return <Navigate to={homeRoutes[user.role] || "/"} replace />;
  }

  return <Outlet />;
}
