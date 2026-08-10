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

/**
 * FR-SAF-001…003 — self-service safety check-in. `PortalGate` guarantees the
 * caller has a household by the time this renders; whether there's an active
 * emergency to check in for is this page's own concern, not the gate's.
 */
export default function PortalSafetyPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["me", "safety"],
    queryFn: () => api.get<MySafetyOut>("/me/safety").then((r) => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (body: SafetyStatusSelfIn) => api.post("/me/safety-status", body),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["me", "safety"] });
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

      {isLoading ? (
        <p className="text-body-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-body-sm text-neutral-600">
              Couldn&apos;t load your safety status.
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
              })
            }
            onMarkHousehold={(status, acknowledgedMemberIds) =>
              submitMutation.mutateAsync({
                status,
                scope: "household",
                acknowledged_member_ids: acknowledgedMemberIds,
              })
            }
          />

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
