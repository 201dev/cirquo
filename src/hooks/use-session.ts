import { useState, useEffect } from "react";
import { loadToken } from "@/lib/auth-storage";

export function useSessionToken() {
  // undefined = still loading, null = no token
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadToken().then(setToken);
  }, []);

  return {
    token,
    isLoading: token === undefined,
  };
}
