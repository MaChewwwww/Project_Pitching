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
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Flame,
  HeartPulse,
  LifeBuoy,
  MapPin,
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
import { PortalEvacuationStatusCard } from "@/components/features/portal/portal-evacuation-status-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
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

function formatStatusBadge(status: SafetyStatusValue) {
  switch (status) {
    case "safe":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          <CheckCircle2 className="size-2.5 text-emerald-700" />
          <span>Safe</span>
        </span>
      );
    case "needs_rescue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800 animate-pulse">
          <AlertTriangle className="size-2.5 text-red-600" />
          <span>Needs Rescue</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          <span>Unaccounted</span>
        </span>
      );
  }
}

export default function PortalSafetyPage() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [showAllCenters, setShowAllCenters] = React.useState(false);

  // Individual Member Action Dialog State
  const [memberActionDialog, setMemberActionDialog] = React.useState<{
    memberId: string;
    memberName: string;
    isHead: boolean;
    currentStatus: SafetyStatusValue;
    status: "safe" | "needs_rescue";
    eventId: string;
    centerId: string;
  } | null>(null);

  // Bulk Mark All Safe Dialog State
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [bulkEventId, setBulkEventId] = React.useState("");
  const [bulkCenterId, setBulkCenterId] = React.useState("none");

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

  const householdQuery = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut>("/me/household").then((r) => r.data),
  });

  const resolvedEventId = selectedEventId || activeEventsQuery.data?.[0]?.id || "";

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
      toast.success("Safety status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["me", "safety"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "evacuation-status"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const activeEvents = activeEventsQuery.data ?? [];
  const centers = centersQuery.data ?? [];
  const members = data?.household?.members ?? [];
  const safeCount = members.filter((m) => m.status === "safe").length;
  const rescueCount = members.filter((m) => m.status === "needs_rescue").length;
  const unaccountedCount = members.length - safeCount - rescueCount;

  // Household Special Care & Vulnerability Calculations
  const specialCareMembers = React.useMemo(() => {
    if (!householdQuery.data?.members) return [];
    return householdQuery.data.members.filter(
      (m) =>
        m.is_pwd ||
        m.is_senior ||
        m.is_pregnant ||
        m.is_lactating ||
        m.is_bedridden ||
        m.has_chronic_condition,
    );
  }, [householdQuery.data?.members]);

  const specialCareSummary = React.useMemo(() => {
    if (!householdQuery.data?.members) return "No special care flags";
    const counts: string[] = [];
    let pwd = 0;
    let senior = 0;
    let pregnant = 0;
    let bedridden = 0;
    let chronic = 0;

    householdQuery.data.members.forEach((m) => {
      if (m.is_pwd) pwd++;
      if (m.is_senior) senior++;
      if (m.is_pregnant) pregnant++;
      if (m.is_bedridden) bedridden++;
      if (m.has_chronic_condition) chronic++;
    });

    if (pwd > 0) counts.push(`${pwd} PWD`);
    if (senior > 0) counts.push(`${senior} Senior`);
    if (pregnant > 0) counts.push(`${pregnant} Pregnant`);
    if (bedridden > 0) counts.push(`${bedridden} Bedridden`);
    if (chronic > 0) counts.push(`${chronic} Chronic Care`);

    if (counts.length === 0) return "Standard evacuation protocol";
    return counts.slice(0, 2).join(" · ") + (counts.length > 2 ? ` +${counts.length - 2} more` : "");
  }, [householdQuery.data?.members]);

  // Household Flood Risk & Proximity Assessment
  const waterwayProximity = householdQuery.data?.waterway_proximity;
  const floodRiskInfo = React.useMemo(() => {
    if (waterwayProximity === "very_near") {
      return {
        level: "High Flood Risk",
        badge: "bg-red-100 text-red-800 border-red-200",
        distance: "< 50m to Waterway",
        tone: "border-red-200/90 bg-red-50/20",
        iconColor: "text-red-600",
      };
    }
    if (waterwayProximity === "near") {
      return {
        level: "Moderate Flood Risk",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        distance: "50–200m to Waterway",
        tone: "border-amber-200/90 bg-amber-50/20",
        iconColor: "text-amber-600",
      };
    }
    return {
      level: "Low / Safe Elevation",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      distance: "> 200m Safe Distance",
      tone: "border-emerald-200/90 bg-emerald-50/20",
      iconColor: "text-emerald-600",
    };
  }, [waterwayProximity]);

  // Prioritize evacuation centers in the household's registered area
  const userAreaId = householdQuery.data?.area_id;
  const userAreaName = householdQuery.data?.area_name;

  const sortedCenters = React.useMemo(() => {
    if (!centers) return [];
    return [...centers].sort((a, b) => {
      const aInArea =
        (userAreaId && a.facility.area_id === userAreaId) ||
        (userAreaName && a.facility.area_name === userAreaName);
      const bInArea =
        (userAreaId && b.facility.area_id === userAreaId) ||
        (userAreaName && b.facility.area_name === userAreaName);
      if (aInArea && !bInArea) return -1;
      if (!aInArea && bInArea) return 1;
      return 0;
    });
  }, [centers, userAreaId, userAreaName]);

  const visibleCenters = showAllCenters ? sortedCenters : sortedCenters.slice(0, 3);

  // Handlers for opening member action modal
  const openMemberAction = (
    memberId: string,
    memberName: string,
    isHead: boolean,
    currentStatus: SafetyStatusValue,
    status: "safe" | "needs_rescue",
  ) => {
    setMemberActionDialog({
      memberId,
      memberName,
      isHead,
      currentStatus,
      status,
      eventId: resolvedEventId,
      centerId: "none",
    });
  };

  // Handler for opening bulk mark all safe modal
  const openBulkAction = () => {
    setBulkEventId(resolvedEventId);
    setBulkCenterId("none");
    setBulkDialogOpen(true);
  };

  const handleConfirmMemberAction = () => {
    if (!memberActionDialog) return;
    submitMutation.mutate({
      status: memberActionDialog.status,
      scope: "member",
      member_ids: [memberActionDialog.memberId],
      event_id: memberActionDialog.eventId || resolvedEventId,
      evac_center_id:
        memberActionDialog.status === "safe" &&
        memberActionDialog.centerId &&
        memberActionDialog.centerId !== "none"
          ? memberActionDialog.centerId
          : null,
    });
    setMemberActionDialog(null);
  };

  const handleConfirmBulkSafe = () => {
    submitMutation.mutate({
      status: "safe",
      scope: "household",
      acknowledged_member_ids: members.map((m) => m.member_id),
      event_id: bulkEventId || resolvedEventId,
      evac_center_id:
        bulkCenterId === "none" || !bulkCenterId ? null : bulkCenterId,
    });
    setBulkDialogOpen(false);
  };

  return (
    <div className="w-full">
      {/* ── Conditional Main Workspace States ── */}
      {isLoading || activeEventsQuery.isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-3xl bg-emerald-900/20" />
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
        /* ── Unified Single Emergency Container Card ── */
        <div className="overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-xs">
          {/* ── 1. Hero Incident Header of Container ── */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#032e23] via-[#054333] to-[#085a44] p-6 sm:p-7 text-white border-b border-emerald-950/20">
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

              {/* Right: Multi-Incident Selector (if > 1) & Ask for Rescue Action */}
              <div className="flex flex-wrap items-center gap-3 self-start lg:self-center shrink-0">
                {activeEvents.length > 1 ? (
                  <div className="flex flex-col gap-1 sm:min-w-56">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">
                      Switch Incident Context
                    </span>
                    <Select
                      value={resolvedEventId}
                      onValueChange={(val) => setSelectedEventId(val)}
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

                <Button
                  asChild
                  size="sm"
                  className="h-10 cursor-pointer gap-2 rounded-full border border-red-500/50 bg-red-600 px-5 font-bold text-white shadow-lg shadow-red-950/30 transition-all hover:bg-red-700 hover:shadow-xl active:scale-[0.98]"
                >
                  <Link href="/portal/rescue">
                    <LifeBuoy aria-hidden className="size-4 animate-pulse" />
                    <span>Ask for Rescue</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* ── 2. Padded Body of Unified Container ── */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-[#fafbfa]/60">
            {/* Real-Time Household Safety Metric Cards (4-Col Grid) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {/* Metric 1: Overall Safety Status */}
              <div
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all bg-white",
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
                  {safeCount} of {members.length} member(s) confirmed safe
                </span>
              </div>

              {/* Metric 2: Combined Safety Check-In Progress & Rescue Ratio */}
              <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                    Safety Check-In
                  </span>
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-lg text-xs font-black",
                      rescueCount > 0
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {safeCount}/{members.length}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-black text-neutral-900 tabular-nums">
                    {Math.round((safeCount / Math.max(1, members.length)) * 100)}%{" "}
                    <span className="text-xs font-semibold text-neutral-500">Safe</span>
                  </p>
                  {/* Combined Progress Bar: Green for Safe, Red for Rescue */}
                  <div className="mt-1.5 flex h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-500"
                      style={{
                        width: `${(safeCount / Math.max(1, members.length)) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-red-600 transition-all duration-500"
                      style={{
                        width: `${(rescueCount / Math.max(1, members.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-neutral-500 mt-0.5 truncate">
                  {rescueCount > 0 ? (
                    <span className="text-red-700 font-bold">{rescueCount} member(s) need rescue</span>
                  ) : unaccountedCount > 0 ? (
                    `${unaccountedCount} member(s) pending check-in`
                  ) : (
                    "Whole household accounted for"
                  )}
                </span>
              </div>

              {/* Metric 3: Special Care Needs & Vulnerabilities */}
              <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                    Special Care Needs
                  </span>
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-lg text-xs font-black",
                      specialCareMembers.length > 0
                        ? "bg-amber-100 text-amber-900"
                        : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    {specialCareMembers.length}
                  </span>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-neutral-900 tabular-nums">
                  {specialCareMembers.length > 0 ? (
                    <>
                      {specialCareMembers.length}{" "}
                      <span className="text-xs font-semibold text-neutral-500">priority member(s)</span>
                    </>
                  ) : (
                    <span className="text-base sm:text-lg text-neutral-900">Standard</span>
                  )}
                </p>
                <span className="text-[11px] text-neutral-500 mt-0.5 truncate">
                  {specialCareSummary}
                </span>
              </div>

              {/* Metric 4: Household Flood Risk Category */}
              <div
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all bg-white",
                  floodRiskInfo.tone,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                    Household Flood Risk
                  </span>
                  <Waves className={cn("size-4", floodRiskInfo.iconColor)} />
                </div>
                <div className="mt-2">
                  <p className="text-base sm:text-lg font-black text-neutral-900 truncate">
                    {floodRiskInfo.level}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold mt-1",
                      floodRiskInfo.badge,
                    )}
                  >
                    {floodRiskInfo.distance}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 mt-0.5 truncate">
                  {userAreaName || "Barangay San Jose"} · UP NOAH Model
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

                      {unaccountedCount === 0 && rescueCount === 0 && members.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                          <CheckCircle2 className="size-3.5 text-emerald-700" />
                          <span>All Members Safe</span>
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={openBulkAction}
                          disabled={submitMutation.isPending || members.length === 0}
                          className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
                        >
                          <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                          <span>Mark All Safe</span>
                        </Button>
                      )}
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
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs bg-white",
                              needsRescue
                                ? "border-red-300 bg-red-50/40"
                                : isSafe
                                ? "border-emerald-200 bg-emerald-50/30"
                                : "border-neutral-200/90 hover:border-neutral-300",
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

                            {/* Action Area: Hide buttons when safe, or allow marking safe if in rescue, or show both if unaccounted */}
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              {isSafe ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs">
                                  <CheckCircle2 className="size-3.5 text-emerald-700" />
                                  <span>Accounted Safe</span>
                                </span>
                              ) : needsRescue ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={submitMutation.isPending}
                                  onClick={() =>
                                    openMemberAction(
                                      member.member_id,
                                      member.full_name,
                                      Boolean(member.is_head),
                                      member.status,
                                      "safe",
                                    )
                                  }
                                  className="h-9 cursor-pointer gap-1.5 rounded-full bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 active:scale-[0.98]"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Mark Safe / Rescued</span>
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={submitMutation.isPending}
                                    onClick={() =>
                                      openMemberAction(
                                        member.member_id,
                                        member.full_name,
                                        Boolean(member.is_head),
                                        member.status,
                                        "safe",
                                      )
                                    }
                                    className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-300/80 bg-white px-3.5 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-50 active:scale-[0.98]"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    <span>Safe</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={submitMutation.isPending}
                                    onClick={() =>
                                      openMemberAction(
                                        member.member_id,
                                        member.full_name,
                                        Boolean(member.is_head),
                                        member.status,
                                        "needs_rescue",
                                      )
                                    }
                                    className="h-9 cursor-pointer gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 text-xs font-bold text-red-700 shadow-2xs hover:bg-red-600 hover:text-white active:scale-[0.98]"
                                  >
                                    <LifeBuoy className="size-3.5" />
                                    <span>Needs Rescue</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── RIGHT COLUMN: Shelter Logistics & Live Facilities Overview (5 Cols) ── */}
              <div className="xl:col-span-5 space-y-6 sm:space-y-8">
                {/* Active Stay & Evacuation History Component */}
                <PortalEvacuationStatusCard />

                {/* Evacuation Centers Real-Time Directory Card (Max 3 items, Prioritizing Household Area, Expandable) */}
                <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700 shadow-2xs">
                          <Building2 className="size-4" />
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-neutral-900">
                            Designated Evacuation Shelters
                          </h2>
                          <p className="text-[11px] text-neutral-500">
                            Real-time capacity in Barangay San Jose
                          </p>
                        </div>
                      </div>

                      {userAreaName ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                          {userAreaName}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-3 divide-y divide-neutral-100">
                      {visibleCenters.length > 0 ? (
                        visibleCenters.map((center) => {
                          const pct = center.capacity
                            ? Math.min(100, Math.round((center.occupancy / center.capacity) * 100))
                            : 0;

                          const isSameArea =
                            (userAreaId && center.facility.area_id === userAreaId) ||
                            (userAreaName && center.facility.area_name === userAreaName);

                          return (
                            <div key={center.id} className="pt-3 first:pt-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-neutral-900 truncate">
                                      {center.facility.name}
                                    </p>
                                    {isSameArea ? (
                                      <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-800">
                                        Your Area
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[10.5px] text-neutral-500 flex items-center gap-1">
                                    <MapPin className="size-3 text-neutral-400" />
                                    <span>{center.facility.area_name || "Barangay San Jose"}</span>
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide",
                                    center.is_at_capacity
                                      ? "bg-red-100 text-red-800 border border-red-200"
                                      : pct >= 80
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200",
                                  )}
                                >
                                  {center.is_at_capacity ? "Full" : pct >= 80 ? "Near Full" : "Open"}
                                </span>
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                                  <span>Occupancy: {center.occupancy} / {center.capacity ?? "∞"}</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-300",
                                      center.is_at_capacity
                                        ? "bg-red-600"
                                        : pct >= 80
                                        ? "bg-amber-500"
                                        : "bg-emerald-600",
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-neutral-400 py-2">No evacuation centers registered.</p>
                      )}
                    </div>

                    {/* Expand / Collapse Button if > 3 centers */}
                    {sortedCenters.length > 3 ? (
                      <div className="pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setShowAllCenters(!showAllCenters)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          {showAllCenters ? (
                            <>
                              <ChevronUp className="size-3.5" />
                              <span>Show Fewer Shelters</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" />
                              <span>
                                View All {sortedCenters.length} Shelters ({sortedCenters.length - 3} more)
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
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
        </div>
      )}

      {/* ── Confirmation Dialog for Individual Member Action (Mark Safe vs. Flag Needs Rescue) ── */}
      <Dialog
        open={Boolean(memberActionDialog)}
        onOpenChange={(open) => {
          if (!open) setMemberActionDialog(null);
        }}
      >
        <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-2xl shadow-2xs",
                  memberActionDialog?.status === "needs_rescue"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-800",
                )}
              >
                {memberActionDialog?.status === "needs_rescue" ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </span>
              <div>
                <DialogTitle className="text-base font-black text-neutral-900">
                  {memberActionDialog?.status === "needs_rescue"
                    ? `Flag ${memberActionDialog?.memberName} — Needs Rescue`
                    : `Mark ${memberActionDialog?.memberName} Safe`}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Confirm this individual event-scoped safety update.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 text-xs text-neutral-600">
            {/* Rescue Warning Banner (Only on Needs Rescue) */}
            {memberActionDialog?.status === "needs_rescue" ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 shadow-2xs">
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Emergency Rescue Flag</p>
                  <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                    This will flag the subject(s) in need of urgent assistance and dispatch an entry
                    to the Rescue Queue for field responders.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Target Subject Card with Current Status (Matches Barangay Admin Map Dialog) */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3.5 flex items-center justify-between text-xs shadow-2xs">
              <span className="font-bold text-neutral-900">
                {memberActionDialog?.memberName}
                {memberActionDialog?.isHead ? " (Head)" : ""}
              </span>
              {memberActionDialog ? formatStatusBadge(memberActionDialog.currentStatus) : null}
            </div>

            {/* Active Emergency Event Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Siren className="size-3.5 text-emerald-600 shrink-0" />
                <span>Active Emergency Event <span className="text-rose-500">*</span></span>
              </Label>
              {activeEvents.length > 0 ? (
                <Select
                  value={memberActionDialog?.eventId || resolvedEventId}
                  onValueChange={(val) =>
                    setMemberActionDialog((prev) => (prev ? { ...prev, eventId: val } : null))
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                    <SelectValue placeholder="Select Active Emergency Event..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl">
                    {activeEvents.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id} showCheckmark>
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="font-bold text-neutral-900">{evt.name}</span>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
                            {evt.type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 font-medium">
                  No active emergency event is ongoing.
                </div>
              )}
              <p className="text-[11px] text-neutral-500 leading-tight">
                Links this check-in directly to the selected incident record for downstream response analysis and post-disaster logs.
              </p>
            </div>

            {/* Optional Evacuation Center Selector (ONLY for Safe Status, NEVER for Rescue) */}
            {memberActionDialog?.status === "safe" ? (
              <div className="space-y-1.5 animate-in fade-in-50 duration-150">
                <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Optional Evacuation Center</span>
                </Label>
                <Select
                  value={memberActionDialog?.centerId || "none"}
                  onValueChange={(val) =>
                    setMemberActionDialog((prev) => (prev ? { ...prev, centerId: val } : null))
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                    <SelectValue placeholder="Will not go to the evacuation center" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl max-h-60">
                    <SelectItem value="none" showCheckmark>
                      Will not go to the evacuation center
                    </SelectItem>
                    {sortedCenters.map((center) => (
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
                <p className="text-[11px] text-neutral-500 leading-tight">
                  Leave blank to keep any existing physical assignment unchanged.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberActionDialog(null)}
              className="rounded-full border-neutral-300 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitMutation.isPending}
              onClick={handleConfirmMemberAction}
              className={cn(
                "h-10 cursor-pointer gap-2 rounded-full px-5 text-xs font-bold text-white shadow-md active:scale-[0.98]",
                memberActionDialog?.status === "needs_rescue"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/15"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/15",
              )}
            >
              {memberActionDialog?.status === "needs_rescue" ? (
                <>
                  <LifeBuoy className="size-3.5 stroke-[2.5]" />
                  <span>Confirm Rescue Flag</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                  <span>Confirm Safe Check-In</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  Mark All {members.length} Members Safe
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Confirm whole household event-scoped safety update.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 text-xs text-neutral-600">
            <p className="leading-relaxed">
              This confirms that every family member listed below is accounted for and in a safe
              location:
            </p>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3 space-y-1.5 max-h-36 overflow-y-auto">
              {members.map((m) => (
                <div key={m.member_id} className="flex items-center justify-between font-semibold text-neutral-800 text-xs py-0.5">
                  <span>{m.full_name}{m.is_head ? " (Head)" : ""}</span>
                  {formatStatusBadge(m.status)}
                </div>
              ))}
            </div>

            {/* Active Emergency Event Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Siren className="size-3.5 text-emerald-600 shrink-0" />
                <span>Active Emergency Event <span className="text-rose-500">*</span></span>
              </Label>
              {activeEvents.length > 0 ? (
                <Select
                  value={bulkEventId || resolvedEventId}
                  onValueChange={(val) => setBulkEventId(val)}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                    <SelectValue placeholder="Select Active Emergency Event..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl">
                    {activeEvents.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id} showCheckmark>
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="font-bold text-neutral-900">{evt.name}</span>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
                            {evt.type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 font-medium">
                  No active emergency event is ongoing.
                </div>
              )}
            </div>

            {/* Bulk Evacuation Center Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Optional Evacuation Center</span>
              </Label>
              <Select
                value={bulkCenterId}
                onValueChange={(val) => setBulkCenterId(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                  <SelectValue placeholder="Will not go to the evacuation center" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl max-h-60">
                  <SelectItem value="none" showCheckmark>
                    Will not go to the evacuation center
                  </SelectItem>
                  {sortedCenters.map((center) => (
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
              <p className="text-[11px] text-neutral-500 leading-tight">
                Leave blank to keep any existing physical assignment unchanged.
              </p>
            </div>
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
              className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-600 px-5 text-xs font-bold text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-700 active:scale-[0.98]"
            >
              <CheckCircle2 className="size-3.5 stroke-[2.5]" />
              <span>Confirm Safe Check-In</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
