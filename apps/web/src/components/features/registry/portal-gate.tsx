"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdOut } from "@/lib/api/registry-types";

/**
 * Base gate for `(portal)`. Two checks stacked: role (`useRequireRole`,
 * convenience only — FR-SYS-006), then "has this head finished onboarding?"
 * (`GET /me/household` — `null` means no, redirect to `/portal/onboarding`).
 *
 * The onboarding page itself must render past this gate without being bounced
 * back into itself, which is why the redirect is skipped there.
 */
export function PortalGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: roleLoading } = useRequireRole("head");
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname === "/portal/onboarding";

  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ["me", "household"],
    queryFn: () => api.get<HouseholdOut | null>("/me/household").then((r) => r.data),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (roleLoading || householdLoading || !user) return;
    if (household === null && !isOnboarding) {
      router.replace("/portal/onboarding");
    } else if (household && isOnboarding) {
      // Already onboarded — no reason to fill the form out again.
      router.replace("/portal");
    }
  }, [roleLoading, householdLoading, household, isOnboarding, user, router]);

  if (roleLoading || !user || householdLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
