import * as React from "react";
import { Building2, Layers, Waves } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { HazardMap } from "@/components/features/map/hazard-map";
import { cn } from "@/lib/utils";
import type {
  PublicAreaStat,
  PublicFacility,
  PublicRiverLevel,
} from "@/lib/api/public-types";

/**
 * The hazard map overview card on the public landing page.
 *
 * Renders a non-interactable Leaflet hazard overview map alongside the official
 * Project NOAH 5-Year Flood Hazard Layer legend (Low, Medium, High Hazard depths)
 * enriched with resident onboarding survey waterway proximity classifications.
 */

const HAZARD_LEGEND = [
  {
    level: "Low Hazard",
    depth: "0–0.5 m",
    waterwayDistance: "> 200m from riverbank",
    waterwayDesc: "Far from primary river overflow zones",
    color: "bg-[#FFED4A]",
    borderColor: "border-yellow-500/40",
    badgeBg: "bg-yellow-100/90 text-yellow-900 border-yellow-300/70",
    cardBg: "border-yellow-200 bg-yellow-50/60",
    distanceBadge: "text-yellow-800 bg-yellow-200/60 border-yellow-300/80",
  },
  {
    level: "Medium Hazard",
    depth: "0.5–1.5 m",
    waterwayDistance: "50m – 200m from waterways",
    waterwayDesc: "Mid-slope / moderate overflow reach",
    color: "bg-[#F59E0B]",
    borderColor: "border-amber-600/40",
    badgeBg: "bg-amber-100/90 text-amber-900 border-amber-300/70",
    cardBg: "border-amber-200 bg-amber-50/60",
    distanceBadge: "text-amber-800 bg-amber-200/60 border-amber-300/80",
  },
  {
    level: "High Hazard",
    depth: "over 1.5 m",
    waterwayDistance: "< 50m from riverbank",
    waterwayDesc: "Immediate riverbank & low-lying flood line",
    color: "bg-[#EF4444]",
    borderColor: "border-red-600/40",
    badgeBg: "bg-red-100/90 text-red-900 border-red-300/70",
    cardBg: "border-red-200 bg-red-50/60",
    distanceBadge: "text-red-800 bg-red-200/60 border-red-300/80",
  },
];

export function HazardMapPlaceholder({
  facilities,
  className,
}: {
  areas: PublicAreaStat[];
  facilities: PublicFacility[];
  river?: PublicRiverLevel;
  className?: string;
}) {
  const evacCount = React.useMemo(
    () => facilities.filter((f) => f.type === "evacuation_center").length,
    [facilities],
  );

  return (
    <div
      className={cn(
        "shadow-sm-card overflow-hidden rounded-[20px] border border-neutral-200/90 bg-white",
        className,
      )}
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column: Non-interactable Leaflet Map Preview */}
        <div className="relative flex h-[410px] lg:h-full w-full items-center justify-center bg-slate-950 p-0 overflow-hidden">
          <HazardMap
            interactive={false}
            className="h-full w-full min-h-[410px]"
          />
          <span className="text-caption absolute top-4 left-4 z-[600] rounded-full border border-white/20 bg-slate-900/85 px-3.5 py-1.5 font-extrabold text-emerald-400 backdrop-blur-md shadow-md flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Barangay San Jose Flood Overview
          </span>
        </div>

        {/* Right Column: Official Flood Hazard Layer Legend & Onboarding Waterway Proximity */}
        <div className="flex flex-col gap-4 p-5 md:p-6 bg-slate-50/50">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-neutral-200/80 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Layers className="size-4" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-neutral-900 leading-tight">
                Flood Hazard Layer (NOAH)
              </h4>
              <span className="text-[11px] font-semibold text-neutral-500">
                Depth Levels & Onboarding Waterway Survey Proximity
              </span>
            </div>
          </div>

          {/* Official Flood Hazard Legend Cards with Waterway Proximity */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
              Flood Risk Levels, Depths & Waterway Distances
            </p>

            <div className="flex flex-col gap-2.5">
              {HAZARD_LEGEND.map((item) => (
                <div
                  key={item.level}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl border p-3 shadow-2xs transition-all",
                    item.cardBg,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-4 rounded-full border shadow-xs shrink-0",
                          item.color,
                          item.borderColor,
                        )}
                      />
                      <span className="text-xs font-bold text-neutral-900">
                        {item.level}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs",
                        item.badgeBg,
                      )}
                    >
                      {item.depth}
                    </span>
                  </div>

                  {/* Waterway Proximity Sub-Row */}
                  <div className="flex items-center justify-between pl-6 pt-0.5">
                    <span className="text-[11px] font-medium text-neutral-600 flex items-center gap-1.5">
                      <Waves className="size-3.5 text-neutral-500 shrink-0" />
                      {item.waterwayDesc}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0",
                        item.distanceBadge,
                      )}
                    >
                      {item.waterwayDistance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Metrics */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <Building2 className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">
                Evacuation Infrastructure
              </span>
              <span className="text-xs font-extrabold text-neutral-900">
                {evacCount} Evacuation Centers{" "}
                <span className="text-neutral-400 font-normal">
                  ({facilities.length} total mapped facilities)
                </span>
              </span>
            </div>
          </div>

          {/* Attribution Footer */}
          <Attribution
            className="mt-auto pt-2"
            sources={["hazard", "basemap"]}
            disclaimer="boundaries"
          />
        </div>
      </div>
    </div>
  );
}
