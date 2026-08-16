"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Droplets,
  ExternalLink,
  Info,
  Map,
  MapPin,
  Pencil,
  ShieldAlert,
  Sparkles,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { HAZARD_LEVELS } from "@/lib/map";
import { cn } from "@/lib/utils";

export default function PortalHazardMapPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  if (household.isLoading || !household.data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="h-28 rounded-2xl bg-slate-100" />
        <div className="h-96 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const data = household.data;
  const hasLocation = Boolean(data.location);

  const proximityMap: Record<
    string,
    { label: string; tone: string; badge: string; risk: string }
  > = {
    very_near: {
      label: "Very Near (<1 km)",
      tone: "border-red-200 bg-red-50/50 text-red-950",
      badge: "bg-red-100 text-red-700 border-red-300",
      risk: "High Risk Area",
    },
    near: {
      label: "Near (1–5 km)",
      tone: "border-amber-200 bg-amber-50/50 text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      risk: "Medium Risk Area",
    },
    far: {
      label: "Far (>5 km)",
      tone: "border-emerald-200 bg-emerald-50/50 text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      risk: "Low Risk Area",
    },
  };

  const proximity = proximityMap[data.waterway_proximity ?? ""] || proximityMap.far;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Map}
        title="Flood Hazard"
        titleAccent="Map"
        description="Official UP NOAH / LiPAD 5-year flood simulation overlay centered on your household location in Barangay San Jose."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>UP NOAH / LiPAD Model</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
            >
              <Link href="/portal/household/edit">
                <Pencil className="size-3.5" />
                Update Coordinates
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs font-bold shadow-xs">
              <a href="/hazard-map" target="_blank" rel="noreferrer">
                <span>Public Map</span>
                <ExternalLink className="size-3.5 ml-1" />
              </a>
            </Button>
          </div>
        }
      />

      {/* ── 1. Household Spatial Risk Summary Ribbon ── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Card 1: Area & Address */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              Location Area
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <MapPin className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base font-black text-slate-900 block truncate">
              {data.area_name ?? "Barangay San Jose"}
            </span>
            <span className="text-xs text-slate-500 block truncate mt-0.5">
              {data.street_address || "Address on record"}
            </span>
          </div>
        </div>

        {/* Card 2: Waterway Proximity */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-2xs",
            proximity.tone,
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-neutral-600">
              Waterway Proximity
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-white/80 text-neutral-700">
              <Droplets className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base font-black text-neutral-900 block truncate">
              {proximity.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.2 text-[10px] font-bold mt-1",
                proximity.badge,
              )}
            >
              {proximity.risk}
            </span>
          </div>
        </div>

        {/* Card 3: Evacuation Guideline */}
        <div className="flex flex-col justify-between rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider text-sky-800 uppercase">
              Evacuation Center
            </span>
            <div className="grid size-7 place-items-center rounded-lg bg-sky-100 text-sky-700">
              <Building2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base font-black text-sky-950 block truncate">
              Designated Shelters
            </span>
            <span className="text-xs text-sky-700 block mt-0.5">
              14 Designated Evacuation Centers
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Interactive Map View ── */}
      <section className="space-y-4">
        <PortalHouseholdMap household={data} />
      </section>

      {/* ── 3. Flood Depth Levels Explanation Card ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Info className="size-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Philippine Official Flood Hazard Scale (Project NOAH / LiPAD)
              </h3>
              <p className="text-xs text-neutral-500">
                Recommended family actions depending on the mapped depth layer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Low Hazard */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-xs bg-[#FFED4A] ring-1 ring-black/10" />
                <h4 className="text-xs font-black uppercase text-yellow-950">
                  Low Hazard (0 – 0.5 m)
                </h4>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Ankle to knee-deep water. Streets may become impassable for light
                vehicles. Secure low-lying electronics and prepare Go-Bags.
              </p>
            </div>

            {/* Medium Hazard */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-xs bg-[#F59E0B] ring-1 ring-black/10" />
                <h4 className="text-xs font-black uppercase text-amber-950">
                  Medium Hazard (0.5 – 1.5 m)
                </h4>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Waist to chest-deep water. Dangerous currents in roads. Move elderly,
                infants, and pets to upper floors or nearest evacuation center early.
              </p>
            </div>

            {/* High Hazard */}
            <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-xs bg-[#EF4444] ring-1 ring-black/10" />
                <h4 className="text-xs font-black uppercase text-red-950">
                  High Hazard (&gt; 1.5 m)
                </h4>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Submerges first floor completely. Mandatory preemptive evacuation.
                Follow BDRRMC evacuation alerts immediately before power cuts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
