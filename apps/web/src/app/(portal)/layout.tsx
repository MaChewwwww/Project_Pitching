"use client";

import { AuthProvider } from "@/lib/auth/auth-context";
import { PortalGate } from "@/components/features/registry/portal-gate";

/**
 * `(portal)` — resident self-service. Client-side rendered, role-guarded
 * (`apps/web/src/app/(portal)/README.md`, architecture.md A-12).
 *
 * Built here: onboarding (`/portal/onboarding`) and a read-only dashboard
 * (`/portal`). Everything else in the README's scope (safety check-in, alerts
 * feed, editing) is future work.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalGate>{children}</PortalGate>
    </AuthProvider>
  );
}
