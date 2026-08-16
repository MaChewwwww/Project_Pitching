"use client";

import * as React from "react";
import Link from "next/link";
import { Database, ExternalLink, MapPin, MapPinned, Pencil } from "lucide-react";

import { Button } from "@/components/common/button";
import { HazardMap } from "@/components/features/map/hazard-map";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { HAZARD_LEVELS } from "@/lib/map";

export function PortalHouseholdMap({
  household,
  preview = false,
}: {
  household: HouseholdDetailOut;
  preview?: boolean;
}) {
  if (!household.location) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/40 p-8 text-center shadow-2xs">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
          <MapPinned className="size-6 text-emerald-600" />
        </span>
        <h3 className="mt-3 text-base font-bold text-neutral-900">
          No Pin Location Set
        </h3>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
          Set your household coordinates on the map to see your official 5-year flood
          hazard level and nearby evacuation centers.
        </p>
        <Button asChild size="sm" className="mt-4 rounded-xl font-bold">
          <Link href="/portal/household/edit">
            <Pencil className="size-3.5" />
            Set Household Pin
          </Link>
        </Button>
      </div>
    );
  }

  const [longitude, latitude] = household.location.coordinates;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white shadow-xs">
      {/* Top Map Context Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <MapPin className="size-3.5" />
          </span>
          <span className="font-bold text-neutral-800">
            {household.area_name ?? "Barangay San Jose"}
          </span>
          <span className="font-mono text-[11px] text-neutral-400">
            ({latitude.toFixed(4)}, {longitude.toFixed(4)})
          </span>
        </div>

        {preview ? (
          <Link
            href="/portal/hazard-map"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            <span>Full Map & Shelters</span>
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
      </div>

      {/* Embedded Leaflet Map */}
      <div className="relative">
        <HazardMap
          className={preview ? "h-56 sm:h-64 w-full" : "h-[360px] sm:h-[420px] lg:h-[460px] w-full"}
          center={[latitude, longitude]}
          zoom={16}
          interactive={!preview}
          preserveStaticCenter={preview}
          householdMarker={{
            position: [latitude, longitude],
            label: `${household.head_name}'s Home`,
          }}
        />

        {/* Data Sources Attribution Badge (Admin Portal Style) */}
        <div
          aria-label="Data sources attribution"
          className="pointer-events-none absolute bottom-3.5 right-3.5 z-[1000] hidden sm:flex flex-col gap-0.5 rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-2.5 text-[10px] text-emerald-200/90 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-emerald-400 text-[9.5px]">
            <Database className="size-3 text-emerald-400" aria-hidden />
            <span>Data Sources</span>
          </div>
          <div>
            <span className="font-semibold text-white/90">Locality:</span> San Jose, Rodriguez, Rizal
          </div>
          <div>
            <span className="font-semibold text-white/90">Flood Model:</span> UP NOAH / LiPAD (ODC-ODbL)
          </div>
          <div className="text-[9px] text-emerald-400/60 pt-0.5 border-t border-emerald-900/60 mt-0.5">
            Map: Leaflet · © OpenStreetMap · CARTO
          </div>
        </div>
      </div>

      {/* Map Legend & Hazard Strip Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px]">
            Flood Hazard:
          </span>
          {HAZARD_LEVELS.map((level) => (
            <div key={level.level} className="flex items-center gap-1.5 text-xs text-neutral-700">
              <span
                className="size-2.5 rounded-xs shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: level.color }}
              />
              <span className="font-medium">{level.label}</span>
              <span className="text-[10px] text-neutral-400">({level.depth})</span>
            </div>
          ))}
        </div>

        {!preview ? (
          <a
            href="/hazard-map"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
          >
            Open Public Map
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
