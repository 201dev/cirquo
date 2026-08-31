import type { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import { convexClient } from "@/lib/convex";
import {
  AuthProvider,
  AuthUnavailableProvider,
} from "@/contexts/auth-context";

export function AppProviders({ children }: { children: ReactNode }) {
  const app = (
    <>
      {children}
      <Toaster richColors closeButton />
    </>
  );

  // AuthProvider must be inside ConvexProvider (it calls useQuery/useMutation)
  return convexClient ? (
    <ConvexProvider client={convexClient}>
      <AuthProvider>{app}</AuthProvider>
    </ConvexProvider>
  ) : (
    <AuthUnavailableProvider>{app}</AuthUnavailableProvider>
  );
}
