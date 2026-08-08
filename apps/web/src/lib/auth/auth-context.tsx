"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  api,
  setAccessToken,
  setSessionExpiredHandler,
  toDisplayError,
} from "@/lib/api/client";

/**
 * Session context for the admin console (FR-SYS-002, FR-SYS-003).
 *
 * The access token itself lives in `lib/api/client.ts` as a module variable —
 * never here, never in `localStorage` — so an XSS payload has nothing to read
 * (architecture.md A-5). This context only tracks *who* is signed in, for the
 * UI to react to, and is gone on reload exactly like the token is; the refresh
 * cookie is what silently restores the session on the next request.
 *
 * UI guards built on this are convenience only. Every admin endpoint enforces
 * its own role check server-side (FR-SYS-006) — hiding a nav item here changes
 * nothing about what the API will accept.
 */

export type Role = "head" | "bhw" | "admin" | "sk" | "superadmin";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: string;
  assigned_area_ids: string[];
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  /** True while the initial `GET /auth/me` (session restore) is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (values: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const clearSession = React.useCallback(() => {
    setAccessToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  React.useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  // On mount, try the refresh cookie silently — a page reload should not force
  // a re-login if the httpOnly cookie is still valid.
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const refreshRes = await api.post<{ access_token: string }>("/auth/refresh");
        setAccessToken(refreshRes.data.access_token);
        const me = await api.get<SessionUser>("/auth/me");
        if (!cancelled) setUser(me.data);
      } catch {
        // No valid session — that is the normal logged-out state, not an error.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      setAccessToken(res.data.access_token);
      const me = await api.get<SessionUser>("/auth/me");
      setUser(me.data);
    } catch (error) {
      throw toDisplayError(error);
    }
  }, []);

  const register = React.useCallback(async (values: RegisterInput) => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/register", values);
      setAccessToken(res.data.access_token);
      const me = await api.get<SessionUser>("/auth/me");
      setUser(me.data);
    } catch (error) {
      throw toDisplayError(error);
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
