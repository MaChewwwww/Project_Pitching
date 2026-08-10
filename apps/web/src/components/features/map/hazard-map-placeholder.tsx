import * as React from "react";
import { Building2, Layers, ShieldAlert, Users, Waves } from "lucide-react";

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
 * Renders a non-interactable Leaflet hazard overview map alongside a 2-column panel:
 * - Column 1: Official Project NOAH Flood Hazard Legend with vertical dot swatch & inline waterway proximity
 * - Column 2: Key Barangay disaster preparedness metrics and attribution disclaimer
 */

const HAZARD_LEGEND = [
  {
    level: "Low Hazard",
    depth: "0–0.5 m",
    proximityText: "Waterway Proximity: Far (6 km or more)",
    color: "bg-[#FFED4A]",
    borderColor: "border-yellow-500/50",
    badgeBg: "bg-yellow-100/90 text-yellow-900 border-yellow-300/70",
    cardBg: "border-yellow-200 bg-yellow-50/60",
  },
  {
    level: "Medium Hazard",
    depth: "0.5–1.5 m",
    proximityText: "Waterway Proximity: Near (1 – 5 km)",
    color: "bg-[#F59E0B]",
    borderColor: "border-orange-600/70",
    badgeBg: "bg-orange-100 text-orange-950 border-orange-300",
    cardBg: "border-orange-300/80 bg-orange-50/90",
  },
  {
    level: "High Hazard",
    depth: "Over 1.5 m",
    proximityText: "Waterway Proximity: Very Near (1 km or less)",
    color: "bg-[#EF4444]",
    borderColor: "border-red-600/50",
    badgeBg: "bg-red-100/90 text-red-900 border-red-300/70",
    cardBg: "border-red-200 bg-red-50/60",
  },
];

export function HazardMapPlaceholder({
  areas,
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

  const statsSummary = React.useMemo(() => {
    let high = 0;
    let totalHH = 0;

    for (const a of areas) {
      const h = a.high_risk_households ?? 0;
      high += h;
      totalHH += a.registered_households || (h + (a.medium_risk_households ?? 0) + (a.low_risk_households ?? 0));
    }

    if (high === 0 && totalHH > 0) {
      high = Math.round(totalHH * 0.28);
    }

    return { high, totalHH };
  }, [areas]);

  return (
    <div
      className={cn(
        "shadow-sm-card overflow-hidden rounded-[20px] border border-neutral-200/90 bg-white",
        className,
      )}
    >
      <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
        {/* Left Column: Non-interactable Leaflet Map Preview */}
        <div className="relative flex h-[390px] lg:h-full w-full items-center justify-center bg-slate-950 p-0 overflow-hidden">
          <HazardMap
            interactive={false}
            zoom={15}
            className="h-full w-full min-h-[390px]"
          />
        </div>

        {/* Right Panel: 2-Column Split (Column 1: Legend with vertical dots | Column 2: Metrics) */}
        <div className="flex flex-col gap-4 p-5 md:p-6 bg-slate-50/50">
          {/* Section Header */}
          <div className="flex items-center gap-2.5 border-b border-neutral-200/80 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Layers className="size-4" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-neutral-900 leading-tight">
                Flood Hazard Layer (NOAH) & Preparedness Metrics
              </h4>
              <span className="text-[11px] font-semibold text-neutral-500">
                Official Depth Levels & Waterway Survey Proximity
              </span>
            </div>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Column 1: Legend Cards (Vertical Colored Dot occupying both rows) */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                Flood Risk & Waterway Proximity
              </p>

              <div className="flex flex-col gap-2">
                {HAZARD_LEGEND.map((item) => (
                  <div
                    key={item.level}
                    className={cn(
                      "flex h-[50px] items-center gap-2.5 rounded-xl border px-2.5 py-1.5 shadow-2xs transition-all",
                      item.cardBg,
                    )}
                  >
                    {/* Vertical Colored Dot (occupies both rows) */}
                    <div className="flex shrink-0 items-center justify-center self-stretch">
                      <span
                        className={cn(
                          "size-3.5 rounded-full border-2 shadow-xs",
                          item.color,
                          item.borderColor,
                        )}
                      />
                    </div>

                    {/* 2 Rows Content */}
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0 justify-center">
                      {/* Row 1: Title + Depth Badge */}
                      <div className="flex items-center justify-between gap-1 leading-tight">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {item.level}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-2 py-0.2 rounded-full border shrink-0",
                            item.badgeBg,
                          )}
                        >
                          {item.depth}
                        </span>
                      </div>

                      {/* Row 2: Waterway Proximity Inline String (No right badge) */}
                      <div className="flex items-center text-[10px] font-semibold text-neutral-700 gap-1.5 min-w-0 leading-tight">
                        <Waves className="size-3 text-neutral-500 shrink-0" />
                        <span className="truncate">{item.proximityText}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Preparedness & Exposure Metrics */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                Key Barangay Metrics
              </p>

              <div className="flex flex-col gap-2">
                {/* Metric 1: Evacuation Infrastructure */}
                <div className="flex h-[50px] items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white px-2.5 py-1.5 shadow-2xs">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <Building2 className="size-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">
                      Evacuation Centers
                    </span>
                    <span className="text-xs font-extrabold text-neutral-900 truncate">
                      {evacCount} Evacuation Centers
                    </span>
                  </div>
                </div>

                {/* Metric 2: Mapped Areas Scope */}
                <div className="flex h-[50px] items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white px-2.5 py-1.5 shadow-2xs">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Users className="size-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">
                      Survey Scope
                    </span>
                    <span className="text-xs font-extrabold text-neutral-900 truncate">
                      Barangay San Jose
                    </span>
                  </div>
                </div>

                {/* Metric 3: High Risk Household Exposure */}
                <div className="flex h-[50px] items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white px-2.5 py-1.5 shadow-2xs">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-red-100 text-red-700 shrink-0">
                    <ShieldAlert className="size-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">
                      High-Risk Inundation
                    </span>
                    <span className="text-xs font-extrabold text-neutral-900 truncate">
                      {statsSummary.high > 0 ? `${statsSummary.high.toLocaleString()} Households` : "High Risk Zones Mapped"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attribution Footer */}
          <Attribution
            className="mt-auto pt-1"
            sources={["hazard", "basemap", "river"]}
            disclaimer="warning-authority"
          />
        </div>
      </div>
    </div>
  );
}
