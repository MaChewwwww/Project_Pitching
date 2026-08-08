"use client";

import * as React from "react";

import { useRequireRole } from "@/lib/auth/use-require-role";
import { AdminShell } from "./admin-shell";

/**
 * Base gate for the whole `(admin)` route group — any staff role may enter the
 * console; individual screens (e.g. `/admin/config`) call `useRequireRole`
 * again with a narrower list. Convenience only (FR-SYS-006) — see
 * `use-require-role.ts`.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole("bhw", "admin", "sk");

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
