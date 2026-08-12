"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Card, CardContent } from "@/components/common/card";
import { AccountedForPanel } from "@/components/features/safety/accounted-for-panel";
import { api } from "@/lib/api/client";
import type { AccountedForOut } from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * FR-SAF-011 — live accounted-for dashboard. Polled short-cycle
 * (`refetchInterval`) rather than left to a manual refresh, the same
 * reasoning `EmergencyAlertBanner` uses for the active alert: this is a
 * screen a BDRRMC officer is expected to leave open during an emergency.
 */
export default function AdminSafetyPage() {
  useRequireRole("admin", "bhw", "sk");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "accounted-for"],
    queryFn: () => api.get<AccountedForOut>("/admin/accounted-for").then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Accounted for"
        description="Live registered accounted-for vs. unaccounted, by area, for the currently active emergency event."
      />

      {isLoading ? (
        <p className="text-body-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-center">
            <p className="text-body-sm text-neutral-600">
              No active emergency event, or the summary couldn&apos;t be loaded.
            </p>
            <button
              type="button"
              className="text-body-sm text-primary-700 font-semibold underline"
              onClick={() => refetch()}
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : data ? (
        <AccountedForPanel data={data} />
      ) : null}
    </div>
  );
}
