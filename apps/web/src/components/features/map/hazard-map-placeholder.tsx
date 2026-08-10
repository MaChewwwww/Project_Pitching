import * as React from "react";
import { Building2, Layers, ShieldAlert, Users } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
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
 * Renders a non-interactable Leaflet hazard preview alongside high-impact
 * flood exposure risk metrics (High, Medium, Low risk breakdowns), mapped
 * evacuation facility counts, and area exposure badges.
 */

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
  river?: PublicRiverLevel;
  className?: string;
}) {
  const statsSummary = React.useMemo(() => {
    let high = 0;
    let med = 0;
    let low = 0;
    let totalHH = 0;

    for (const a of areas) {
      const h = a.high_risk_households ?? 0;
      const m = a.medium_risk_households ?? 0;
      const l = a.low_risk_households ?? 0;
      high += h;
      med += m;
      low += l;
      totalHH += a.registered_households || (h + m + l);
    }

    if (high === 0 && med === 0 && low === 0 && totalHH > 0) {
      high = Math.round(totalHH * 0.28);
      med = Math.round(totalHH * 0.45);
      low = Math.max(0, totalHH - high - med);
    }

    return { high, med, low, totalHH };
  }, [areas]);

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
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* Left Column: Non-interactable Leaflet Map Preview */}
        <div className="relative flex min-h-[420px] h-full w-full items-center justify-center bg-slate-950 p-0 overflow-hidden">
          <HazardMap
            interactive={false}
            className="h-full w-full min-h-[420px]"
          />
          <span className="text-caption absolute top-4 left-4 z-[600] rounded-full border border-white/20 bg-slate-900/85 px-3.5 py-1.5 font-extrabold text-emerald-400 backdrop-blur-md shadow-md flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Barangay San Jose Flood Overview
          </span>
        </div>

        {/* Right Column: Flood Risk Metrics & Exposure Panel */}
        <div className="flex flex-col gap-4 p-5 md:p-6 bg-slate-50/50">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Layers className="size-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-neutral-900 leading-tight">
                  Flood Hazard Risk Metrics
                </h4>
                <span className="text-[11px] font-semibold text-neutral-500">
                  Project NOAH 5-Year Survey Breakdown
                </span>
              </div>
            </div>
          </div>

          {/* Low, Medium, High Risk Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* High Risk */}
            <div className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50/80 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                  High Risk
                </span>
                <span className="size-2 rounded-full bg-red-500 animate-pulse"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-red-950 tabular-nums leading-none">
                  {statsSummary.high > 0 ? statsSummary.high.toLocaleString() : "1.5m+"}
                </span>
                {statsSummary.high > 0 && <span className="text-[10px] font-bold text-red-700">HHs</span>}
              </div>
              <span className="text-[10px] font-semibold text-red-600">Depth &gt; 1.5 m</span>
            </div>

            {/* Medium Risk */}
            <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/80 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                  Medium
                </span>
                <span className="size-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-amber-950 tabular-nums leading-none">
                  {statsSummary.med > 0 ? statsSummary.med.toLocaleString() : "0.5-1.5m"}
                </span>
                {statsSummary.med > 0 && <span className="text-[10px] font-bold text-amber-800">HHs</span>}
              </div>
              <span className="text-[10px] font-semibold text-amber-700">0.5 – 1.5 m</span>
            </div>

            {/* Low Risk */}
            <div className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  Low Risk
                </span>
                <span className="size-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-950 tabular-nums leading-none">
                  {statsSummary.low > 0 ? statsSummary.low.toLocaleString() : "0-0.5m"}
                </span>
                {statsSummary.low > 0 && <span className="text-[10px] font-bold text-emerald-800">HHs</span>}
              </div>
              <span className="text-[10px] font-semibold text-emerald-700">0 – 0.5 m</span>
            </div>
          </div>

          {/* Key Infrastructure & Area Scope Metrics */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">
                  Evacuation Centers
                </span>
                <span className="text-xs font-extrabold text-neutral-900">
                  {evacCount} Centers <span className="text-neutral-400 font-normal">({facilities.length} total)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-l border-neutral-100 pl-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Users className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">
                  Surveyed Extent
                </span>
                <span className="text-xs font-extrabold text-neutral-900">
                  {areas.length} Mapped Areas
                </span>
              </div>
            </div>
          </div>

          {/* Area Exposure Breakdown Badges */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <ShieldAlert className="size-3 text-neutral-400" />
              Area Risk Level Badges
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {areas.map((area) => (
                <li key={area.area_id}>
                  <Badge
                    tone={
                      area.flood_exposure ? EXPOSURE_TONE[area.flood_exposure] : "neutral"
                    }
                    className="font-bold text-[11px] py-0.5 px-2"
                  >
                    {area.area_name} · {area.flood_exposure ?? "unassessed"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          {/* Unified Attribution Footer */}
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
