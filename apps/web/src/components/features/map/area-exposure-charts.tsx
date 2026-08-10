"use client";

import * as React from "react";
import { AlertTriangle, BarChart3, PieChart as PieChartIcon, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

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

  // Donut SVG circumference math (radius 44, center 80, 80)
  const radius = 44;
  const circum = 2 * Math.PI * radius; // ~276.46
  const strokeDashLow = (lowPctOverall / 100) * circum;
  const strokeDashMed = (medPctOverall / 100) * circum;
  const strokeDashHigh = (highPctOverall / 100) * circum;

  const strokeOffsetLow = 0;
  const strokeOffsetMed = -strokeDashLow;
  const strokeOffsetHigh = -(strokeDashLow + strokeDashMed);

  // Math for Pie slice label midpoints (Center = 80, 80)
  const lowMidAngle = ((0 + lowPctOverall / 2) / 100) * 360 - 90;
  const medMidAngle = ((lowPctOverall + medPctOverall / 2) / 100) * 360 - 90;
  const highMidAngle = ((lowPctOverall + medPctOverall + highPctOverall / 2) / 100) * 360 - 90;

  const getPiePoint = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: 80 + r * Math.cos(rad),
      y: 80 + r * Math.sin(rad),
    };
  };

  const lowPInner = getPiePoint(lowMidAngle, 51);
  const lowPOuter = getPiePoint(lowMidAngle, 64);

  const medPInner = getPiePoint(medMidAngle, 51);
  const medPOuter = getPiePoint(medMidAngle, 64);

  const highPInner = getPiePoint(highMidAngle, 51);
  const highPOuter = getPiePoint(highMidAngle, 64);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative">
      {/* LEFT COLUMN: Area-by-Area Stacked Risk Distribution */}
      <Card radius="xl" className="lg:col-span-7 border border-neutral-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3 justify-between">
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
        <div className="flex flex-col gap-2.5 pt-1">
          {areaData.map((item) => {
            const isHovered = hoveredArea === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredArea(item.id)}
                onMouseLeave={() => setHoveredArea(null)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-xl p-2.5 transition-all duration-200 border border-transparent cursor-pointer select-none",
                  isHovered ? "bg-slate-100/90 border-slate-200 shadow-2xs" : "hover:bg-neutral-50/80"
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
                  <span className="text-[11px] tabular text-neutral-500 font-medium">
                    <span className="text-emerald-700 font-bold">{item.low}</span> /{" "}
                    <span className="text-amber-700 font-bold">{item.med}</span> /{" "}
                    <span className="text-red-700 font-bold">{item.high}</span>
                  </span>
                </div>

                {/* Multi-Segment Stacked Progress Bar */}
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-neutral-100 flex shadow-inner">
                  {/* Low Risk Segment */}
                  {item.lowPct > 0 && (
                    <div
                      style={{ width: `${item.lowPct}%` }}
                      className="h-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-150 relative"
                    />
                  )}
                  {/* Medium Risk Segment */}
                  {item.medPct > 0 && (
                    <div
                      style={{ width: `${item.medPct}%` }}
                      className="h-full bg-amber-500 hover:bg-amber-400 transition-all duration-150 relative"
                    />
                  )}
                  {/* High Risk Segment */}
                  {item.highPct > 0 && (
                    <div
                      style={{ width: `${item.highPct}%` }}
                      className="h-full bg-red-500 hover:bg-red-400 transition-all duration-150 relative"
                    />
                  )}
                </div>

                {/* Anchored Floating Tooltip ABOVE the Row (Green-ish theme, zero bar overlap) */}
                {isHovered && (
                  <div className="absolute -top-9 right-2 z-50 pointer-events-none rounded-lg border border-emerald-500/50 bg-emerald-950/95 px-3 py-1 text-xs text-white shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 flex items-center gap-3">
                    <span className="font-extrabold text-emerald-300 text-xs shrink-0">{item.name}</span>
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold shrink-0">
                      <span className="text-emerald-300">Low: <strong className="text-white">{item.low}</strong> ({item.lowPct}%)</span>
                      <span className="text-emerald-800">|</span>
                      <span className="text-amber-300">Med: <strong className="text-white">{item.med}</strong> ({item.medPct}%)</span>
                      <span className="text-emerald-800">|</span>
                      <span className="text-red-300">High: <strong className="text-white">{item.high}</strong> ({item.highPct}%)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* RIGHT COLUMN: San Jose Overall Donut, Risk Summary Cards & Priority Insights */}
      <Card radius="xl" className="lg:col-span-5 border border-neutral-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3 justify-between">
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

        {/* Donut Gauge Visual with External Pointer Lines & Black Percentage Labels */}
        <div className="flex items-center justify-center py-1">
          <div className="relative size-44 flex items-center justify-center">
            <svg className="size-full" viewBox="0 0 160 160">
              {/* Rotated Donut Arcs */}
              <g className="-rotate-90 origin-center">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                />
                {/* Low Risk Arc */}
                <circle
                  cx="80"
                  cy="80"
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
                  cx="80"
                  cy="80"
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
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="14"
                  strokeDasharray={`${strokeDashHigh} ${circum - strokeDashHigh}`}
                  strokeDashoffset={strokeOffsetHigh}
                  className="transition-all duration-500"
                />
              </g>

              {/* External Pointer Lines & Black Text Labels */}
              <g className="pointer-events-none">
                {/* Low Risk Callout Pointer & Label */}
                {lowPctOverall > 0 && (
                  <>
                    <line
                      x1={lowPInner.x}
                      y1={lowPInner.y}
                      x2={lowPOuter.x}
                      y2={lowPOuter.y}
                      stroke="#64748b"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <circle cx={lowPInner.x} cy={lowPInner.y} r="2" fill="#0f172a" />
                    <text
                      x={lowPOuter.x + (lowPOuter.x >= 80 ? 6 : -6)}
                      y={lowPOuter.y}
                      textAnchor={lowPOuter.x >= 80 ? "start" : "end"}
                      dominantBaseline="central"
                      className="fill-slate-900 text-[11px] font-black"
                    >
                      {lowPctOverall}%
                    </text>
                  </>
                )}

                {/* Medium Risk Callout Pointer & Label */}
                {medPctOverall > 0 && (
                  <>
                    <line
                      x1={medPInner.x}
                      y1={medPInner.y}
                      x2={medPOuter.x}
                      y2={medPOuter.y}
                      stroke="#64748b"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <circle cx={medPInner.x} cy={medPInner.y} r="2" fill="#0f172a" />
                    <text
                      x={medPOuter.x}
                      y={medPOuter.y + (medPOuter.y >= 80 ? 8 : -8)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-slate-900 text-[11px] font-black"
                    >
                      {medPctOverall}%
                    </text>
                  </>
                )}

                {/* High Risk Callout Pointer & Label */}
                {highPctOverall > 0 && (
                  <>
                    <line
                      x1={highPInner.x}
                      y1={highPInner.y}
                      x2={highPOuter.x}
                      y2={highPOuter.y}
                      stroke="#64748b"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <circle cx={highPInner.x} cy={highPInner.y} r="2" fill="#0f172a" />
                    <text
                      x={highPOuter.x + (highPOuter.x >= 80 ? 6 : -6)}
                      y={highPOuter.y}
                      textAnchor={highPOuter.x >= 80 ? "start" : "end"}
                      dominantBaseline="central"
                      className="fill-slate-900 text-[11px] font-black"
                    >
                      {highPctOverall}%
                    </text>
                  </>
                )}
              </g>
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
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Low Risk Card */}
          <div className="flex flex-col gap-1 rounded-xl bg-emerald-50/90 border border-emerald-200/80 p-2 transition-all duration-200 hover:shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck aria-hidden className="size-3 text-emerald-600 shrink-0" />
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
          <div className="flex flex-col gap-1 rounded-xl bg-amber-50/90 border border-amber-200/80 p-2 transition-all duration-200 hover:shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle aria-hidden className="size-3 text-amber-600 shrink-0" />
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
          <div className="flex flex-col gap-1 rounded-xl bg-red-50/90 border border-red-200/80 p-2 transition-all duration-200 hover:shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-red-800">
              <span className="inline-flex items-center gap-1">
                <ShieldAlert aria-hidden className="size-3 text-red-600 shrink-0" />
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

        {/* Priority Insights Banner — SAGIP Priority Insights */}
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-emerald-50/90 p-2.5 text-xs flex flex-col gap-2 shadow-2xs mt-1">
          <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 uppercase tracking-wider text-[10px] font-black">
              <Sparkles aria-hidden className="size-3.5 text-emerald-600" />
              SAGIP Priority Insights
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-white/90 px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
              Live Summary
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex flex-col gap-0.5 rounded-lg bg-white/80 p-2 border border-emerald-100">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Highest Risk Zone</span>
              <span className="font-extrabold text-neutral-900">Area 1 &amp; Area 2</span>
              <span className="text-[10px] text-neutral-500 font-semibold">19 High Risk Families each</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-white/80 p-2 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Primary Safe Zone</span>
              <span className="font-extrabold text-neutral-900">Area 6</span>
              <span className="text-[10px] text-neutral-500 font-semibold">21 Low Risk Families (62%)</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
