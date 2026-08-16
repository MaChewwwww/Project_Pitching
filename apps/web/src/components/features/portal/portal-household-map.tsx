"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, MapPinned, Pencil } from "lucide-react";

import { Button } from "@/components/common/button";
import { HazardMap } from "@/components/features/map/hazard-map";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { HAZARD_LEVELS } from "@/lib/map";
import { cn } from "@/lib/utils";

export function PortalHouseholdMap({
  household,
  preview = false,
}: {
  household: HouseholdDetailOut;
  preview?: boolean;
}) {
  const [showHazardLayer, setShowHazardLayer] = React.useState(true);

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
      {/* Embedded Leaflet Map */}
      <div className="relative">
        <HazardMap
          className={preview ? "h-56 sm:h-64 w-full" : "h-[360px] sm:h-[420px] lg:h-[460px] w-full"}
          center={[latitude, longitude]}
          zoom={16}
          interactive={!preview}
          preserveStaticCenter={preview}
          showHazardLayer={showHazardLayer}
          householdMarker={{
            position: [latitude, longitude],
            label: `${household.head_name}'s Home`,
          }}
        />
      </div>

      {/* Map Controls & Legend Strip Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-4 py-3 text-xs">
        {/* Left: Hazard Color Legend */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-1.5 transition-opacity",
            !showHazardLayer && "opacity-40",
          )}
        >
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

        {/* Right: Toggle Flood Hazard Checkbox */}
        <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-xs font-bold text-neutral-800 shadow-2xs transition-colors hover:bg-emerald-50 hover:border-emerald-200">
          <input
            type="checkbox"
            checked={showHazardLayer}
            onChange={(e) => setShowHazardLayer(e.target.checked)}
            className="size-3.5 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="flex items-center gap-1">
            <Layers className="size-3 text-emerald-700" />
            <span>Flood Hazard Layer</span>
          </span>
        </label>
      </div>
    </div>
  );
}
