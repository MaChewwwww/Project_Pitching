import * as React from "react";
import { Layers, MapPin } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
import { BarangayIsometric } from "@/components/features/public/illustrations/barangay-isometric";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { cn } from "@/lib/utils";
import type {
  PublicAreaStat,
  PublicFacility,
  PublicRiverLevel,
} from "@/lib/api/public-types";

/**
 * The hazard map slot, before the real map exists.
 *
 * Deliberately **not** a fake map: it is the legend, the area exposure
 * table, the facility count, disclaimers, and the live river level overlay,
 * over the isometric barangay illustration.
 */

const HAZARD_LEGEND = [
  { level: 1, label: "Low", depth: "0–0.5 m", swatch: "bg-hazard-low" },
  { level: 2, label: "Medium", depth: "0.5–1.5 m", swatch: "bg-hazard-medium" },
  { level: 3, label: "High", depth: "over 1.5 m", swatch: "bg-hazard-high" },
];

const EXPOSURE_TONE = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

export function HazardMapPlaceholder({
  areas,
  facilities,
  river,
  className,
}: {
  areas: PublicAreaStat[];
  facilities: PublicFacility[];
  river?: PublicRiverLevel;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shadow-sm-card overflow-hidden rounded-[20px] border border-neutral-200/90 bg-white",
        className,
      )}
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        <div className="from-primary-700 via-primary-800 to-primary-950 relative flex min-h-[340px] items-center justify-center bg-gradient-to-br p-6">
          <BarangayIsometric className="h-auto w-full max-w-lg" />
          <span className="text-caption absolute top-4 left-4 rounded-full border border-white/10 bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur-md">
            Interactive map coming with mapping module
          </span>

          {river ? (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex justify-end md:inset-x-6 md:bottom-6">
              <div className="pointer-events-auto w-full max-w-[17rem]">
                <RiverLevelPanel river={river} onDark density="compact" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-5 md:p-6">
          <div>
            <p className="text-overline mb-2.5 inline-flex items-center gap-1.5 font-bold tracking-wider text-neutral-600">
              <Layers aria-hidden className="text-primary-600 size-3.5" />
              Flood hazard levels
            </p>
            <ul className="flex flex-col gap-2">
              {HAZARD_LEGEND.map((entry) => (
                <li key={entry.level} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 rounded-sm border border-black/10 shadow-xs",
                      entry.swatch,
                    )}
                  />
                  <span className="text-body-sm text-neutral-700">
                    <span className="font-semibold">
                      {entry.level} · {entry.label}
                    </span>{" "}
                    — {entry.depth}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-overline mb-2.5 font-bold tracking-wider text-neutral-600">
              Exposure by area
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {areas.map((area) => (
                <li key={area.area_id}>
                  <Badge
                    tone={
                      area.flood_exposure ? EXPOSURE_TONE[area.flood_exposure] : "neutral"
                    }
                  >
                    {area.area_name} · {area.flood_exposure ?? "unassessed"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-body-sm inline-flex items-center gap-1.5 font-medium text-neutral-600">
            <MapPin aria-hidden className="text-primary-600 size-4" />
            {facilities.length} barangay facilities mapped
          </p>

          <Attribution
            className="mt-auto"
            sources={["hazard", "basemap"]}
            disclaimer="boundaries"
          />
        </div>
      </div>
    </div>
  );
}
