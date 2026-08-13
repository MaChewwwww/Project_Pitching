"use client";

import * as React from "react";

import { PageSplashLoader } from "@/components/common/page-splash-loader";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { AdminShell } from "./admin-shell";

/**
 * Base gate for the whole `(admin)` route group — any staff role may enter the
 * console; individual screens call `useRequireRole`
 * again with a narrower list. Convenience only (FR-SYS-006) — see
 * `use-require-role.ts`.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole("bhw", "admin", "sk");
  const portalReady = !isLoading && !!user;

  return (
    <>
      <PageSplashLoader
        minDurationMs={1500}
        ready={portalReady}
        loadingLabel="Loading barangay console..."
      />
      {portalReady ? <AdminShell>{children}</AdminShell> : null}
    </>
  );
}
