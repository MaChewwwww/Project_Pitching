"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { RescueQueue } from "@/components/features/safety/rescue-queue";
import { RescueTriageDialog } from "@/components/features/safety/rescue-triage-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { Page } from "@/lib/api/public-types";
import type { RescueRequestOut, RescueRequestStatus } from "@/lib/api/safety-types";

const STATUS_FILTERS: Array<{ value: RescueRequestStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "dispatched", label: "Dispatched" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

/**
 * FR-SAF-010 — the rescue queue. Polled short-cycle like `/admin/safety`:
 * this is a screen an officer is expected to leave open during an
 * emergency, not one they refresh by hand. Not area-scoped (see the
 * `list_rescue_requests` docstring on the backend) — every admin/BHW sees
 * every request, because an anonymous request has no area to scope by.
 */
export default function AdminRescueRequestsPage() {
  useRequireRole("admin", "bhw");

  const [statusFilter, setStatusFilter] = React.useState<RescueRequestStatus | "all">(
    "all",
  );
  const [triageTarget, setTriageTarget] = React.useState<RescueRequestOut | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "rescue-requests", statusFilter],
    queryFn: () =>
      api
        .get<Page<RescueRequestOut>>("/admin/rescue-requests", {
          params: {
            size: 50,
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          },
        })
        .then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rescue"
        titleAccent="queue"
        description="Requests for help, ordered by urgency. Anonymous requests are never ranked below registered ones."
      />

      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as RescueRequestStatus | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-body-sm py-8 text-center text-neutral-500">
            Loading…
          </CardContent>
        </Card>
      ) : (
        <RescueQueue items={data?.items ?? []} onTriage={setTriageTarget} />
      )}

      {triageTarget ? (
        <RescueTriageDialog
          key={triageTarget.id}
          request={triageTarget}
          open={!!triageTarget}
          onOpenChange={(open) => {
            if (!open) setTriageTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
