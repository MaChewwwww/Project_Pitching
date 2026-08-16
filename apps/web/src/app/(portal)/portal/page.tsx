"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Backpack,
  Bell,
  Building2,
  ChevronRight,
  CloudSun,
  Droplets,
  ExternalLink,
  FileText,
  FileWarning,
  HeartPulse,
  Home,
  LifeBuoy,
  Map,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { HouseholdSafetyLine } from "@/components/features/portal/household-safety-line";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import type { MySafetyOut } from "@/lib/api/safety-types";
import type {
  PublicEmergencyEvent,
  PublicRiverLevel,
  PublicWeatherCurrent,
} from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

type GoBagItem = { id: string; is_essential: boolean };
type GoBagResponse = {
  items: GoBagItem[];
  checked_item_ids: string[];
};

type FamilyPlanResponse = {
  meeting_point: string | null;
  out_of_area_contact: string | null;
  notes: string | null;
};

type Notice = {
  id: string;
  title: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
  type: string;
};
type NoticePage = { items: Notice[] };

export default function PortalDashboardPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const events = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((r) => r.data),
  });

  const activeEvents = events.data ?? [];
  const eventId = activeEvents[0]?.id;

  const safety = useQuery({
    queryKey: ["me", "safety", eventId],
    enabled: Boolean(eventId),
    queryFn: () =>
      api
        .get<MySafetyOut>("/me/safety", { params: { event_id: eventId } })
        .then((r) => r.data),
  });

  const goBag = useQuery({
    queryKey: ["me", "go-bag"],
    queryFn: () => api.get<GoBagResponse>("/me/go-bag").then((r) => r.data),
  });

  const familyPlan = useQuery({
    queryKey: ["me", "family-plan"],
    queryFn: () =>
      api.get<FamilyPlanResponse>("/me/family-emergency-plan").then((r) => r.data),
  });

  const notices = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => api.get<NoticePage>("/me/notifications").then((r) => r.data),
  });

  const weather = useQuery({
    queryKey: ["public", "weather-current"],
    queryFn: () =>
      api.get<PublicWeatherCurrent>("/public/weather/current").then((r) => r.data),
  });

  const river = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () =>
      api.get<PublicRiverLevel>("/public/river-level").then((r) => r.data),
  });

  if (household.isLoading || !household.data) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="h-48 rounded-3xl bg-emerald-100/40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="h-32 rounded-3xl bg-slate-100" />
          <div className="h-32 rounded-3xl bg-slate-100" />
          <div className="h-32 rounded-3xl bg-slate-100" />
          <div className="h-32 rounded-3xl bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-64 rounded-3xl bg-slate-100" />
            <div className="h-80 rounded-3xl bg-slate-100" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-64 rounded-3xl bg-slate-100" />
            <div className="h-64 rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const data = household.data;
  const firstName = data.head_name.split(" ")[0] || "Resident";
  const members = data.members || [];
  const specialNeedsCount = members.filter(
    (m) =>
      m.is_pwd ||
      m.is_senior ||
      m.is_pregnant ||
      m.is_lactating ||
      m.has_chronic_condition ||
      m.is_bedridden,
  ).length;

  // Detailed vulnerability counts
  let pwdCount = 0;
  let seniorCount = 0;
  let pregnantCount = 0;
  let lactatingCount = 0;
  let chronicCount = 0;
  let bedriddenCount = 0;

  members.forEach((m) => {
    if (m.is_pwd) pwdCount++;
    if (m.is_senior) seniorCount++;
    if (m.is_pregnant) pregnantCount++;
    if (m.is_lactating) lactatingCount++;
    if (m.has_chronic_condition) chronicCount++;
    if (m.is_bedridden) bedriddenCount++;
  });

  const specialFlagsList: string[] = [];
  if (pwdCount > 0) specialFlagsList.push(`${pwdCount} PWD`);
  if (seniorCount > 0) specialFlagsList.push(`${seniorCount} Senior`);
  if (pregnantCount > 0) specialFlagsList.push(`${pregnantCount} Pregnant`);
  if (lactatingCount > 0) specialFlagsList.push(`${lactatingCount} Lactating`);
  if (chronicCount > 0) specialFlagsList.push(`${chronicCount} Chronic`);
  if (bedriddenCount > 0) specialFlagsList.push(`${bedriddenCount} Bedridden`);

  const statuses = Object.fromEntries(
    (safety.data?.household?.members ?? []).map((member) => [
      member.member_id,
      member.status,
    ]),
  );

  // Safety counts
  const safetyMembersList = safety.data?.household?.members ?? [];
  const safeCount = safetyMembersList.filter((m) => m.status === "safe").length;
  const needsRescueCount = safetyMembersList.filter((m) => m.status === "needs_rescue").length;

  // Go-Bag calculations
  const goBagItems = goBag.data?.items ?? [];
  const goBagCheckedIds = goBag.data?.checked_item_ids ?? [];
  const goBagTotal = goBagItems.length || 12;
  const goBagChecked = goBagCheckedIds.length;
  const goBagPercent = Math.round((goBagChecked / (goBagTotal || 1)) * 100);
  const essentialTotal = goBagItems.filter((i) => i.is_essential).length;
  const essentialChecked = goBagItems.filter(
    (i) => i.is_essential && goBagCheckedIds.includes(i.id),
  ).length;

  // Family plan calculations
  const hasMeetingPoint = Boolean(familyPlan.data?.meeting_point?.trim());
  const hasOutOfAreaContact = Boolean(familyPlan.data?.out_of_area_contact?.trim());
  const familyPlanPercent =
    (hasMeetingPoint ? 50 : 0) + (hasOutOfAreaContact ? 50 : 0);

  // River telemetry
  const alertLevel = river.data?.alert_level ?? 0;
  const alertLevelName =
    alertLevel === 0
      ? "Normal"
      : alertLevel === 1
        ? "Alert Level 1"
        : alertLevel === 2
          ? "Alert Level 2 (Evacuate)"
          : "Critical Alarm";

  // Proximity label mapping
  const proximityMap: Record<
    string,
    { label: string; tone: string; badge: string; desc: string }
  > = {
    very_near: {
      label: "Very High Proximity (<1 km)",
      tone: "border-red-200/90 bg-gradient-to-br from-red-50/60 to-rose-50/30 text-red-950",
      badge: "bg-red-100 text-red-800 border-red-300",
      desc: "Waterway within 1,000 meters. Prepare early evacuation when Alert Level 1 is raised.",
    },
    near: {
      label: "Moderate Proximity (1–5 km)",
      tone: "border-amber-200/90 bg-gradient-to-br from-amber-50/60 to-orange-50/30 text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      desc: "Secondary flood runoff zone. Monitor local street drainage during heavy rainfall.",
    },
    far: {
      label: "Low Proximity (>5 km)",
      tone: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      desc: "Elevated residential area with minimal direct river backflow risk.",
    },
  };

  const currentProximity =
    proximityMap[data.waterway_proximity ?? ""] || proximityMap.far;

  // Recent notifications
  const recentNotices = (notices.data?.items ?? []).slice(0, 2);
  const unreadNoticesCount = (notices.data?.items ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Hero Greeting & Live Environmental Telemetry Banner ── */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/15 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-6 sm:p-8 text-white shadow-md">
        {/* Background glow accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-teal-300/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Resident Greeting & Credentials */}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-0.5 text-xs font-bold text-white shadow-2xs backdrop-blur-md">
                <Sparkles className="size-3 text-amber-300" />
                <span>San Jose Resident Portal</span>
              </span>
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 font-mono text-xs font-bold text-white backdrop-blur-md">
                #{data.reference_no}
              </span>
              <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                {data.area_name ?? "San Jose Zone"}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Mabuhay, <span className="text-amber-300">{firstName}!</span>
              </h1>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-white/90 font-medium">
                Welcome to your family readiness cockpit. Keep your emergency roster, 72-hour go-bag, and flood action plan ready for upcoming weather disturbances.
              </p>
            </div>

            {/* Quick Action Navigation Links */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                asChild
                size="sm"
                className="h-9 cursor-pointer gap-2 rounded-full border border-white/40 bg-white px-4 text-xs font-black text-emerald-950 shadow-sm transition-all hover:bg-neutral-100 active:scale-[0.98]"
              >
                <Link href="/portal/household">
                  <Users className="size-3.5 text-emerald-800" />
                  <span>Household Profile</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer gap-2 rounded-full border border-white/40 bg-white/15 px-4 text-xs font-bold text-white shadow-2xs transition-all hover:bg-white/25 active:scale-[0.98]"
              >
                <Link href="/portal/safety">
                  <ShieldCheck className="size-3.5 text-white" />
                  <span>Safety Check-In</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer gap-2 rounded-full border border-white/40 bg-white/15 px-4 text-xs font-bold text-white shadow-2xs transition-all hover:bg-white/25 active:scale-[0.98]"
              >
                <Link href="/portal/hazard-map">
                  <Map className="size-3.5 text-white" />
                  <span>Flood Map</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Real-time River & Weather Telemetry Capsule */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/25 bg-black/20 p-4 backdrop-blur-md shadow-md lg:w-80 shrink-0">
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-lg bg-white/20 text-white">
                  <Radio className="size-3.5 animate-pulse" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Live Telemetry
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap shrink-0",
                  alertLevel === 0
                    ? "bg-emerald-500/30 text-white border border-emerald-300/50"
                    : alertLevel === 1
                      ? "bg-amber-400 text-amber-950 border border-amber-300 shadow-2xs"
                      : "bg-red-500 text-white border border-red-300 shadow-2xs animate-pulse",
                )}
              >
                {alertLevelName}
              </span>
            </div>

            {/* River Metrics */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white/90 font-medium">
                <Waves className="size-3.5 text-sky-300" />
                <span>Montalban River:</span>
              </span>
              <span className="font-mono text-base font-black text-white">
                {river.data?.reading?.value !== undefined
                  ? `${river.data.reading.value.toFixed(2)} m`
                  : "22.60 m"}
              </span>
            </div>

            {/* Weather Metrics */}
            {(() => {
              const tempReading = weather.data?.readings?.find(
                (r) => r.metric === "temperature",
              );
              const rainReading = weather.data?.readings?.find(
                (r) => r.metric === "rainfall",
              );
              return (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="flex items-center gap-1.5 text-white/90 font-medium">
                    <CloudSun className="size-3.5 text-amber-300" />
                    <span>Current Weather:</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {tempReading?.value !== undefined
                      ? `${tempReading.value.toFixed(0)}°C`
                      : "30°C"}
                    {" • "}
                    <span className="text-white/90 font-medium text-[11px]">
                      {rainReading?.value !== undefined && rainReading.value > 0
                        ? `${rainReading.value.toFixed(1)} mm/hr Rain`
                        : "Fair / Dry"}
                    </span>
                  </span>
                </div>
              );
            })()}

            {/* Bottom Link */}
            <Link
              href="/portal/weather"
              className="mt-1 flex items-center justify-between rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
            >
              <span>View River Gauge Charts</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Five Key Operational Metrics Grid ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {/* Card 1: Household ID & Registered Area */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden portal-card-hover">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
                Household Ref
              </span>
              <div className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-700 shadow-2xs">
                <Home className="size-4" />
              </div>
            </div>
            <div>
              <span className="font-mono text-base sm:text-lg font-black text-neutral-900 block truncate">
                {data.reference_no}
              </span>
              <span className="text-xs font-bold text-emerald-700 truncate block mt-0.5">
                {data.area_name ?? "San Jose Zone"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Registered Family Members */}
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 shadow-xs overflow-hidden portal-card-hover">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase">
                Family Roster
              </span>
              <div className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                <UsersRound className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-950 tabular-nums">
                  {members.length}
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Member{members.length === 1 ? "" : "s"}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 block mt-0.5 truncate">
                Head: {firstName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Special Needs / Care Flags */}
        <Card
          className={cn(
            "shadow-xs overflow-hidden portal-card-hover",
            specialNeedsCount > 0
              ? "border-purple-200/90 bg-gradient-to-br from-purple-50/60 to-pink-50/30 text-purple-950"
              : "border-neutral-200/90 bg-white",
          )}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-black tracking-wider uppercase",
                  specialNeedsCount > 0 ? "text-purple-800" : "text-neutral-400",
                )}
              >
                Special Needs
              </span>
              <div
                className={cn(
                  "grid size-8 place-items-center rounded-xl shadow-2xs",
                  specialNeedsCount > 0
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                <HeartPulse className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-xl sm:text-2xl font-black tabular-nums",
                    specialNeedsCount > 0 ? "text-purple-950" : "text-neutral-900",
                  )}
                >
                  {specialNeedsCount}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    specialNeedsCount > 0 ? "text-purple-800" : "text-neutral-500",
                  )}
                >
                  Care Flag{specialNeedsCount === 1 ? "" : "s"}
                </span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium block mt-0.5 truncate",
                  specialNeedsCount > 0 ? "text-purple-800 font-bold" : "text-neutral-500",
                )}
              >
                {specialNeedsCount > 0
                  ? specialFlagsList.slice(0, 2).join(" • ")
                  : "Standard profile"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Waterway Proximity / Flood Risk */}
        <Card
          className={cn(
            "shadow-xs overflow-hidden portal-card-hover",
            currentProximity.tone,
          )}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500">
                Flood Proximity
              </span>
              <div className="grid size-8 place-items-center rounded-xl bg-white/90 text-neutral-700 shadow-2xs">
                <Droplets className="size-4 text-blue-600" />
              </div>
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-neutral-900 block truncate">
                {currentProximity.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold mt-1 shadow-2xs",
                  currentProximity.badge,
                )}
              >
                Waterway Zone
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: 72-Hour Go-Bag Readiness Status */}
        <Card className="col-span-2 sm:col-span-1 border-sky-200/90 bg-gradient-to-br from-sky-50/50 to-blue-50/30 shadow-xs overflow-hidden portal-card-hover">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider text-sky-800 uppercase">
                Go-Bag Readiness
              </span>
              <div className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700 shadow-2xs">
                <Backpack className="size-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-sky-950 tabular-nums">
                  {goBagPercent}%
                </span>
                <span className="text-[10.5px] font-bold text-sky-700">
                  {goBagChecked} of {goBagTotal} packed
                </span>
              </div>
              <MeterBar
                value={goBagChecked}
                max={goBagTotal}
                label="Go-Bag pack percentage"
                className="h-2 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 3. Main 12-Column Responsive Dashboard Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        {/* ── LEFT COLUMN: Flood Hazard Map + Family Roster (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Module A: Local Flood Hazard Map Preview */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <Map className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">
                    Local Flood Hazard Context
                  </h2>
                  <p className="text-xs text-neutral-500 font-normal">
                    Official UP NOAH flood hazard model centered on your residence in {data.area_name ?? "San Jose"}
                  </p>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-neutral-300 bg-white px-4 text-xs font-bold text-neutral-800 hover:bg-neutral-50 shadow-2xs"
              >
                <Link href="/portal/hazard-map">
                  <span>Open Full Hazard Map</span>
                  <ExternalLink className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="p-0">
                <PortalHouseholdMap household={data} preview />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/70 p-4 text-xs">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Building2 className="size-4 text-emerald-700" />
                    <span>
                      Nearest Evacuation Facility:{" "}
                      <strong className="text-neutral-900 font-bold">
                        Kasiglahan Village Elementary School / San Jose Covered Court
                      </strong>
                    </span>
                  </div>
                  <Link
                    href="/portal/hazard-map"
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <span>View Evacuation Routes</span>
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Module B: Household Safety & Members Roster */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <UsersRound className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">
                    Household Members Roster
                  </h2>
                  <p className="text-xs text-neutral-500 font-normal">
                    Registered family members & individual safety check-in status
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeEvents.length > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold border",
                      needsRescueCount > 0
                        ? "bg-red-50 text-red-800 border-red-200 animate-pulse"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200",
                    )}
                  >
                    {needsRescueCount > 0
                      ? `${needsRescueCount} Needs Rescue`
                      : `${safeCount} of ${members.length} Confirmed Safe`}
                  </span>
                ) : null}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full border-neutral-300 bg-white px-4 text-xs font-bold text-neutral-800 hover:bg-neutral-50 shadow-2xs"
                >
                  <Link href="/portal/household">
                    <span>Manage Roster</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            <HouseholdSafetyLine members={members} statuses={statuses} />
          </section>
        </div>

        {/* ── RIGHT COLUMN: Readiness Health + Broadcasts + Emergency Trigger (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Module C: Family Preparedness Health Index Card */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden portal-card-hover">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <HeartPulse className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                    Preparedness Health Index
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Household Readiness Scorecard
                  </span>
                </div>
              </div>

              {/* Progress 1: Go-Bag */}
              <div className="space-y-1.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                    <Backpack className="size-3.5 text-emerald-700" />
                    <span>72-Hour Go-Bag</span>
                  </span>
                  <span className="font-bold text-emerald-800">{goBagPercent}%</span>
                </div>
                <MeterBar
                  value={goBagChecked}
                  max={goBagTotal}
                  label="Go-bag pack meter"
                  className="h-1.5 rounded-full"
                />
                <span className="text-[10.5px] text-neutral-500 block pt-0.5">
                  {essentialChecked} of {essentialTotal} essential survival supplies packed
                </span>
              </div>

              {/* Progress 2: Family Plan */}
              <div className="space-y-1.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                    <FileText className="size-3.5 text-sky-700" />
                    <span>Emergency Family Plan</span>
                  </span>
                  <span
                    className={cn(
                      "font-bold text-xs",
                      familyPlanPercent === 100 ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    {familyPlanPercent === 100 ? "Configured ✓" : "Incomplete"}
                  </span>
                </div>
                <span className="text-[10.5px] text-neutral-500 block">
                  {hasMeetingPoint
                    ? `Assembly: ${familyPlan.data?.meeting_point}`
                    : "No meeting point assigned yet"}
                </span>
              </div>

              {/* Action Button */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full border-neutral-300 bg-white font-bold text-neutral-800 hover:bg-neutral-50 text-xs shadow-2xs"
              >
                <Link href="/portal/preparedness">
                  <span>Open Preparedness Hub</span>
                  <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module D: Recent Official Notices & Activity Feed */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden portal-card-hover">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Bell className="size-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-900">
                    Latest Advisories
                  </h3>
                </div>
                {unreadNoticesCount > 0 ? (
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {unreadNoticesCount} Unread
                  </span>
                ) : null}
              </div>

              {recentNotices.length > 0 ? (
                <div className="space-y-2.5">
                  {recentNotices.map((notice) => (
                    <Link
                      key={notice.id}
                      href={(notice.link_path ?? "/portal/updates") as never}
                      className="group block rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-neutral-900 text-xs truncate group-hover:text-emerald-900">
                          {notice.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {new Intl.DateTimeFormat("en-PH", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(notice.created_at))}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-neutral-600 line-clamp-2 mt-1 leading-snug">
                        {notice.body}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-2 text-center">
                  No active emergency broadcasts right now.
                </p>
              )}

              <Link
                href="/portal/updates"
                className="block text-center text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline pt-1"
              >
                View all notifications & logs →
              </Link>
            </CardContent>
          </Card>

          {/* Module E: Direct Emergency Dispatch Callout */}
          <div className="rounded-2xl border-2 border-red-300/90 bg-gradient-to-br from-red-50 via-rose-50/80 to-red-100/60 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-red-800">
              <LifeBuoy className="size-4 text-red-700" />
              <span className="text-[10px] font-black tracking-[0.14em] uppercase">
                Life-Safety Emergency
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-neutral-900">
                Need Immediate Rescue or Medical Evacuation?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                Submit an urgent GPS rescue dispatch ticket or dial the 24/7 BDRRMC command center.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                asChild
                size="sm"
                className="w-full cursor-pointer gap-1.5 rounded-full bg-red-600 font-bold text-white shadow-xs hover:bg-red-700 text-xs active:scale-[0.98]"
              >
                <Link href="/portal/rescue">
                  <LifeBuoy className="size-3.5" />
                  <span>Request Rescue</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full cursor-pointer gap-1.5 rounded-full border-neutral-300 bg-white font-bold text-neutral-800 hover:bg-neutral-50 text-xs"
              >
                <Link href="/portal/report">
                  <FileWarning className="size-3.5 text-amber-700" />
                  <span>Report Hazard</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
