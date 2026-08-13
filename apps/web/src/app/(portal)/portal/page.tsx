"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera, Pencil, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { PortalEvacuationStatusCard } from "@/components/features/portal/portal-evacuation-status-card";

/**
 * Read-only resident dashboard, plus a link into safety check-in (FR-SAF-001
 * added it this pass — this docstring previously said that was out of
 * scope). `PortalGate` guarantees a household exists by the time this
 * renders. Still deliberately minimal beyond that: no editing (FR-REG-009),
 * no alerts feed here.
 */
export default function PortalDashboardPage() {
  const { user } = useAuth();
  const { data: household, isLoading } = useQuery({
    queryKey: ["me", "household"],
    queryFn: () => api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
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
              <p className="text-body-sm text-neutral-500">Household Number</p>
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
              Your household hasn&apos;t been verified by the barangay yet — this
              doesn&apos;t affect alerts or assistance, verification is just a confidence
              check.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <PortalEvacuationStatusCard />

      <Button asChild variant="outline">
        <Link href="/portal/household/edit">
          <Pencil aria-hidden className="size-4" />
          Edit household details
        </Link>
      </Button>

      <Button asChild variant="outline">
        <Link href="/portal/safety">
          <ShieldCheck aria-hidden className="size-4" />
          Safety check-in
        </Link>
      </Button>

      <Button asChild variant="outline">
        <Link href="/portal/report">
          <Camera aria-hidden className="size-4" />
          Report an incident
        </Link>
      </Button>
    </div>
  );
}
