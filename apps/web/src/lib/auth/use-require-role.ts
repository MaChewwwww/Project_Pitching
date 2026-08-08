"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { useAuth, type Role } from "./auth-context";

/** Where a signed-in user belongs when they hit a screen their role can't use. */
const ROLE_HOME: Record<Role, Route> = {
  head: "/portal",
  bhw: "/admin",
  admin: "/admin",
  sk: "/admin",
  superadmin: "/admin",
};

/**
 * Redirect away if the signed-in user's role is not in `allowed`.
 *
 * **Convenience only** — the identical check runs server-side on every admin
 * endpoint via `require_role(...)` (`core/deps.py`). This hook exists so a BHW
 * does not see a config screen they cannot use, not to keep anyone out; the API
 * is what keeps anyone out (FR-SYS-006).
 *
 * `superadmin` always passes, matching `require_role`'s own behaviour.
 */
export function useRequireRole(...allowed: Role[]): {
  user: ReturnType<typeof useAuth>["user"];
  isLoading: boolean;
} {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "superadmin" && !allowed.includes(user.role)) {
      router.replace(ROLE_HOME[user.role]);
    }
    // `allowed` is a rest param — safe to depend on its stringified form only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, allowed.join(",")]);

  return { user, isLoading };
}
