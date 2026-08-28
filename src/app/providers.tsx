import type { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { convexClient } from "@/lib/convex";
import {
  AuthProvider,
  AuthUnavailableProvider,
} from "@/contexts/auth-context";

export function AppProviders({ children }: { children: ReactNode }) {
  const themed = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors closeButton />
    </ThemeProvider>
  );

  // AuthProvider must be inside ConvexProvider (it calls useQuery/useMutation)
  return convexClient ? (
    <ConvexProvider client={convexClient}>
      <AuthProvider>{themed}</AuthProvider>
    </ConvexProvider>
  ) : (
    <AuthUnavailableProvider>{themed}</AuthUnavailableProvider>
  );
}
