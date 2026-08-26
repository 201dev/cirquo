import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { PageLoader } from "@/components/common/page-loader";
import { homeForRole, safeReturnTo } from "@/lib/role-home";
import type { UserRole } from "@/types/domain";

function loginRoute(pathname: string, search: string) {
  return `/login?returnTo=${encodeURIComponent(`${pathname}${search}`)}`;
}

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
        to={loginRoute(location.pathname, location.search)}
        replace
      />
    );
  }

  return <Outlet />;
}

/**
 * Wraps role-specific routes. The client guard is for navigation UX only;
 * Convex guards remain the authorization boundary.
 */
export function RoleRoute({
  role,
  requiresVerified = false,
}: {
  role: UserRole;
  requiresVerified?: boolean;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={loginRoute(location.pathname, location.search)}
        replace
      />
    );
  }

  if (user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;

  if (requiresVerified && role !== "consumer" && role !== "admin") {
    if (!user.profile) return <Navigate to={`/${role}/onboarding`} replace />;
    if (user.profile.verificationStatus !== "verified") {
      return <Navigate to="/pending-verification" replace />;
    }
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
  const location = useLocation();

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

  const returnTo = safeReturnTo(
    new URLSearchParams(location.search).get("returnTo"),
  );

  return <Navigate to={returnTo ?? homeForRole(user.role)} replace />;
}
