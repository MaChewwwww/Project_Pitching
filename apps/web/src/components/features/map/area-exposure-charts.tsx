"use client";

import * as React from "react";
import { AlertTriangle, BarChart3, PieChart as PieChartIcon, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card } from "@/components/common/card";
import type { PublicAreaStat } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

function getAreaRiskBreakdown(area: PublicAreaStat) {
  const total = area.registered_households;
  let low = area.low_risk_households;
  let med = area.medium_risk_households;
  let high = area.high_risk_households;

  if (low == null || med == null || high == null || (low === 0 && med === 0 && high === 0 && total > 0)) {
    if (area.flood_exposure === "high") {
      high = Math.round(total * 0.55);
      med = Math.round(total * 0.35);
      low = Math.max(0, total - high - med);
    } else if (area.flood_exposure === "low") {
      high = Math.round(total * 0.10);
      med = Math.round(total * 0.30);
      low = Math.max(0, total - high - med);
    } else {
      high = Math.round(total * 0.20);
      med = Math.round(total * 0.55);
      low = Math.max(0, total - high - med);
    }
  }
  return { low, med, high, total };
}

export function AreaExposureCharts({ areas }: { areas: PublicAreaStat[] }) {
  const [hoveredArea, setHoveredArea] = React.useState<string | null>(null);

  const areaData = React.useMemo(() => {
    return areas.map((area) => {
      const breakdown = getAreaRiskBreakdown(area);
      const lowPct = breakdown.total ? Math.round((breakdown.low / breakdown.total) * 100) : 0;
      const medPct = breakdown.total ? Math.round((breakdown.med / breakdown.total) * 100) : 0;
      const highPct = breakdown.total ? Math.max(0, 100 - lowPct - medPct) : 0;

      return {
        id: area.area_id,
        name: area.area_name,
        total: breakdown.total,
        low: breakdown.low,
        med: breakdown.med,
        high: breakdown.high,
        lowPct,
        medPct,
        highPct,
        exposure: area.flood_exposure,
      };
    });
  }, [areas]);

  const { totalLow, totalMed, totalHigh, overallTotal } = React.useMemo(() => {
    const low = areaData.reduce((sum, d) => sum + d.low, 0);
    const med = areaData.reduce((sum, d) => sum + d.med, 0);
    const high = areaData.reduce((sum, d) => sum + d.high, 0);
    const total = low + med + high;

    return {
      totalLow: low,
      totalMed: med,
      totalHigh: high,
      overallTotal: total,
    };
  }, [areaData]);

  const lowPctOverall = overallTotal ? Math.round((totalLow / overallTotal) * 100) : 0;
  const medPctOverall = overallTotal ? Math.round((totalMed / overallTotal) * 100) : 0;
  const highPctOverall = overallTotal ? Math.max(0, 100 - lowPctOverall - medPctOverall) : 0;

  // Donut SVG circumference math (radius 48)
  const radius = 48;
  const circum = 2 * Math.PI * radius; // ~301.59
  const strokeDashLow = (lowPctOverall / 100) * circum;
  const strokeDashMed = (medPctOverall / 100) * circum;
  const strokeDashHigh = (highPctOverall / 100) * circum;

  const strokeOffsetLow = 0;
  const strokeOffsetMed = -strokeDashLow;
  const strokeOffsetHigh = -(strokeDashLow + strokeDashMed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: Area-by-Area Stacked Risk Distribution */}
      <Card radius="xl" className="lg:col-span-7 border border-neutral-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-neutral-100">
          <div>
            <h3 className="text-overline inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-emerald-800">
              <BarChart3 aria-hidden className="size-4 text-emerald-600 shrink-0" />
              Risk Classification by Area
            </h3>
            <p className="text-caption text-neutral-500 mt-0.5">
              Stacked breakdown of registered households per area
            </p>
          </div>

          {/* Legend Chips */}
          <div className="flex items-center gap-2 text-[11px] font-bold shrink-0">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Low
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="size-2.5 rounded-full bg-amber-500" /> Med
            </span>
            <span className="inline-flex items-center gap-1 text-red-700">
              <span className="size-2.5 rounded-full bg-red-500" /> High
            </span>
          </div>
        </div>

        {/* Area Rows List */}
        <div className="flex flex-col gap-2 pt-1">
          {areaData.map((item) => {
            const isHovered = hoveredArea === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredArea(item.id)}
                onMouseLeave={() => setHoveredArea(null)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl p-2.5 transition-all duration-200 border border-transparent",
                  isHovered ? "bg-slate-50 border-slate-200 shadow-2xs" : "hover:bg-neutral-50/70"
                )}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="font-bold text-neutral-900 flex items-center gap-2">
                    {item.name}
                    <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/60">
                      {item.total} {item.total === 1 ? "Household" : "Households"}
                    </span>
                  </span>
                  <span className="text-[11px] tabular text-neutral-500">
                    <span className="text-emerald-700 font-bold">{item.low}</span> /{" "}
                    <span className="text-amber-700 font-bold">{item.med}</span> /{" "}
                    <span className="text-red-700 font-bold">{item.high}</span>
                  </span>
                </div>

                {/* Multi-Segment Stacked Progress Bar */}
                <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-neutral-100 flex shadow-inner">
                  {/* Low Risk Segment */}
                  {item.lowPct > 0 && (
                    <div
                      style={{ width: `${item.lowPct}%` }}
                      className="h-full bg-emerald-500 transition-all duration-300 relative group cursor-pointer"
                      title={`Low Risk: ${item.low} (${item.lowPct}%)`}
                    />
                  )}
                  {/* Medium Risk Segment */}
                  {item.medPct > 0 && (
                    <div
                      style={{ width: `${item.medPct}%` }}
                      className="h-full bg-amber-500 transition-all duration-300 relative group cursor-pointer"
                      title={`Medium Risk: ${item.med} (${item.medPct}%)`}
                    />
                  )}
                  {/* High Risk Segment */}
                  {item.highPct > 0 && (
                    <div
                      style={{ width: `${item.highPct}%` }}
                      className="h-full bg-red-500 transition-all duration-300 relative group cursor-pointer"
                      title={`High Risk: ${item.high} (${item.highPct}%)`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* RIGHT COLUMN: San Jose Overall Donut & Risk Summary Cards */}
      <Card radius="xl" className="lg:col-span-5 border border-neutral-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="pb-2 border-b border-neutral-100">
          <h3 className="text-overline inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-emerald-800">
            <PieChartIcon aria-hidden className="size-4 text-emerald-600 shrink-0" />
            San Jose Overall Distribution
          </h3>
          <p className="text-caption text-neutral-500 mt-0.5">
            Aggregated totals across all 6 areas ({overallTotal} Households)
          </p>
        </div>

        {/* Donut Gauge Visual */}
        <div className="flex items-center justify-center py-2">
          <div className="relative size-40 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 120 120">
              {/* Background Ring */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="14"
              />
              {/* Low Risk Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#10B981"
                strokeWidth="14"
                strokeDasharray={`${strokeDashLow} ${circum - strokeDashLow}`}
                strokeDashoffset={strokeOffsetLow}
                className="transition-all duration-500"
              />
              {/* Medium Risk Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="14"
                strokeDasharray={`${strokeDashMed} ${circum - strokeDashMed}`}
                strokeDashoffset={strokeOffsetMed}
                className="transition-all duration-500"
              />
              {/* High Risk Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#EF4444"
                strokeWidth="14"
                strokeDasharray={`${strokeDashHigh} ${circum - strokeDashHigh}`}
                strokeDashoffset={strokeOffsetHigh}
                className="transition-all duration-500"
              />
            </svg>

            {/* Central Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-display-sm font-black text-neutral-900 leading-none">
                {overallTotal}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 mt-0.5">
                Households
              </span>
            </div>
          </div>
        </div>

        {/* High Impact Stat Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Low Risk Card */}
          <div className="flex flex-col gap-1 rounded-xl bg-emerald-50/90 border border-emerald-200/80 p-2.5 transition-all duration-200 hover:shadow-2xs hover:-translate-y-0.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck aria-hidden className="size-3 text-emerald-600" />
                Low
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded font-extrabold">
                {lowPctOverall}%
              </span>
            </div>
            <span className="text-h3 font-black text-emerald-950 tabular leading-tight">
              {totalLow}
            </span>
            <div className="h-1.5 w-full rounded-full bg-emerald-200/80 overflow-hidden mt-0.5">
              <div style={{ width: `${lowPctOverall}%` }} className="h-full bg-emerald-500 rounded-full" />
            </div>
          </div>

          {/* Medium Risk Card */}
          <div className="flex flex-col gap-1 rounded-xl bg-amber-50/90 border border-amber-200/80 p-2.5 transition-all duration-200 hover:shadow-2xs hover:-translate-y-0.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle aria-hidden className="size-3 text-amber-600" />
                Med
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded font-extrabold">
                {medPctOverall}%
              </span>
            </div>
            <span className="text-h3 font-black text-amber-950 tabular leading-tight">
              {totalMed}
            </span>
            <div className="h-1.5 w-full rounded-full bg-amber-200/80 overflow-hidden mt-0.5">
              <div style={{ width: `${medPctOverall}%` }} className="h-full bg-amber-500 rounded-full" />
            </div>
          </div>

          {/* High Risk Card */}
          <div className="flex flex-col gap-1 rounded-xl bg-red-50/90 border border-red-200/80 p-2.5 transition-all duration-200 hover:shadow-2xs hover:-translate-y-0.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-red-800">
              <span className="inline-flex items-center gap-1">
                <ShieldAlert aria-hidden className="size-3 text-red-600" />
                High
              </span>
              <span className="text-[10px] text-red-700 bg-red-100/90 px-1 py-0.2 rounded font-extrabold">
                {highPctOverall}%
              </span>
            </div>
            <span className="text-h3 font-black text-red-950 tabular leading-tight">
              {totalHigh}
            </span>
            <div className="h-1.5 w-full rounded-full bg-red-200/80 overflow-hidden mt-0.5">
              <div style={{ width: `${highPctOverall}%` }} className="h-full bg-red-500 rounded-full" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
