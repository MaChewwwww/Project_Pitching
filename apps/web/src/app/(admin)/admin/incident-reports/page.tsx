"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { IncidentReviewTable } from "@/components/features/safety/incident-review-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { Page } from "@/lib/api/public-types";
import type { IncidentReportOut } from "@/lib/api/safety-types";

/**
 * FR-SAF-015/016 — reports submitted by residents, reviewed by staff.
 * `refetchInterval` matches the other emergency-response screens so a
 * genuinely new report during an event surfaces without a manual refresh.
 */
export default function AdminIncidentReportsPage() {
  useRequireRole("admin", "bhw");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "incident-reports"],
    queryFn: () =>
      api
        .get<Page<IncidentReportOut>>("/admin/incident-reports", { params: { size: 50 } })
        .then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Incident Reports"
        description="Reports submitted by residents — flooding, fire, blocked roads, and more."
      />

      <IncidentReviewTable
        items={data?.items}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
