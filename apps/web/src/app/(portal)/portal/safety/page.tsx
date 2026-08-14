"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { SafetyStatusControl } from "@/components/common/safety-status-control";
import { Card, CardContent } from "@/components/common/card";
import { PortalEvacuationStatusCard } from "@/components/features/portal/portal-evacuation-status-card";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  MySafetyOut,
  SafetyStatusSelfIn,
  SafetyStatusValue,
} from "@/lib/api/safety-types";
import type { PublicEmergencyEvent, PublicEvacCenter } from "@/lib/api/public-types";
import * as React from "react";

/**
 * FR-SAF-001…003 — self-service safety check-in. `PortalGate` guarantees the
 * caller has a household by the time this renders; whether there's an active
 * emergency to check in for is this page's own concern, not the gate's.
 */
export default function PortalSafetyPage() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = React.useState("");
  const [centerId, setCenterId] = React.useState("");

  const activeEventsQuery = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((response) => response.data),
  });
  const centersQuery = useQuery({
    queryKey: ["public", "evacuation-centers"],
    queryFn: () =>
      api
        .get<{ items: PublicEvacCenter[] }>("/public/evacuation-centers", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });
  const resolvedEventId = eventId || activeEventsQuery.data?.[0]?.id || "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["me", "safety", resolvedEventId],
    queryFn: () =>
      api
        .get<MySafetyOut>("/me/safety", { params: { event_id: resolvedEventId } })
        .then((r) => r.data),
    enabled: Boolean(resolvedEventId),
  });

  const submitMutation = useMutation({
    mutationFn: (body: SafetyStatusSelfIn) => api.post("/me/safety-status", body),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["me", "safety"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Safety"
        titleAccent="check-in"
        description="Let the barangay know who in your household is safe, and who still needs help."
      />

      {activeEventsQuery.data && activeEventsQuery.data.length > 1 ? (
        <label className="flex flex-col gap-1 text-sm font-semibold text-neutral-700">
          Emergency event
          <select
            value={resolvedEventId}
            onChange={(event) => setEventId(event.target.value)}
            className="focus-visible:ring-primary-500 min-h-11 rounded-lg border border-neutral-200 bg-white px-3 font-normal focus-visible:ring-2 focus-visible:outline-none"
          >
            {activeEventsQuery.data.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} · {event.type}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isLoading || activeEventsQuery.isLoading ? (
        <p className="text-body-sm text-neutral-500">Loading…</p>
      ) : isError || activeEventsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-body-sm text-neutral-600">
              Couldn&apos;t load your safety status.
            </p>
            <button
              type="button"
              className="text-body-sm text-primary-700 font-semibold underline"
              onClick={() => {
                void Promise.all([refetch(), activeEventsQuery.refetch()]);
              }}
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : !data?.event ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ShieldCheck aria-hidden className="size-8 text-neutral-400" />
            <p className="text-body-sm text-neutral-600">
              There&apos;s no active emergency right now — nothing to check in for.
            </p>
          </CardContent>
        </Card>
      ) : !data.household ? (
        <Card>
          <CardContent className="text-body-sm py-6 text-center text-neutral-600">
            Your household record couldn&apos;t be found for this check-in.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <span className="text-overline text-primary-700">Active event</span>
              <span className="text-h4 text-neutral-900">{data.event.name}</span>
            </CardContent>
          </Card>

          <SafetyStatusControl
            members={data.household.members}
            isSubmitting={submitMutation.isPending}
            onMarkMember={(memberId, status: SafetyStatusValue) =>
              submitMutation.mutateAsync({
                status,
                scope: "member",
                member_ids: [memberId],
                event_id: resolvedEventId,
                evac_center_id: centerId || null,
              })
            }
            onMarkHousehold={(status, acknowledgedMemberIds) =>
              submitMutation.mutateAsync({
                status,
                scope: "household",
                acknowledged_member_ids: acknowledgedMemberIds,
                event_id: resolvedEventId,
                evac_center_id: centerId || null,
              })
            }
          />

          <label className="flex flex-col gap-1 text-sm font-semibold text-neutral-700">
            Optional evacuation center
            <select
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              className="focus-visible:ring-primary-500 min-h-11 rounded-lg border border-neutral-200 bg-white px-3 font-normal focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">No new center assignment</option>
              {centersQuery.data?.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.facility.name} · {center.occupancy}/{center.capacity ?? "?"}
                  {center.is_at_capacity ? " · at capacity" : ""}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-neutral-500">
              Selecting a center records physical occupancy. Capacity is advisory.
            </span>
          </label>

          <PortalEvacuationStatusCard />
        </>
      )}

      <Link
        href="/portal"
        className="text-body-sm text-primary-700 font-semibold underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
