"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { HouseholdOut } from "@/lib/api/registry-types";

/**
 * Read-only resident dashboard. `PortalGate` guarantees a household exists by
 * the time this renders. Deliberately minimal — no editing (FR-REG-009),
 * no safety check-in or alerts feed (FR-SAF-*): those remain the
 * `(portal)/README.md`'s future scope, not this pass's.
 */
export default function PortalDashboardPage() {
  const { user } = useAuth();
  const { data: household, isLoading } = useQuery({
    queryKey: ["me", "household"],
    queryFn: () => api.get<HouseholdOut | null>("/me/household").then((r) => r.data),
  });

  if (isLoading || !household) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title={`Welcome,`}
        titleAccent={user?.full_name ?? ""}
        description="Your household is registered with the barangay."
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm text-neutral-500">Reference number</p>
              <p className="text-h3 tabular text-neutral-900">{household.reference_no}</p>
            </div>
            {household.verified_at ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Badge tone="neutral">Unverified</Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-overline text-neutral-500">Area</dt>
              <dd className="text-body text-neutral-900">{household.area_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-overline text-neutral-500">Household members</dt>
              <dd className="text-body text-neutral-900">{household.member_count}</dd>
            </div>
          </dl>

          {household.street_address ? (
            <div>
              <dt className="text-overline text-neutral-500">Address</dt>
              <dd className="text-body text-neutral-900">{household.street_address}</dd>
            </div>
          ) : null}

          {!household.verified_at ? (
            <p className="text-body-sm text-neutral-500">
              Your household hasn&apos;t been verified by the barangay yet — this doesn&apos;t affect
              alerts or assistance, verification is just a confidence check.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
