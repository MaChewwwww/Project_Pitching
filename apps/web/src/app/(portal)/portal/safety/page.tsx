"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LifeBuoy,
  Phone,
  ShieldCheck,
  Siren,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { SafetyStatusControl } from "@/components/common/safety-status-control";
import { PortalEvacuationStatusCard } from "@/components/features/portal/portal-evacuation-status-card";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  MySafetyOut,
  SafetyStatusSelfIn,
  SafetyStatusValue,
} from "@/lib/api/safety-types";
import type { PublicEmergencyEvent, PublicEvacCenter } from "@/lib/api/public-types";

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
      toast.success("Safety status updated for your household");
      queryClient.invalidateQueries({ queryKey: ["me", "safety"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "evacuation-status"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const activeEvents = activeEventsQuery.data ?? [];

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={ShieldCheck}
        title="Household Safety"
        titleAccent="Check-In"
        description="Let Barangay San Jose emergency responders know who in your household is accounted safe, and who requires immediate rescue."
        badge={
          activeEvents.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
              <span className="size-2 rounded-full bg-red-600 animate-ping" />
              <span>{activeEvents.length} Active Emergency Event(s)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
              <CheckCircle2 className="size-3 text-emerald-700" />
              <span>All Systems Normal</span>
            </span>
          )
        }
        action={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white"
          >
            <Link href="/portal/rescue">
              <LifeBuoy className="size-3.5" />
              <span>Ask for Rescue</span>
            </Link>
          </Button>
        }
      />

      {/* ── Multiple Events Selector (if > 1) ── */}
      {activeEvents.length > 1 ? (
        <Card className="border-neutral-200/90 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-neutral-800">
              <span>Select Active Emergency Event</span>
              <select
                value={resolvedEventId}
                onChange={(e) => setEventId(e.target.value)}
                className="h-11 rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-xs sm:text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {activeEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} • {event.type.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Main Content Conditional States ── */}
      {isLoading || activeEventsQuery.isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 rounded-3xl bg-emerald-100/30" />
          <div className="h-64 rounded-3xl bg-slate-100" />
        </div>
      ) : isError || activeEventsQuery.isError ? (
        <Card className="border-red-200 bg-red-50/50 shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="size-8 text-red-600" />
            <h3 className="text-base font-bold text-red-950">
              Could not load safety check-in status
            </h3>
            <p className="text-xs text-red-700 max-w-md">
              Check your connection or try again. In an immediate life threat, call the
              barangay emergency hotline directly.
            </p>
            <Button
              size="sm"
              onClick={() => {
                void Promise.all([refetch(), activeEventsQuery.refetch()]);
              }}
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !data?.event ? (
        <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-8 sm:p-12 text-center shadow-xs space-y-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
            <ShieldCheck className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">
            No Active Emergency Right Now
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-neutral-500 leading-relaxed">
            There is no active typhoon or flood disaster declared in Barangay San Jose.
            Safety check-in controls activate automatically when an emergency response
            operation is initiated.
          </p>
          <div className="pt-2 flex flex-wrap gap-2 justify-center">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
              <Link href="/portal">Back to Dashboard</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl font-bold">
              <Link href="/portal/preparedness">Review Preparedness</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Event Banner */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-red-500 bg-gradient-to-br from-red-600 via-rose-600 to-red-700 p-5 sm:p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-white text-red-600 shadow-md ring-4 ring-white/20">
                  <Siren className="size-5 text-red-600 animate-pulse" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-100">
                    Active Emergency Incident
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {data.event.name}
                  </h2>
                </div>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-white px-3 py-1 font-mono text-xs font-black text-red-700 uppercase">
                {data.event.type}
              </span>
            </div>
          </div>

          {/* 2-Column Responsive Layout on Widescreen */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
            {/* Left Column: Individual Member Safety Status Control */}
            <div className="xl:col-span-7 space-y-6">
              <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
                <CardContent className="p-5 sm:p-6 lg:p-7 space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                        <UsersRound className="size-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">
                          Family Members Status Control
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Tap &quot;Safe&quot; or &quot;Needs Rescue&quot; for each person in your household.
                        </p>
                      </div>
                    </div>
                  </div>

                  {data.household?.members ? (
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
                  ) : (
                    <p className="text-xs text-neutral-500">No household members found.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Evacuation Center Check-In & History */}
            <div className="xl:col-span-5 space-y-6">
              <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">
                        Shelter Assignment Check-In
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Select an evacuation center if taking official shelter.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="evac-center-select"
                      className="text-xs font-bold text-neutral-800"
                    >
                      Designated Evacuation Shelter (Optional)
                    </label>
                    <select
                      id="evac-center-select"
                      value={centerId}
                      onChange={(e) => setCenterId(e.target.value)}
                      className="h-11 rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-xs sm:text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">No center assignment (Home / Relative)</option>
                      {centersQuery.data?.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.facility.name} • {center.occupancy}/{center.capacity ?? "unlimited"} slots
                          {center.is_at_capacity ? " (AT CAPACITY)" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-neutral-400">
                      Selecting a center records physical shelter occupancy for relief distribution.
                    </span>
                  </div>

                  {/* Evacuation Status & History */}
                  <PortalEvacuationStatusCard />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── Emergency Hotlines Support Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50/60 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
            <Phone className="size-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-800">
              Need Immediate Responders?
            </span>
            <p className="text-xs font-bold text-neutral-900">
              Call Barangay San Jose Disaster Operations Center: (02) 8942-0123
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="self-start sm:self-auto rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700"
        >
          <Link href="/help">View All Hotlines</Link>
        </Button>
      </div>
    </div>
  );
}
