"use client";

import { AuthProvider } from "@/lib/auth/auth-context";

/**
 * `(auth)` — login, registration, password reset. Standalone, no shell
 * (`README.md`), but still needs `AuthProvider` since `LoginForm` calls
 * `useAuth()`. `(admin)` has its own copy for the same reason — two route
 * groups, two mount points, one provider component.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
