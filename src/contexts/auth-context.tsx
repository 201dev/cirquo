/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { clearToken, loadToken, saveToken } from "@/lib/auth-storage";

type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

type Profile =
  | {
      id: Id<"merchants">;
      type: "merchant";
      name: string;
      verificationStatus: VerificationStatus;
      rejectionReason?: string;
    }
  | {
      id: Id<"processors">;
      type: "processor";
      name: string;
      verificationStatus: VerificationStatus;
      rejectionReason?: string;
    }
  | null;

export type AuthUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "consumer" | "merchant" | "processor" | "admin";
  phone?: string;
  status: "active" | "suspended";
  createdAt: number;
  profile: Profile;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  setSession: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within <AuthProvider>");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const logoutMutation = useMutation(api.auth.logout);

  useEffect(() => {
    let active = true;

    loadToken()
      .then((storedToken) => {
        if (active) setToken(storedToken ?? null);
      })
      .catch(() => {
        if (active) setToken(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { sessionToken: token } : "skip",
  );

  const isTokenLoading = token === undefined;
  const isQueryLoading = Boolean(token) && currentUser === undefined;
  const isLoading = isTokenLoading || isQueryLoading;

  useEffect(() => {
    if (token && currentUser === null) {
      clearToken().finally(() => setToken(null));
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
        // Local storage is still cleared if the server is unreachable.
      }
    }
    try {
      await clearToken();
    } finally {
      setToken(null);
    }
  }, [token, logoutMutation]);

  const user = currentUser === undefined ? null : currentUser;

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

export function AuthUnavailableProvider({ children }: { children: ReactNode }) {
  const setSession = useCallback(async () => {
    throw new Error("Backend Convex belum terhubung.");
  }, []);
  const logout = useCallback(async () => {
    await clearToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
