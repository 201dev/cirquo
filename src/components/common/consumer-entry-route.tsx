import { Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "@/components/common/page-loader";
import { useAuth } from "@/contexts/auth-context";

export function ConsumerEntryRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/welcome" replace />;

  return <Outlet />;
}
