"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  HeartHandshake,
  Home,
  LifeBuoy,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  UsersRound,
  Waves,
  Wind,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { PortalEvacuationStatusCard } from "@/components/features/portal/portal-evacuation-status-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  MySafetyOut,
  SafetyStatusSelfIn,
  SafetyStatusValue,
} from "@/lib/api/safety-types";
import type { PublicEmergencyEvent, PublicEvacCenter } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

function getHazardIcon(type: string) {
  switch (type.toLowerCase()) {
    case "flood":
      return <Waves className="size-6 text-sky-600" />;
    case "fire":
      return <Flame className="size-6 text-rose-600" />;
    case "typhoon":
    case "severe_weather":
      return <Wind className="size-6 text-teal-600" />;
    case "earthquake":
      return <AlertTriangle className="size-6 text-amber-600" />;
    default:
      return <Siren className="size-6 text-emerald-600" />;
  }
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(start)) return "—";
  const diffMs = Math.max(0, end - start);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  const totalMins = Math.floor(diffMs / (1000 * 60));
  if (totalHours > 0) return `${totalHours}h ${totalMins % 60}m`;
  return `${Math.max(1, totalMins)}m`;
}

export default function PortalSafetyPage() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = React.useState("");
  const [centerId, setCenterId] = React.useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);

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
  const members = data?.household?.members ?? [];
  const safeCount = members.filter((m) => m.status === "safe").length;
  const rescueCount = members.filter((m) => m.status === "needs_rescue").length;
  const unaccountedCount = members.length - safeCount - rescueCount;

  const handleMarkMember = (memberId: string, status: SafetyStatusValue) => {
    submitMutation.mutate({
      status,
      scope: "member",
      member_ids: [memberId],
      event_id: resolvedEventId,
      evac_center_id: centerId || null,
    });
  };

  const handleConfirmBulkSafe = () => {
    submitMutation.mutate({
      status: "safe",
      scope: "household",
      acknowledged_member_ids: members.map((m) => m.member_id),
      event_id: resolvedEventId,
      evac_center_id: centerId || null,
    });
    setBulkDialogOpen(false);
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={ShieldCheck}
        title="Household Safety"
        titleAccent="Check-In"
        description="Declare real-time safety status for all household members so Barangay San Jose emergency responders can prioritize rescue operations."
        badge={
          activeEvents.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
              <span className="size-2 rounded-full bg-red-600 animate-ping" />
              <span>{activeEvents.length} Active Emergency Operation(s)</span>
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
            size="sm"
            className="h-10 cursor-pointer gap-2 rounded-full border border-red-600/30 bg-red-600 px-4 font-bold text-white shadow-md shadow-red-900/15 transition-all hover:bg-red-700 hover:shadow-lg active:scale-[0.98] max-sm:w-full max-sm:justify-center"
          >
            <Link href="/portal/rescue">
              <LifeBuoy aria-hidden className="size-4 animate-pulse" />
              <span>Ask for Rescue</span>
            </Link>
          </Button>
        }
      />

      {/* ── Conditional Main Workspace States ── */}
      {isLoading || activeEventsQuery.isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 rounded-3xl bg-emerald-900/20" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-80 rounded-3xl bg-slate-100" />
            <div className="lg:col-span-5 h-80 rounded-3xl bg-slate-100" />
          </div>
        </div>
      ) : isError || activeEventsQuery.isError ? (
        <Card className="border-red-200 bg-red-50/50 shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="size-8 text-red-600" />
            <h3 className="text-base font-bold text-red-950">
              Could not load safety check-in status
            </h3>
            <p className="text-xs text-red-700 max-w-md">
              Check your network connection or try again. In an immediate emergency, contact the
              barangay operations desk directly.
            </p>
            <Button
              size="sm"
              onClick={() => {
                void Promise.all([refetch(), activeEventsQuery.refetch()]);
              }}
              className="rounded-full font-bold bg-red-600 hover:bg-red-700 text-white px-5"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !data?.event ? (
        /* No Active Emergency Declaration State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200/90 bg-white p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-sm ring-8 ring-emerald-50">
            <ShieldCheck className="size-8 text-emerald-600" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-black text-neutral-900">
              No Active Emergency Declaration
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Barangay San Jose has no active disaster response event underway. Safety check-in
              controls and automated rescue queues activate immediately when a local disaster is
              declared by the BDRRMC.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap gap-2.5 justify-center">
            <Button asChild variant="outline" size="sm" className="rounded-full font-bold">
              <Link href="/portal">Back to Dashboard</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-emerald-700 font-bold text-white hover:bg-emerald-800"
            >
              <Link href="/portal/preparedness">Review Family Preparedness</Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Active Emergency Incident Workspace */
        <div className="space-y-6 sm:space-y-8">
          {/* ── 1. Hero Incident Context Banner (Barangay Portal Pattern) ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#032e23] via-[#054333] to-[#085a44] p-6 sm:p-7 text-white shadow-lg border border-emerald-800/40">
            {/* Ambient Background Light Orbs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-300/10 blur-3xl"
            />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Hazard Icon + Title + Timestamps */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-950 shadow-lg ring-4 ring-white/10">
                  {getHazardIcon(data.event.type)}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm border border-rose-400/40">
                      <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-white" />
                      </span>
                      LIVE OPERATION
                    </span>

                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 bg-white/10 text-white">
                      {data.event.type}
                    </span>

                    <div className="flex items-center gap-1 text-xs text-emerald-100 font-bold ml-1">
                      <Clock className="size-3.5 text-emerald-300 shrink-0" />
                      <span>Duration: {formatDuration(data.event.started_at, null)}</span>
                    </div>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {data.event.name}
                  </h1>

                  <p className="text-xs text-emerald-200/90">
                    Incident Declared:{" "}
                    <span className="font-semibold text-white">
                      {new Date(data.event.started_at).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>{" "}
                    · Barangay San Jose Emergency Operations Desk
                  </p>
                </div>
              </div>

              {/* Right: Multi-Incident Selector (if > 1) */}
              {activeEvents.length > 1 ? (
                <div className="flex flex-col gap-1 sm:min-w-64">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">
                    Switch Incident Context
                  </span>
                  <Select
                    value={resolvedEventId}
                    onValueChange={(val) => setEventId(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-white/20 bg-white/10 text-white text-xs font-bold shadow-sm backdrop-blur-md hover:bg-white/20 focus-visible:ring-emerald-400">
                      <SelectValue placeholder="Select Incident" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl">
                      {activeEvents.map((evt) => (
                        <SelectItem key={evt.id} value={evt.id} showCheckmark>
                          {evt.name} ({evt.type.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── 2. Real-Time Household Safety Metric Cards (4-Col Grid) ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Metric 1: Overall Safety Status */}
            <div
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all",
                rescueCount > 0
                  ? "border-red-300 bg-red-50/60"
                  : unaccountedCount > 0
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-emerald-300 bg-emerald-50/60",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                  Household Status
                </span>
                {rescueCount > 0 ? (
                  <ShieldAlert className="size-4 text-red-600" />
                ) : unaccountedCount > 0 ? (
                  <AlertTriangle className="size-4 text-amber-600" />
                ) : (
                  <ShieldCheck className="size-4 text-emerald-600" />
                )}
              </div>
              <p
                className={cn(
                  "mt-2 text-base sm:text-lg font-black",
                  rescueCount > 0
                    ? "text-red-950"
                    : unaccountedCount > 0
                    ? "text-amber-950"
                    : "text-emerald-950",
                )}
              >
                {rescueCount > 0
                  ? "Rescue Needed"
                  : unaccountedCount > 0
                  ? "Pending Check-In"
                  : "All Accounted Safe"}
              </p>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                {safeCount} of {members.length} confirmed safe
              </span>
            </div>

            {/* Metric 2: Accounted Citizens */}
            <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                  Confirmed Safe
                </span>
                <span className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                  {safeCount}
                </span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-neutral-900 tabular-nums">
                {members.length > 0 ? Math.round((safeCount / members.length) * 100) : 0}%
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                  style={{
                    width: `${members.length > 0 ? (safeCount / members.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Metric 3: Rescue Dispatch Needs */}
            <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                  Rescue Needed
                </span>
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-lg text-xs font-black",
                    rescueCount > 0
                      ? "bg-red-600 text-white animate-pulse"
                      : "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {rescueCount}
                </span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-neutral-900 tabular-nums">
                {rescueCount} <span className="text-xs font-semibold text-neutral-500">citizen(s)</span>
              </p>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                {rescueCount > 0 ? "Queued for boat/medic dispatch" : "No rescue requests queued"}
              </span>
            </div>

            {/* Metric 4: Assigned Shelter Status */}
            <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                  Shelter Mode
                </span>
                <Building2 className="size-4 text-sky-600" />
              </div>
              <p className="mt-2 text-sm sm:text-base font-black text-neutral-900 truncate">
                {centerId
                  ? centersQuery.data?.find((c) => c.id === centerId)?.facility.name ?? "Evac Center"
                  : "Home / In Place"}
              </p>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                {centerId ? "Official center designated" : "Sheltering at registered address"}
              </span>
            </div>
          </div>

          {/* ── 3. Two-Column Operational Workspace (12-Col Grid) ── */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
            {/* ── LEFT COLUMN: Family Members Status Control (7 Cols) ── */}
            <div className="xl:col-span-7 space-y-6 sm:space-y-8">
              <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
                <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6">
                  {/* Card Header with Batch Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                        <UsersRound className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-neutral-900">
                          Family Members Status Control
                        </h2>
                        <p className="text-xs text-neutral-500">
                          Tap &quot;Safe&quot; or &quot;Needs Rescue&quot; for each family member.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setBulkDialogOpen(true)}
                      disabled={submitMutation.isPending || members.length === 0}
                      className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                      <span>Mark All Safe</span>
                    </Button>
                  </div>

                  {/* Individual Member Roster Cards */}
                  <div className="space-y-3">
                    {members.map((member) => {
                      const isSafe = member.status === "safe";
                      const needsRescue = member.status === "needs_rescue";

                      return (
                        <div
                          key={member.member_id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs",
                            needsRescue
                              ? "border-red-300 bg-red-50/40"
                              : isSafe
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-neutral-200/90 bg-white hover:border-neutral-300",
                          )}
                        >
                          {/* Member Info & Current Status Pill */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-2xs",
                                needsRescue
                                  ? "bg-red-600"
                                  : isSafe
                                  ? "bg-emerald-700"
                                  : "bg-neutral-600",
                              )}
                            >
                              {member.full_name?.trim().charAt(0).toUpperCase() || "M"}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900 truncate">
                                  {member.full_name}
                                </span>
                                {member.is_head ? (
                                  <span className="rounded-full bg-emerald-100 border border-emerald-200/80 px-2 py-0.2 text-[9.5px] font-black text-emerald-800 uppercase">
                                    Head
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {isSafe ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-900">
                                    <CheckCircle2 className="size-3 text-emerald-700" />
                                    <span>Confirmed Safe</span>
                                  </span>
                                ) : needsRescue ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[10.5px] font-bold shadow-2xs animate-pulse">
                                    <AlertTriangle className="size-3" />
                                    <span>Needs Immediate Rescue</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[10.5px] font-medium text-neutral-600">
                                    <span>Not Yet Checked In</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              disabled={submitMutation.isPending}
                              onClick={() => handleMarkMember(member.member_id, "safe")}
                              className={cn(
                                "h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98]",
                                isSafe
                                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                                  : "border border-emerald-300/80 bg-white text-emerald-900 hover:bg-emerald-50",
                              )}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Safe</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={submitMutation.isPending}
                              onClick={() => handleMarkMember(member.member_id, "needs_rescue")}
                              className={cn(
                                "h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98]",
                                needsRescue
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white",
                              )}
                            >
                              <LifeBuoy className="size-3.5" />
                              <span>Needs Rescue</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT COLUMN: Shelter Logistics & Check-In (5 Cols) ── */}
            <div className="xl:col-span-5 space-y-6 sm:space-y-8">
              <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700 shadow-2xs">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900">
                        Shelter Assignment Check-In
                      </h2>
                      <p className="text-xs text-neutral-500">
                        Select an evacuation center if taking official shelter.
                      </p>
                    </div>
                  </div>

                  {/* Custom Radix Select for Evacuation Shelter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-800">
                      Designated Evacuation Shelter (Optional)
                    </label>
                    <Select
                      value={centerId}
                      onValueChange={(val) => setCenterId(val)}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-neutral-200 bg-white px-3 text-xs sm:text-sm font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                        <SelectValue placeholder="No center assignment (Home / Relative)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl max-h-64">
                        <SelectItem value="none" showCheckmark>
                          No center assignment (Home / Relative)
                        </SelectItem>
                        {centersQuery.data?.map((center) => (
                          <SelectItem
                            key={center.id}
                            value={center.id}
                            disabled={Boolean(center.is_at_capacity)}
                            showCheckmark
                          >
                            <span className="flex items-center justify-between gap-2 w-full">
                              <span>{center.facility.name}</span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                ({center.occupancy}/{center.capacity ?? "∞"})
                                {center.is_at_capacity ? " [FULL]" : ""}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Selecting a shelter updates the official BDRRMC occupancy registry for relief
                      and food distribution.
                    </p>
                  </div>

                  {/* Evacuation Status & History Component */}
                  <PortalEvacuationStatusCard />
                </CardContent>
              </Card>

              {/* 24/7 BDRRMC Emergency Operations Hotlines */}
              <Card className="border-red-200 bg-gradient-to-br from-red-50/80 to-rose-50/40 shadow-xs overflow-hidden">
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-center gap-2.5 text-red-950 font-bold border-b border-red-100 pb-2.5">
                    <Phone className="size-4 text-red-600" />
                    <span className="text-xs uppercase tracking-wider text-red-900 font-black">
                      24/7 San Jose Emergency Dispatch
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-neutral-700">
                    <p className="leading-relaxed">
                      For life-threatening rescue, severe medical emergencies, or structural collapse,
                      reach the command center directly:
                    </p>
                    <div className="rounded-xl border border-red-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                        Disaster Operations Desk
                      </span>
                      <p className="font-mono text-sm font-black text-neutral-900">
                        (02) 8942-0123 / 0917-894-0123
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-red-100">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-300 text-xs font-bold text-red-800 hover:bg-red-100/50"
                    >
                      <Link href="/help">View All Hotlines</Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                    >
                      <Link href="/portal/rescue">Submit Rescue Ticket</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Dialog for Bulk Mark All Safe ── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
                <Users className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-black text-neutral-900">
                  Mark All {members.length} Members Safe?
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Confirm whole household safety status.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-3 text-xs text-neutral-600">
            <p className="leading-relaxed">
              This confirms that every family member listed below is accounted for and in a safe
              location:
            </p>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {members.map((m) => (
                <div key={m.member_id} className="flex items-center gap-2 font-semibold text-neutral-800 text-xs">
                  <CheckCircle2 className="size-3.5 text-emerald-700 shrink-0" />
                  <span>{m.full_name}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              <strong>Notice:</strong> If any family member is missing, isolated, or requires boat/medic
              rescue, mark them individually instead.
            </p>
          </div>

          <DialogFooter className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              className="rounded-full border-neutral-300 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitMutation.isPending}
              onClick={handleConfirmBulkSafe}
              className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-5 text-xs font-bold text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-800 active:scale-[0.98]"
            >
              <CheckCircle2 className="size-3.5 stroke-[2.5]" />
              <span>Confirm & Mark All Safe</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
