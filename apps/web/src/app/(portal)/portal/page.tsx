"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Backpack,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CloudSun,
  Droplets,
  FileWarning,
  HeartPulse,
  Home,
  LifeBuoy,
  Map,
  MapPin,
  ShieldAlert,
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

type GoBagResponse = {
  items: { id: string; is_essential: boolean }[];
  checked_item_ids: string[];
};

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

  const weather = useQuery({
    queryKey: ["public", "weather-current"],
    queryFn: () =>
      api.get<PublicWeatherCurrent>("/public/weather/current").then((r) => r.data),
  });

  const river = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () =>
      api.get<PublicRiverLevel>("/public/weather/river-level").then((r) => r.data),
  });

  if (household.isLoading || !household.data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-emerald-100/40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-64 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const data = household.data;
  const firstName = data.head_name.split(" ")[0] || "Resident";
  const members = data.members || [];
  const specialNeedsCount = members.filter(
    (m) =>
      m.is_pwd ||
      m.is_pregnant ||
      m.is_lactating ||
      m.has_chronic_condition ||
      m.is_bedridden,
  ).length;

  const statuses = Object.fromEntries(
    (safety.data?.household?.members ?? []).map((member) => [
      member.member_id,
      member.status,
    ]),
  );

  // Calculate Go-Bag Progress
  const goBagTotal = goBag.data?.items.length ?? 12;
  const goBagChecked = goBag.data?.checked_item_ids.length ?? 0;
  const goBagPercent = Math.round((goBagChecked / (goBagTotal || 1)) * 100);

  // River alert level name
  const alertLevel = river.data?.alert_level ?? 0;
  const alertLevelName =
    alertLevel === 0
      ? "Normal"
      : alertLevel === 1
        ? "Prepare"
        : alertLevel === 2
          ? "Evacuate"
          : "Critical";

  // Proximity label mapping
  const proximityMap: Record<
    string,
    { label: string; tone: string; badge: string }
  > = {
    very_near: {
      label: "Very Near (<1 km)",
      tone: "border-red-200 bg-red-50/60 text-red-950",
      badge: "bg-red-100 text-red-700 border-red-300",
    },
    near: {
      label: "Near (1–5 km)",
      tone: "border-amber-200 bg-amber-50/60 text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
    },
    far: {
      label: "Low Risk (>5 km)",
      tone: "border-emerald-200 bg-emerald-50/60 text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
  };

  const currentProximity =
    proximityMap[data.waterway_proximity ?? ""] || proximityMap.far;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Hero Greeting & Emergency Takeover Header ── */}
      {activeEvents.length > 0 ? (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-red-500 bg-gradient-to-br from-red-600 via-rose-600 to-red-700 p-6 sm:p-8 text-white shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 size-60 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black tracking-wider uppercase backdrop-blur-xs">
                <span className="size-2 rounded-full bg-white animate-ping" />
                <span>Emergency Operations Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                {activeEvents.length === 1
                  ? activeEvents[0].name
                  : "Active Barangay Emergency Declared"}
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-red-100/90 leading-relaxed">
                Confirm your family’s individual status to let the BDRRMC know who is
                safe and dispatch rescue if water levels rise.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:pt-2">
              <Button
                asChild
                className="h-11 rounded-xl bg-white px-5 text-xs font-black text-red-700 hover:bg-red-50 shadow-md transition-all active:scale-95"
              >
                <Link href="/portal/safety">
                  <ShieldCheck className="size-4" />
                  Check In Household
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-white/40 bg-white/10 text-xs font-bold text-white hover:bg-white/20"
              >
                <Link href="/portal/rescue">
                  <LifeBuoy className="size-4" />
                  Request Rescue
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 p-6 sm:p-8 shadow-xs">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 size-60 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
                  <Sparkles className="size-3.5 text-emerald-700" />
                  <span>Household Registered</span>
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-neutral-700">
                  {data.reference_no}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">
                Mabuhay, <span className="text-emerald-700">{firstName}!</span>
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-neutral-600">
                Welcome to your Barangay San Jose household readiness space. Keep your
                family roster, go-bag supplies, and emergency plan current.
              </p>
            </div>

            {/* Quick Live River & Weather Status Pill */}
            {river.data || weather.data ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200/80 bg-white/90 p-4 shadow-2xs sm:min-w-64">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-700">
                    <Waves className="size-4 text-emerald-600" />
                    Montalban River
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.2 text-[10px] font-black uppercase",
                      alertLevel === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800 animate-pulse",
                    )}
                  >
                    {alertLevelName}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 text-xs">
                  <span className="text-neutral-500 font-medium">Water Level</span>
                  <span className="text-base font-black text-neutral-900 tabular-nums">
                    {river.data?.reading?.value !== undefined
                      ? `${river.data.reading.value.toFixed(2)} m`
                      : "22.60 m"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── 2. Four Key Household Metric Cards Strip ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Card 1: Household Number & Area */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              Household ID
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Home className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-lg sm:text-xl font-black text-slate-900 truncate block">
              {data.reference_no}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 truncate block mt-0.5">
              {data.area_name ?? "San Jose"}
            </span>
          </div>
        </div>

        {/* Card 2: Household Citizens */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase">
              Registered Citizens
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <UsersRound className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
              {members.length}
            </span>
            <span className="text-[11px] font-medium text-emerald-800 block mt-0.5">
              {specialNeedsCount > 0
                ? `${specialNeedsCount} special care flags`
                : "No special care flags"}
            </span>
          </div>
        </div>

        {/* Card 3: Waterway Proximity / Flood Risk */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all",
            currentProximity.tone,
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-neutral-600">
              Flood Proximity
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-white/80 text-neutral-700">
              <Droplets className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm sm:text-base font-black text-neutral-900 block truncate">
              {currentProximity.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold mt-1",
                currentProximity.badge,
              )}
            >
              Waterway Proximity
            </span>
          </div>
        </div>

        {/* Card 4: Go-Bag Readiness Status */}
        <div className="flex flex-col justify-between rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-sky-800 uppercase">
              Go-Bag Status
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-sky-100 text-sky-700">
              <Backpack className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-sky-950 tabular-nums">
                {goBagPercent}%
              </span>
              <span className="text-[10px] font-bold text-sky-700">
                {goBagChecked}/{goBagTotal} packed
              </span>
            </div>
            <MeterBar
              value={goBagChecked}
              max={goBagTotal}
              label="Go-Bag pack percentage"
              className="h-2 rounded-full"
            />
          </div>
        </div>
      </section>

      {/* ── 3. Household Citizens Safety Roster ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <UsersRound className="size-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">
                Household Citizens Roster
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                People listed under Reference #{data.reference_no}
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
            <Link href="/portal/household">
              <span>Manage Roster</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <HouseholdSafetyLine members={members} statuses={statuses} />
      </section>

      {/* ── 4. Local Flood Context & Map Preview ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <Map className="size-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">
                Local Flood Hazard Context
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                Official UP NOAH 5-year flood layer centered on your home
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
            <Link href="/portal/hazard-map">
              <span>View Map</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <PortalHouseholdMap household={data} preview />
      </section>

      {/* ── 5. Readiness & Action Hub (4 Interactive Feature Cards) ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-neutral-200/80 pb-3">
          <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
            <HeartPulse className="size-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900">
              Household Readiness Hub
            </h2>
            <p className="text-xs text-neutral-500 font-normal">
              Essential preparation tools and community reporting services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Go-Bag Checklist */}
          <Link
            href="/portal/preparedness/go-bag"
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
                  <Backpack className="size-5" />
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  {goBagPercent}% Complete
                </span>
              </div>
              <h3 className="mt-3.5 text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                Go-Bag Checklist
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Pack 72-hour emergency food, water, medicine, and survival gear.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <span>Open checklist</span>
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Card 2: Family Emergency Plan */}
          <Link
            href="/portal/preparedness/family-plan"
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700 group-hover:scale-105 transition-transform">
                  <Home className="size-5" />
                </span>
                <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
                  Plan
                </span>
              </div>
              <h3 className="mt-3.5 text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                Family Emergency Plan
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Set meeting points and outside emergency contact numbers.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <span>Review plan</span>
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Card 3: Report Incident */}
          <Link
            href="/portal/report"
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 group-hover:scale-105 transition-transform">
                  <FileWarning className="size-5" />
                </span>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                  Report
                </span>
              </div>
              <h3 className="mt-3.5 text-sm font-bold text-neutral-900 group-hover:text-amber-900 transition-colors">
                Report an Incident
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Send geotagged photos of flooding, blocked roads, or power outages.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-800">
              <span>File report</span>
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Card 4: Household History */}
          <Link
            href="/portal/history"
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:scale-105 transition-transform">
                  <ClipboardList className="size-5" />
                </span>
                <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-black text-slate-700">
                  Log
                </span>
              </div>
              <h3 className="mt-3.5 text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                Household History
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                View past safety check-ins, evacuation logs, and resolution notes.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <span>View timeline</span>
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
