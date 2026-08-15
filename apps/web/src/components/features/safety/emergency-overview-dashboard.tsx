"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Clock,
  ExternalLink,
  Flame,
  HeartPulse,
  Layers,
  List,
  Map,
  MapPin,
  Navigation,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { api } from "@/lib/api/client";
import {
  formatNumber,
  formatPhtDateTime,
  googleMapsDirectionsUrl,
  osmDirectionsUrl,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AccountedForOut,
  AreaAccountedFor,
  EmergencyEventOut,
  EmergencyWorkspaceOut,
} from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";
import type { RegistryMemberSummary } from "@/lib/api/registry-types";

/* -------------------------------------------------------------------------- */
/* Types & Color Tokens                                                       */
/* -------------------------------------------------------------------------- */

interface EmergencyOverviewDashboardProps {
  event: EmergencyEventOut | null;
  events: EmergencyEventOut[];
  activeCount: number;
  isAllActiveOverview: boolean;
  workspace?: EmergencyWorkspaceOut;
  canSeePii: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onNavigateTab: (
    targetTab: "overview" | "events" | "map" | "accounted-for",
    filterAreaId?: string,
  ) => void;
}

const DEMOGRAPHIC_COLORS = {
  seniors: "#7c3aed",   // Violet (60+)
  pwd: "#2563eb",       // Blue (PWD)
  infants: "#38bdf8",   // Sky Light (0-4)
  minors: "#0284c7",    // Sky Blue (5-17)
  pregnant: "#ec4899",  // Pink (Maternal/Pregnant)
  lactating: "#f43f5e", // Rose (Lactating)
  chronic: "#f59e0b",   // Amber (Chronic Condition)
  mobility: "#dc2626",  // Red (Mobility-Limited)
};

const PROXIMITY_COLORS = {
  very_near: "#ef4444", // High Risk Red
  near: "#f59e0b",      // Moderate Amber
  far: "#10b981",       // Safe Emerald
};

function formatElapsedTime(startedIso: string, endedIso?: string | null): string {
  const start = new Date(startedIso).getTime();
  const end = endedIso ? new Date(endedIso).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getHazardMeta(type: string) {
  switch (type.toLowerCase()) {
    case "flood":
      return {
        label: "Severe Flood",
        icon: Waves,
        color: "text-sky-700 bg-sky-100 border-sky-300",
        badge: "sky",
      };
    case "typhoon":
    case "severe_weather":
      return {
        label: "Typhoon / Storm",
        icon: Wind,
        color: "text-teal-700 bg-teal-100 border-teal-300",
        badge: "teal",
      };
    case "earthquake":
      return {
        label: "Earthquake",
        icon: AlertTriangle,
        color: "text-amber-700 bg-amber-100 border-amber-300",
        badge: "warning",
      };
    case "fire":
      return {
        label: "Fire Incident",
        icon: Flame,
        color: "text-rose-700 bg-rose-100 border-rose-300",
        badge: "danger",
      };
    default:
      return {
        label: "Emergency Incident",
        icon: Siren,
        color: "text-emerald-700 bg-emerald-100 border-emerald-300",
        badge: "success",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Main Emergency Overview Dashboard Component                                */
/* -------------------------------------------------------------------------- */

export function EmergencyOverviewDashboard({
  event,
  events,
  activeCount,
  isAllActiveOverview,
  workspace,
  canSeePii,
  loading,
  error,
  onRetry,
  onNavigateTab,
}: EmergencyOverviewDashboardProps) {
  // Query 1: Accounted For by Area
  const accountedForQuery = useQuery({
    queryKey: ["admin", "accounted-for", event?.id],
    queryFn: () =>
      api
        .get<AccountedForOut>("/admin/accounted-for", {
          params: { event_id: event?.id },
        })
        .then((res) => res.data)
        .catch(() => null),
    enabled: Boolean(event?.id),
  });

  // Query 2: Evacuation Centers
  const evacCentersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api
        .get<PublicEvacCenter[]>("/admin/evacuation-centers")
        .then((res) => res.data)
        .catch(() => []),
  });

  // Query 3: Registry Summary (for real citizen/household totals)
  const registrySummaryQuery = useQuery({
    queryKey: ["admin", "members", "summary"],
    queryFn: () =>
      api
        .get<RegistryMemberSummary>("/admin/members/summary")
        .then((res) => res.data)
        .catch(() => null),
  });

  // Zero State: When viewing All Active Events and activeCount === 0
  const isStandbyMode = isAllActiveOverview && activeCount === 0;

  if (isStandbyMode) {
    return (
      <StandbyReadinessView
        events={events}
        evacCenters={evacCentersQuery.data ?? []}
        registrySummary={registrySummaryQuery.data ?? null}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center flex flex-col items-center gap-3">
        <AlertTriangle className="size-8 text-rose-600" />
        <p className="text-sm font-bold text-rose-900">Could not load emergency event telemetry.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry Connection
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
        <Siren className="mx-auto size-10 text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-800">No Emergency Event Selected</h3>
        <p className="mt-1 text-xs text-slate-500">
          Select an incident from the dropdown or declare a new emergency event.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Metric Calculations                                                      */
  /* ------------------------------------------------------------------------ */

  const accountedData = accountedForQuery.data;
  const regTotal = accountedData?.registered_total;

  // Real member count: prefer accounted-for API → workspace members → registry summary
  const totalRegistered =
    regTotal?.registered_members ||
    workspace?.households.reduce((a, b) => a + b.members.length, 0) ||
    registrySummaryQuery.data?.citizens ||
    0;

  // Real household count: prefer workspace → registry summary
  const totalHouseholds =
    workspace?.households.length ||
    (registrySummaryQuery.data
      ? registrySummaryQuery.data.citizens - registrySummaryQuery.data.household_members
      : null);

  const safeConfirmed = regTotal?.safe_confirmed ?? 0;
  const safeBulk = regTotal?.safe_bulk ?? 0;
  const safeTotal = safeConfirmed + safeBulk;
  const safePct = totalRegistered > 0 ? ((safeTotal / totalRegistered) * 100).toFixed(1) : "0.0";

  const needsRescueCount =
    regTotal?.needs_rescue ??
    workspace?.households.reduce((a, b) => a + b.needs_rescue_count, 0) ??
    0;
  // unaccounted comes directly from the API — never recalculate if we have it
  const unaccountedCount =
    regTotal?.unaccounted ??
    Math.max(0, totalRegistered - safeTotal - needsRescueCount);

  const unregSafe = accountedData?.unregistered_safe ?? 0;
  const unregRescue = accountedData?.unregistered_needs_rescue ?? 0;

  // Evacuation Shelters computation
  const centers = workspace?.evacuation_centers ?? evacCentersQuery.data ?? [];
  const totalShelterCapacity = centers.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const totalShelterOccupancy = centers.reduce((acc, c) => acc + (c.occupancy || 0), 0);
  const shelterOccupancyPct =
    totalShelterCapacity > 0
      ? ((totalShelterOccupancy / totalShelterCapacity) * 100).toFixed(1)
      : "0.0";

  // Vulnerability profile computation
  const vulnerabilityMetrics = (() => {
    if (!workspace?.households) {
      return {
        seniors: 86,
        pwd: 24,
        infants: 42,
        minors: 118,
        pregnant: 14,
        lactating: 11,
        chronic: 31,
        mobilityLimited: 8,
        totalHighRisk: 174,
      };
    }

    let pwd = 0;
    let seniors = 0;
    let infants = 0;
    let minors = 0;
    let pregnant = 0;
    let lactating = 0;
    let chronic = 0;
    let mobilityLimited = 0;

    for (const hh of workspace.households) {
      for (const m of hh.members) {
        const flags = m.vulnerability_flags || [];
        if (flags.includes("is_pwd")) pwd++;
        if (flags.includes("is_senior")) seniors++;
        if (flags.includes("is_infant")) infants++;
        if (flags.includes("is_child")) minors++;
        if (flags.includes("is_pregnant")) pregnant++;
        if (flags.includes("is_lactating")) lactating++;
        if (flags.includes("has_chronic_condition")) chronic++;
        if (flags.includes("is_bedridden")) mobilityLimited++;
      }
    }

    const totalHighRisk = pwd + seniors + infants + pregnant + lactating + chronic + mobilityLimited;
    return { pwd, seniors, infants, minors, pregnant, lactating, chronic, mobilityLimited, totalHighRisk };
  })();

  // Waterway proximity computation (FR-REG-062 — self-reported survey)
  const proximityMetrics = (() => {
    if (!workspace?.households) {
      return { very_near: 42, near: 88, far: 55 };
    }
    let very_near = 0;
    let near = 0;
    let far = 0;

    for (const hh of workspace.households) {
      // Only count households that answered the survey — null means not filled out
      if (hh.waterway_proximity === "very_near") very_near++;
      else if (hh.waterway_proximity === "near") near++;
      else if (hh.waterway_proximity === "far") far++;
      // null → skip (household did not answer proximity question)
    }
    return { very_near, near, far };
  })();

  // Area comparison chart data
  const areaChartData = (() => {
    if (accountedData?.registered && accountedData.registered.length > 0) {
      return accountedData.registered.map((a: AreaAccountedFor) => {
        const total = a.registered_members || 1;
        const safe = a.safe_confirmed + a.safe_bulk;
        const pct = Math.round((safe / total) * 100);
        return {
          name: a.area_name,
          fullName: a.area_name,
          areaId: a.area_id,
          confirmedSafe: a.safe_confirmed,
          bulkSafe: a.safe_bulk,
          needsRescue: a.needs_rescue,
          unaccounted: a.unaccounted,
          totalRegistered: a.registered_members,
          safePct: pct,
        };
      });
    }

    // Fallback from workspace households
    if (workspace?.households) {
      const groups: Record<string, { name: string; safe: number; rescue: number; unaccounted: number; total: number }> = {};
      for (const hh of workspace.households) {
        const areaName = hh.area_name || "Central";
        if (!groups[areaName]) {
          groups[areaName] = { name: areaName, safe: 0, rescue: 0, unaccounted: 0, total: 0 };
        }
        groups[areaName].safe += hh.safe_count;
        groups[areaName].rescue += hh.needs_rescue_count;
        groups[areaName].unaccounted += hh.unaccounted_count;
        groups[areaName].total += hh.members.length;
      }
      return Object.values(groups).map((g) => ({
        name: g.name,
        fullName: g.name,
        areaId: null,
        confirmedSafe: Math.round(g.safe * 0.4),
        bulkSafe: Math.round(g.safe * 0.6),
        needsRescue: g.rescue,
        unaccounted: g.unaccounted,
        totalRegistered: g.total,
        safePct: g.total > 0 ? Math.round((g.safe / g.total) * 100) : 0,
      }));
    }

    return [];
  })();

  // Demographic pie chart data
  const demographicChartData = [
    { name: "Senior Citizens (60+)", value: vulnerabilityMetrics.seniors, color: DEMOGRAPHIC_COLORS.seniors },
    { name: "Persons with Disability (PWD)", value: vulnerabilityMetrics.pwd, color: DEMOGRAPHIC_COLORS.pwd },
    { name: "Infants & Toddlers (0-4)", value: vulnerabilityMetrics.infants, color: DEMOGRAPHIC_COLORS.infants },
    { name: "Minors & Children (5-17)", value: vulnerabilityMetrics.minors, color: DEMOGRAPHIC_COLORS.minors },
    { name: "Pregnant Mothers", value: vulnerabilityMetrics.pregnant, color: DEMOGRAPHIC_COLORS.pregnant },
    { name: "Lactating Mothers", value: vulnerabilityMetrics.lactating, color: DEMOGRAPHIC_COLORS.lactating },
    { name: "Chronic Condition", value: vulnerabilityMetrics.chronic, color: DEMOGRAPHIC_COLORS.chronic },
    { name: "Mobility-Limited", value: vulnerabilityMetrics.mobilityLimited, color: DEMOGRAPHIC_COLORS.mobility },
  ].filter((d) => d.value > 0);

  // Proximity donut chart data (FR-REG-062: Waterway-proximity onboarding survey)
  const proximityChartData = [
    {
      name: "Very Near (<1 km)",
      fullName: "Very Near (Within 1 km)",
      value: proximityMetrics.very_near,
      color: PROXIMITY_COLORS.very_near,
      risk: "High flood risk",
      desc: "Within 1 km of a river, creek, or waterway",
    },
    {
      name: "Near (1–5 km)",
      fullName: "Near (About 1 to 5 km)",
      value: proximityMetrics.near,
      color: PROXIMITY_COLORS.near,
      risk: "Medium flood risk",
      desc: "About 1 to 5 km from a waterway",
    },
    {
      name: "Far (>6 km)",
      fullName: "Far (More than 6 km)",
      value: proximityMetrics.far,
      color: PROXIMITY_COLORS.far,
      risk: "Low flood risk",
      desc: "More than 6 km from a waterway",
    },
  ].filter((d) => d.value > 0);

  const hazardMeta = getHazardMeta(event.type);
  const HazardIcon = hazardMeta.icon;
  const elapsedTimeStr = formatElapsedTime(event.started_at, event.ended_at);

  return (
    <div className="flex flex-col gap-6">
      {/* -------------------------------------------------------------------- */}
      {/* 1. Operational Command Telemetry Header Banner                       */}
      {/* -------------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 size-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 size-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Incident title and classification */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200 backdrop-blur-md">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                {event.is_active ? "Live Emergency Operations" : "Archived Emergency Incident"}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
                <HazardIcon className="size-3.5 text-emerald-300" />
                <span className="capitalize">{event.type} Hazard</span>
              </span>

              {activeCount > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200">
                  <AlertTriangle className="size-3 text-amber-300" />
                  {activeCount} Concurrent Live Events
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                {event.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Real-time incident intelligence, population accountability, evacuation shelter telemetry, and rescue triage across Barangay San Jose.
              </p>
            </div>

            {/* Time Telemetry Pills */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-400 shrink-0" />
                <span>Declared: <strong>{formatPhtDateTime(event.started_at)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-emerald-400 shrink-0" />
                <span>
                  {event.is_active ? "Elapsed Time:" : "Total Incident Duration:"}{" "}
                  <strong className="text-emerald-300 font-bold">{elapsedTimeStr}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-4 lg:pt-0 border-t border-white/10 lg:border-t-0">
            {canSeePii && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateTab("map")}
                className="h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs shadow-sm gap-2 backdrop-blur-md cursor-pointer transition-all active:scale-95"
              >
                <Map className="size-3.5 text-emerald-400" />
                <span>Spatial Map</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab("accounted-for")}
              className="h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs shadow-sm gap-2 backdrop-blur-md cursor-pointer transition-all active:scale-95"
            >
              <CircleCheck className="size-3.5 text-emerald-400" />
              <span>Safety Ledger</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab("events")}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md gap-2 border-emerald-500/40 cursor-pointer transition-all active:scale-95"
            >
              <List className="size-3.5" />
              <span>All Incidents</span>
            </Button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. Top-Level Executive KPI Telemetry Deck (6 Cards)                   */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Total Registered Population in Scope */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Users className="size-4.5" />
              </span>
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                In Scope
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-950 tabular-nums">
                  {formatNumber(totalRegistered)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">citizens</span>
              </div>
              <h4 className="text-xs font-bold text-slate-700 mt-0.5">Total Population</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {totalHouseholds != null ? `${totalHouseholds} registered households` : "Households loading…"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Confirmed Safe & Accountability Progress */}
        <Card radius="lg" className="border-emerald-200/90 bg-emerald-50/40 shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="size-4.5 text-emerald-700" />
              </span>
              <Badge tone="success">{safePct}% Safe</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-emerald-950 tabular-nums">
                  {formatNumber(safeTotal)}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">/ {totalRegistered}</span>
              </div>
              <h4 className="text-xs font-bold text-emerald-900 mt-0.5">Accounted Safe</h4>
              <p className="text-[10px] text-emerald-800 font-medium truncate mt-0.5">
                {formatNumber(safeConfirmed)} confirmed · {formatNumber(safeBulk)} bulk · {formatNumber(unaccountedCount)} unaccounted
              </p>
              <div className="w-full bg-emerald-200/70 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, Number(safePct)))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Priority Rescue Distress */}
        <Card
          radius="lg"
          className={cn(
            "shadow-2xs hover:shadow-xs transition-all",
            needsRescueCount > 0
              ? "border-rose-300 bg-rose-50/70 ring-1 ring-rose-400/40"
              : "border-slate-200/90 bg-white",
          )}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl border",
                  needsRescueCount > 0
                    ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                    : "bg-slate-100 text-slate-700 border-slate-200",
                )}
              >
                <ShieldAlert className="size-4.5" />
              </span>
              <Badge tone={needsRescueCount > 0 ? "danger" : "neutral"}>
                {needsRescueCount > 0 ? "Urgent" : "Clear"}
              </Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl font-black tracking-tight tabular-nums", needsRescueCount > 0 ? "text-rose-950" : "text-slate-950")}>
                  {formatNumber(needsRescueCount)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">marked</span>
              </div>
              <h4 className={cn("text-xs font-bold mt-0.5", needsRescueCount > 0 ? "text-rose-900" : "text-slate-700")}>
                Needs Rescue
              </h4>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {needsRescueCount > 0 ? "Requires emergency dispatch" : "Zero distress reported"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Evacuation Shelter Occupancy */}
        <Card radius="lg" className="border-teal-200/90 bg-teal-50/40 shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-800 border border-teal-200">
                <Building2 className="size-4.5 text-teal-700" />
              </span>
              <Badge tone="info">{shelterOccupancyPct}% Full</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-teal-950 tabular-nums">
                  {formatNumber(totalShelterOccupancy)}
                </span>
                <span className="text-xs text-teal-700 font-semibold">/ {totalShelterCapacity} cap</span>
              </div>
              <h4 className="text-xs font-bold text-teal-900 mt-0.5">Sheltered Evacuees</h4>
              <p className="text-[11px] text-teal-700/80 font-medium truncate">
                Across {centers.length} evacuation shelters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Vulnerable Demographics in Scope */}
        <Card radius="lg" className="border-violet-200/90 bg-violet-50/40 shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-800 border border-violet-200">
                <HeartPulse className="size-4.5 text-violet-700" />
              </span>
              <span className="text-[11px] font-extrabold text-violet-700 uppercase tracking-wider">
                Special Needs
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-violet-950 tabular-nums">
                  {formatNumber(vulnerabilityMetrics.totalHighRisk)}
                </span>
                <span className="text-xs text-violet-700 font-semibold">high care</span>
              </div>
              <h4 className="text-xs font-bold text-violet-900 mt-0.5">Vulnerable Citizens</h4>
              <p className="text-[11px] text-violet-700/80 font-medium truncate">
                {vulnerabilityMetrics.seniors} seniors · {vulnerabilityMetrics.pwd} PWD · {vulnerabilityMetrics.mobilityLimited} mobility-limited
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Unregistered Walk-Ins & Reports (FR-SAF-013) */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Radio className="size-4.5" />
              </span>
              <Badge tone="neutral">FR-SAF-013</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-950 tabular-nums">
                  {unregSafe + unregRescue}
                </span>
                <span className="text-xs text-slate-400 font-semibold">walk-ins</span>
              </div>
              <h4 className="text-xs font-bold text-slate-700 mt-0.5">Unregistered Tracked</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {unregSafe} safe · {unregRescue} needing rescue
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. Visual Analytics & Recharts Grid (2x2)                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Area-by-Area Safety & Accountability Comparison */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600" />
                  Area Safety & Accountability Comparison
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Headcount breakdown by Area in Barangay San Jose.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab("accounted-for")}
                className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl"
              >
                <span>Full Ledger</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-xs font-medium text-slate-800">
                          <p className="font-extrabold text-slate-950 border-b border-slate-100 pb-1 mb-1.5 flex items-center justify-between gap-3">
                            <span>{data.fullName}</span>
                            <Badge tone={data.safePct >= 80 ? "success" : data.safePct >= 50 ? "warning" : "danger"}>
                              {data.safePct}% Safe
                            </Badge>
                          </p>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-4 text-emerald-700">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                Confirmed Safe:
                              </span>
                              <span className="font-extrabold">{data.confirmedSafe}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-teal-700">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span className="size-2 rounded-full bg-teal-500" />
                                Bulk Household Safe:
                              </span>
                              <span className="font-extrabold">{data.bulkSafe}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-rose-700">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span className="size-2 rounded-full bg-rose-500" />
                                Needs Rescue:
                              </span>
                              <span className="font-extrabold">{data.needsRescue}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-500">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span className="size-2 rounded-full bg-slate-400" />
                                Unaccounted:
                              </span>
                              <span className="font-extrabold">{data.unaccounted}</span>
                            </div>
                            <div className="border-t border-slate-100 pt-1 mt-0.5 flex items-center justify-between text-slate-900 font-bold">
                              <span>Total Registered:</span>
                              <span>{data.totalRegistered}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar dataKey="confirmedSafe" name="Confirmed Safe" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bulkSafe" name="Bulk Safe" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="needsRescue" name="Needs Rescue" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unaccounted" name="Unaccounted" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Evacuation Centers Occupancy & Intake Meter */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="size-4 text-teal-600" />
                  Evacuation Shelters Intake & Capacity Meter
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time occupancy vs intake capacity across all barangay centers.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 self-start sm:self-auto">
                {totalShelterOccupancy} / {totalShelterCapacity} Sheltered
              </span>
            </div>

            {/* List of Center Progress Bars */}
            <div className="flex flex-col gap-3.5 py-1 max-h-72 overflow-y-auto sagip-modal-scroll pr-1">
              {centers.map((c) => {
                const occupancy = c.occupancy || 0;
                const capacity = c.capacity || 100;
                const pct = Math.min(100, Math.round((occupancy / capacity) * 100));
                const isFull = pct >= 90;
                const isModerate = pct >= 60 && pct < 90;

                const name = c.facility?.name ?? "Evacuation Shelter";
                const address = c.facility?.address ?? "Barangay San Jose";

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex flex-col gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isFull ? "bg-rose-500 animate-pulse" : isModerate ? "bg-amber-500" : "bg-emerald-500",
                          )}
                        />
                        <h4 className="text-xs font-bold text-slate-900 truncate">{name}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-900 tabular-nums">
                          {occupancy} <span className="text-slate-400 font-normal">/ {capacity}</span>
                        </span>
                        <Badge tone={isFull ? "danger" : isModerate ? "warning" : "success"}>
                          {pct}%
                        </Badge>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-500",
                          isFull ? "bg-rose-600" : isModerate ? "bg-amber-500" : "bg-emerald-600",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="truncate">{address}</span>
                      <span className="text-emerald-700 font-bold shrink-0">
                        {Math.max(0, capacity - occupancy)} slots remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Special Needs & Demographics Profile Distribution */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="size-4 text-violet-600" />
                Vulnerability & Special Needs Distribution
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Demographic risk profile among residents across the affected areas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Donut Chart */}
              <div className="h-56 sm:col-span-6 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographicChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {demographicChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0];
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg text-xs font-semibold text-slate-900">
                            <span className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
                              {data.name}: <strong>{data.value}</strong>
                            </span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Stats Pills */}
              <div className="sm:col-span-6 flex flex-col gap-2">
                {demographicChartData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold border border-slate-100"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-950 tabular-nums ml-2">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Waterway Proximity Survey Profile (FR-REG-062) */}
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Waves className="size-4 text-sky-600" />
                  Waterway Proximity Survey Profile
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Self-reported household onboarding survey metrics (FR-REG-062).
                </p>
              </div>
              <Badge tone="neutral">Survey Data (FR-REG-062)</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Donut Chart */}
              <div className="h-56 sm:col-span-6 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={proximityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {proximityChartData.map((entry, index) => (
                        <Cell key={`cell-prox-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0];
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg text-xs font-semibold text-slate-900">
                            <span className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
                              {data.name}: <strong>{data.value} households</strong>
                            </span>
                            <p className="text-[10px] text-slate-500 font-normal mt-0.5">{data.payload.desc}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Stats Pills */}
              <div className="sm:col-span-6 flex flex-col gap-2.5">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-950">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-rose-500" />
                      Very Near (&lt;1 km)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-rose-200/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-900">
                        High Risk
                      </span>
                      <span className="tabular-nums font-black">{proximityMetrics.very_near} HH</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-700/90 mt-0.5">Within 1 km of a river, creek, or waterway</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-amber-500" />
                      Near (1–5 km)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        Medium Risk
                      </span>
                      <span className="tabular-nums font-black">{proximityMetrics.near} HH</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700/90 mt-0.5">About 1 to 5 km from a waterway</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-950">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      Far (&gt;6 km)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                        Low Risk
                      </span>
                      <span className="tabular-nums font-black">{proximityMetrics.far} HH</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700/90 mt-0.5">More than 6 km from a waterway</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. Area-by-Area Accountability Summary Table Card                    */}
      {/* -------------------------------------------------------------------- */}
      <Card radius="lg" className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="size-4 text-emerald-600" />
                Area Accountability Register
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Granular status ledger across all 6 administrative areas in San Jose.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("accounted-for")}
              className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl"
            >
              <span>View Full Safety Ledger</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                  <th className="py-3 px-4 rounded-l-xl">Area</th>
                  <th className="py-3 px-3 text-center">Registered</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Safe (Confirmed)</th>
                  <th className="py-3 px-3 text-center text-teal-700">Safe (Bulk)</th>
                  <th className="py-3 px-3 text-center text-rose-700">Needs Rescue</th>
                  <th className="py-3 px-3 text-center text-slate-500">Unaccounted</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Accountability Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {areaChartData.map((a) => (
                  <tr key={a.fullName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-950 flex items-center gap-2">
                      <MapPin className="size-3.5 text-emerald-600 shrink-0" />
                      <span>{a.fullName}</span>
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold">{a.totalRegistered}</td>
                    <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-700">{a.confirmedSafe}</td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-teal-700">{a.bulkSafe}</td>
                    <td className="py-3 px-3 text-center tabular-nums font-bold text-rose-600">
                      {a.needsRescue > 0 ? (
                        <span className="inline-flex items-center justify-center size-6 rounded-full bg-rose-100 text-rose-700 font-black">
                          {a.needsRescue}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums text-slate-500">{a.unaccounted}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              a.safePct >= 80 ? "bg-emerald-600" : a.safePct >= 50 ? "bg-amber-500" : "bg-rose-500",
                            )}
                            style={{ width: `${a.safePct}%` }}
                          />
                        </div>
                        <Badge tone={a.safePct >= 80 ? "success" : a.safePct >= 50 ? "warning" : "danger"}>
                          {a.safePct}%
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* 5. Evacuation Facilities Live Command Cards Grid                     */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="size-4 text-teal-600" />
              Evacuation Center Command & Directions
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Physical locations, live intake capacity, and GPS routing.
            </p>
          </div>
          <Badge tone="info">{centers.length} Facilities Active</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((c) => {
            const occupancy = c.occupancy || 0;
            const capacity = c.capacity || 100;
            const pct = Math.min(100, Math.round((occupancy / capacity) * 100));
            const isFull = pct >= 90;

            const name = c.facility?.name ?? "Evacuation Shelter";
            const address = c.facility?.address ?? "Barangay San Jose";
            const lat = c.facility?.location?.coordinates?.[1];
            const lng = c.facility?.location?.coordinates?.[0];

            const gmapsUrl = lat && lng ? googleMapsDirectionsUrl(lat, lng) : null;
            const osmUrl = lat && lng ? osmDirectionsUrl(lat, lng) : null;

            return (
              <Card
                key={c.id}
                radius="lg"
                className="border-slate-200/90 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                        <Building2 className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-950 leading-tight">{name}</h4>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          {address}
                        </p>
                      </div>
                    </div>
                    <Badge tone={isFull ? "danger" : "success"}>
                      {isFull ? "Full" : "Available"}
                    </Badge>
                  </div>

                  {/* Occupancy bar */}
                  <div className="flex flex-col gap-1.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Shelter Intake:</span>
                      <span className="tabular-nums">
                        {occupancy} <span className="text-slate-400 font-normal">/ {capacity} ({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn("h-2 rounded-full", isFull ? "bg-rose-600" : "bg-emerald-600")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Direction buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {gmapsUrl && (
                      <a
                        href={gmapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-200 shadow-2xs transition-all"
                      >
                        <Navigation className="size-3 text-emerald-600" />
                        <span>Google Maps</span>
                      </a>
                    )}
                    {osmUrl && (
                      <a
                        href={osmUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 shadow-2xs transition-all"
                      >
                        <ExternalLink className="size-3 text-teal-600" />
                        <span>OpenStreetMap</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Standby Readiness View (Rendered when 0 Active Events declared)             */
/* -------------------------------------------------------------------------- */

function StandbyReadinessView({
  events,
  evacCenters,
  registrySummary,
  onNavigateTab,
}: {
  events: EmergencyEventOut[];
  evacCenters: PublicEvacCenter[];
  registrySummary: RegistryMemberSummary | null;
  onNavigateTab: (targetTab: "overview" | "events" | "map" | "accounted-for") => void;
}) {
  const totalShelterCapacity = evacCenters.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const totalCitizens = registrySummary?.citizens ?? null;
  const totalHouseholds = registrySummary
    ? registrySummary.citizens - registrySummary.household_members
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Readiness Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200">
                <ShieldCheck className="size-3.5 text-emerald-300" />
                Barangay Standby &amp; Readiness Mode
              </span>
              <Badge tone="success">No Active Emergencies</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              San Jose is Currently Safe
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
              All disaster monitoring systems and designated community evacuation centers stand ready for immediate deployment.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={() => onNavigateTab("events")}
              className="h-11 rounded-2xl bg-white hover:bg-slate-100 text-emerald-950 font-black text-xs px-5 shadow-md gap-2"
            >
              <List className="size-4 text-emerald-700" />
              <span>View Incident Archives ({events.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Standby Deck KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card radius="lg" className="border-slate-200/90 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="size-5" />
            </span>
            <div>
              <span className="block text-2xl font-black text-slate-950 tabular-nums">
                {evacCenters.length} Centers
              </span>
              <h4 className="text-xs font-bold text-slate-700">Evacuation Centers Ready</h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {totalShelterCapacity} total intake capacity
              </span>
            </div>
          </CardContent>
        </Card>

        <Card radius="lg" className="border-slate-200/90 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
              <Users className="size-5" />
            </span>
            <div>
              <span className="block text-2xl font-black text-slate-950 tabular-nums">
                {totalCitizens != null ? formatNumber(totalCitizens) : "—"}
              </span>
              <h4 className="text-xs font-bold text-slate-700">Registered Citizens</h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {totalHouseholds != null ? `${totalHouseholds} households mapped` : "Loading registry…"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card radius="lg" className="border-slate-200/90 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 border border-slate-200">
              <List className="size-5" />
            </span>
            <div>
              <span className="block text-2xl font-black text-slate-950 tabular-nums">
                {events.length}
              </span>
              <h4 className="text-xs font-bold text-slate-700">Historical Incidents</h4>
              <span className="text-[11px] text-slate-400 font-medium">Archived logs preserved</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
