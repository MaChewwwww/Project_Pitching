import * as React from "react";
import { Layers, MapPin } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
import { BarangayIsometric } from "@/components/features/public/illustrations/barangay-isometric";
import { cn } from "@/lib/utils";
import type { PublicAreaStat, PublicFacility } from "@/lib/api/public-types";

/**
 * The hazard map slot, before the real map exists.
 *
 * The interactive Leaflet map is FR-MAP-001…007 and its own change. What ships
 * here is deliberately **not** a fake map: it is the legend, the area exposure
 * table, the facility count, and the two disclaimers, over the same illustration
 * used in the hero.
 *
 * That choice is the point. A static image styled to look like a slippy map
 * invites someone to pinch it during a flood and conclude the site is broken.
 * This says plainly what it is and still carries the information the map would.
 *
 * The attribution and the boundary disclaimer are not placeholders — NOAH's
 * ODC-ODbL licence and FR-MAP-008 apply to the hazard ramp shown here just as
 * they will to the map.
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
  className,
}: {
  areas: PublicAreaStat[];
  facilities: PublicFacility[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        <div className="from-primary-700 via-primary-800 to-primary-950 relative flex min-h-[280px] items-center justify-center bg-gradient-to-br p-6">
          <BarangayIsometric className="h-auto w-full max-w-lg" />
          <span className="text-caption absolute top-4 left-4 rounded-full bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm">
            Interactive map coming with the mapping module
          </span>
        </div>

        <div className="flex flex-col gap-5 p-4 md:p-6">
          <div>
            <p className="text-overline mb-2.5 inline-flex items-center gap-1.5 text-neutral-500">
              <Layers aria-hidden className="size-3" />
              Flood hazard levels
            </p>
            <ul className="flex flex-col gap-2">
              {HAZARD_LEGEND.map((entry) => (
                <li key={entry.level} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 rounded-sm border border-black/10",
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
            <p className="text-overline mb-2.5 text-neutral-500">Exposure by area</p>
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

          <p className="text-body-sm inline-flex items-center gap-1.5 text-neutral-600">
            <MapPin aria-hidden className="size-3.5 text-neutral-400" />
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
