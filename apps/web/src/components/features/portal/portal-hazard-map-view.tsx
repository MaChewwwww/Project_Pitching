"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Building2,
  Check,
  Home,
  Layers,
  Map as MapIcon,
  MapPin,
  Pencil,
  Siren,
  Sparkles,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import type {
  AreaBoundaryFeature,
  PublicAreaStat,
  PublicFacility,
  PublicRiverLevel,
} from "@/lib/api/public-types";
import type { PublicSiren } from "@/components/features/map/hazard-map-client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

// Dynamically import Leaflet client component with SSR disabled
const PortalHazardMapCanvas = dynamic(
  () =>
    import("@/components/features/portal/portal-hazard-map-canvas").then(
      (mod) => mod.PortalHazardMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[450px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Loading UP NOAH Flood Hazard Map & Household Location...
        </p>
      </div>
    ),
  },
);

interface PortalHazardMapViewProps {
  household: HouseholdDetailOut;
  areaBoundaries: AreaBoundaryFeature[];
  facilities: PublicFacility[];
  areaStats: PublicAreaStat[];
  sirens: PublicSiren[];
  river: PublicRiverLevel;
}

export function PortalHazardMapView({
  household,
  areaBoundaries,
  facilities,
  areaStats,
  sirens,
  river,
}: PortalHazardMapViewProps) {
  // Local layer visibility state: facilities initially false per user specification
  const [layers, setLayers] = React.useState({
    hazard: true,
    areas: true,
    facilities: false, // Initially off as requested!
    sirens: false,
    household: true,
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasLocation = Boolean(household.location?.coordinates);
  // PostGIS Point coordinates: [longitude, latitude] -> Leaflet expects [lat, lng]
  const householdCoords: [number, number] | null = household.location?.coordinates
    ? [household.location.coordinates[1], household.location.coordinates[0]]
    : null;

  // Proximity assessment
  const proximityMap: Record<
    string,
    { label: string; tone: string; badge: string; risk: string; distance: string }
  > = {
    very_near: {
      label: "Very Near Waterway",
      tone: "border-red-200 bg-red-50/50 text-red-950",
      badge: "bg-red-100 text-red-700 border-red-300",
      risk: "High Flood Exposure",
      distance: "< 50 meters to riverbank / creek",
    },
    near: {
      label: "Near Waterway",
      tone: "border-amber-200 bg-amber-50/50 text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      risk: "Moderate Flood Exposure",
      distance: "50–200 meters to waterway",
    },
    far: {
      label: "Elevated / Safe Distance",
      tone: "border-emerald-200 bg-emerald-50/50 text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      risk: "Low Flood Exposure",
      distance: "> 200 meters from major riverbanks",
    },
  };

  const proximity = proximityMap[household.waterway_proximity ?? ""] || proximityMap.far;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={MapIcon}
        title="Flood Hazard"
        titleAccent="Map"
        description="Official UP NOAH / LiPAD 5-year flood simulation overlay centered on your household location in Barangay San Jose."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              <Link href="/portal/household/edit">
                <Pencil aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>Update Coordinates</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Main Map Canvas & Controls Section (Matching Public Hazard Map Architecture) ── */}
      <section aria-label="Interactive flood hazard map">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
          {/* Map canvas (Expands to match or exceed sidebar height) */}
          <div className="relative min-h-[580px] sm:min-h-[680px] lg:min-h-[820px] w-full flex-1 self-stretch overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <PortalHazardMapCanvas
              center={householdCoords ?? [14.7415, 121.1315]}
              zoom={householdCoords ? 15.2 : 14.25}
              householdLocation={householdCoords}
              householdInfo={{
                head_name: household.head_name,
                reference_no: household.reference_no,
                area_name: household.area_name ?? "Barangay San Jose",
                street_address: household.street_address ?? "San Jose",
                waterway_proximity: household.waterway_proximity ?? null,
              }}
              areaBoundaries={areaBoundaries}
              facilities={facilities}
              areaStats={areaStats}
              sirens={sirens}
              layers={layers}
            />
          </div>

          {/* Sidebar Controls (Layers, Legend, Data Sources) */}
          <div className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
            {/* River Alert Level Pill (Sitting directly above the Layers container) */}
            {river.alert_level > 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary-800/60 bg-primary-950/95 px-4 py-3 text-xs font-extrabold text-white shadow-xl backdrop-blur-md">
                <span className="relative flex size-2 shrink-0">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      river.alert_level >= 3
                        ? "bg-red-400"
                        : river.alert_level === 2
                        ? "bg-amber-400"
                        : "bg-yellow-400",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex size-2 rounded-full",
                      river.alert_level >= 3
                        ? "bg-red-500"
                        : river.alert_level === 2
                        ? "bg-amber-500"
                        : "bg-yellow-400",
                    )}
                  />
                </span>
                <span
                  className={
                    river.alert_level >= 3
                      ? "text-red-300"
                      : river.alert_level === 2
                      ? "text-amber-300"
                      : "text-yellow-300"
                  }
                >
                  🌊 Alert Level {river.alert_level}
                </span>
              </div>
            ) : null}

            {/* 1. Layers Container */}
            <div className="rounded-2xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300 border-b border-white/10 pb-2">
                <Layers className="size-3.5 text-primary-400" />
                <span>Map Layers</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Household Pin Toggle (Blue) */}
                {hasLocation ? (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={layers.household}
                      onChange={() => toggleLayer("household")}
                      className="size-4 rounded border-primary-600 bg-primary-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <Home className="size-3.5 text-sky-400 shrink-0" />
                      <span>My Household Location</span>
                    </span>
                  </label>
                ) : null}

                {/* Flood Hazard 5-Year Toggle (Amber Waves) */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.hazard}
                    onChange={() => toggleLayer("hazard")}
                    className="size-4 rounded border-primary-600 bg-primary-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-white/90 flex items-center gap-1.5">
                    <Waves className="size-3.5 text-amber-400 shrink-0" />
                    <span>Flood hazard (5-year)</span>
                  </span>
                </label>

                {/* Area List / Boundaries Toggle (Emerald MapPin) */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.areas}
                    onChange={() => toggleLayer("areas")}
                    className="size-4 rounded border-primary-600 bg-primary-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-white/90 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-400 shrink-0" />
                    <span>Area list</span>
                  </span>
                </label>

                {/* Evacuation Centers Toggle (Green Building2) */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.facilities}
                    onChange={() => toggleLayer("facilities")}
                    className="size-4 rounded border-primary-600 bg-primary-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-white/90 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-emerald-400 shrink-0" />
                    <span>Evacuation Centers</span>
                  </span>
                </label>

                {/* Siren Units Toggle (Rose Siren) */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.sirens}
                    onChange={() => toggleLayer("sirens")}
                    className="size-4 rounded border-primary-600 bg-primary-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-white/90 flex items-center gap-1.5">
                    <Siren className="size-3.5 text-rose-400 shrink-0" />
                    <span>Siren units</span>
                  </span>
                </label>
              </div>
            </div>

            {/* 2. Map Legend Container */}
            <div className="rounded-2xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300 border-b border-white/10 pb-2">
                <MapIcon className="size-3.5 text-primary-400" />
                <span>Legend</span>
              </div>

              {/* Flood Hazard Layers */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-primary-400">
                  Flood Hazard Layer (NOAH)
                </span>
                <div className="space-y-1.5 text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#FFED4A] shadow-2xs shrink-0" />
                    <span>Low Hazard (0–0.5 m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#F59E0B] shadow-2xs shrink-0" />
                    <span>Medium Hazard (0.5–1.5 m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#EF4444] shadow-2xs shrink-0" />
                    <span>High Hazard (Over 1.5 m)</span>
                  </div>
                </div>
              </div>

              {/* Map Boundaries */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-primary-400">
                  Map Boundaries
                </span>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <span className="w-4 border-b-2 border-dashed border-emerald-400 shrink-0" />
                  <span>San Jose Boundary</span>
                </div>
              </div>

              {/* Evacuation Centers (Green) */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-primary-400">
                  Evacuation Centers
                </span>
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-white text-[9px] shrink-0">
                    <Building2 className="size-2.5" />
                  </span>
                  <span>Evacuation Center (Green)</span>
                </div>
              </div>

              {/* Household Pin Marker (Blue) */}
              {hasLocation ? (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-primary-400">
                    Your Household
                  </span>
                  <div className="flex items-center gap-2 text-xs text-sky-300 font-semibold">
                    <span className="grid size-4 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white text-[9px] shrink-0">
                      <Home className="size-2.5" />
                    </span>
                    <span>Your Household Pin (Blue)</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 3. Data Sources Container */}
            <div className="rounded-2xl border border-primary-800/60 bg-primary-950/95 p-4 text-[11px] text-primary-200/70 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400 border-b border-white/10 pb-1.5">
                <Sparkles className="size-3.5 text-primary-400" />
                <span>Data Sources</span>
              </div>
              <div>
                <span className="font-semibold text-white/80">Locality:</span>{" "}
                <span>Barangay San Jose, Rodriguez (Montalban), Rizal</span>
              </div>
              <div>
                <span className="font-semibold text-white/80">Data:</span>{" "}
                <span className="text-primary-300 font-bold">UP NOAH / UPAD (ODC-ODbL)</span>
              </div>
              <div className="border-t border-primary-800/60 pt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="font-semibold text-white/80">Map:</span>
                <span className="text-primary-300">Leaflet</span>
                <span>&middot;</span>
                <span>&copy;</span>
                <span className="text-primary-300">OpenStreetMap</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Household Location Details & Exposure Assessment Card ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <Home className="size-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">
                Your Household Exposure Assessment
              </h2>
              <p className="text-xs text-neutral-500">
                Spatial risk analysis based on registered coordinates and UP NOAH flood data
              </p>
            </div>
          </div>

          <Button
            asChild
            size="sm"
            className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <Link href="/portal/household/edit">
              <Pencil aria-hidden className="size-3.5 stroke-[2.5]" />
              <span>Edit Coordinates</span>
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Registered Address */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Registered Address
            </span>
            <p className="text-sm font-bold text-neutral-900 truncate">
              {household.street_address || "San Jose"}
            </p>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1">
              <MapPin className="size-3 text-neutral-400" />
              <span>{household.area_name ?? "Barangay San Jose"}</span>
            </p>
          </div>

          {/* Card 2: Coordinates Status */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              GPS Coordinates
            </span>
            <p className="font-mono text-xs font-bold text-neutral-900">
              {householdCoords
                ? `${householdCoords[0].toFixed(5)}, ${householdCoords[1].toFixed(5)}`
                : "Not pinned"}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9.5px] font-black text-emerald-800 uppercase">
              <Check className="size-2.5 text-emerald-700" />
              <span>Verified Location</span>
            </span>
          </div>

          {/* Card 3: Waterway Proximity */}
          <div className={cn("rounded-2xl border p-4 shadow-2xs space-y-1 bg-white", proximity.tone)}>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Waterway Proximity
            </span>
            <p className="text-sm font-bold text-neutral-900 truncate">{proximity.label}</p>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold",
                proximity.badge,
              )}
            >
              {proximity.distance}
            </span>
          </div>

          {/* Card 4: Hazard Zone Level */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Exposure Level
            </span>
            <p className="text-sm font-black text-neutral-900">{proximity.risk}</p>
            <p className="text-[11px] text-neutral-500">UP NOAH 5-Year Flood Model</p>
          </div>
        </div>
      </section>
    </div>
  );
}
