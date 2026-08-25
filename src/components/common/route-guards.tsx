import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { PageLoader } from "@/components/common/page-loader";

/**
 * Wraps routes that require authentication.
 * Shows a neutral loader while session is being restored (prevents login flash).
 * Redirects unauthenticated users to /login with a returnTo param.
 */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();
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
    return <Navigate to="/auth/continue" replace />;
  }

  return <Outlet />;
}

export function PostAuthRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "merchant" || user.role === "processor") {
    if (!user.profile) {
      return <Navigate to={`/${user.role}/onboarding`} replace />;
    }
    if (user.profile.verificationStatus !== "verified") {
      return <Navigate to="/pending-verification" replace />;
    }
  }

  const homeRoutes: Record<typeof user.role, string> = {
    consumer: "/",
    merchant: "/merchant",
    processor: "/processor",
    admin: "/admin",
  };

  return <Navigate to={homeRoutes[user.role]} replace />;
}
