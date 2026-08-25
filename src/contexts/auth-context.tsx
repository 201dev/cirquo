/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadToken, saveToken, clearToken } from "@/lib/auth-storage";

type Profile =
  | { kind: "none" }
  | {
      kind: "merchant";
      merchantId: string;
      name: string;
      city: string;
      verificationStatus: "pending" | "verified" | "rejected" | "suspended";
    }
  | {
      kind: "processor";
      processorId: string;
      name: string;
      city: string;
      facilityType: string;
      verificationStatus: "pending" | "verified" | "rejected" | "suspended";
    };

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: "consumer" | "merchant" | "processor" | "admin";
  phone?: string;
  status: "active" | "suspended";
  createdAt: number;
  profile: Profile;
};

type AuthContextValue = {
  /** null = not signed in, undefined should never leak (isLoading guards it) */
  user: AuthUser | null;
  /** true while token is being loaded from storage OR getCurrentUser is in flight */
  isLoading: boolean;
  /** convenience: user !== null */
  isAuthenticated: boolean;
  /** the raw session token, for passing to mutations */
  sessionToken: string | null;
  /** call after login/register to update the stored token and trigger re-query */
  setSession: (token: string) => Promise<void>;
  /** call to logout — clears token, calls backend, resets state */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Token lifecycle: undefined = loading from storage, null = no token, string = have token
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const logoutMutation = useMutation(api.auth.logout);

  // Load token from storage on mount
  useEffect(() => {
    loadToken().then((t) => setToken(t ?? null));
  }, []);

  // Query getCurrentUser — skipped while token is unknown or absent
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { sessionToken: token } : "skip",
  );

  // Determine loading state
  const isTokenLoading = token === undefined;
  // currentUser === undefined means the Convex query is still in flight
  const isQueryLoading = token !== null && token !== undefined && currentUser === undefined;
  const isLoading = isTokenLoading || isQueryLoading;

  // If getCurrentUser returns null with a token present, the session is invalid — clear it
  useEffect(() => {
    if (token && currentUser === null) {
      clearToken().then(() => setToken(null));
    }
  }, [token, currentUser]);

  const setSession = useCallback(async (newToken: string) => {
    await saveToken(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ sessionToken: token });
      } catch {
        // Best-effort — the session may already be gone
      }
    }
    await clearToken();
    setToken(null);
  }, [token, logoutMutation]);

  const user: AuthUser | null =
    currentUser && typeof currentUser === "object" && "_id" in currentUser
      ? (currentUser as AuthUser)
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        sessionToken: typeof token === "string" ? token : null,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
