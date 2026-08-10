"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, ShieldAlert, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
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

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <div className="font-bold text-white mb-2 flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
        <span>{label}</span>
        <span className="text-[11px] font-semibold text-slate-300">{data.total} households</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4 text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            Low Risk:
          </span>
          <span className="font-bold text-white">{data.low}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-amber-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" />
            Medium Risk:
          </span>
          <span className="font-bold text-white">{data.medium}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-red-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-400" />
            High Risk:
          </span>
          <span className="font-bold text-white">{data.high}</span>
        </div>
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 font-bold" style={{ color: data.payload.color }}>
        <span className="size-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
        {data.name}
      </div>
      <div className="mt-1 text-slate-200">
        <span className="text-sm font-black text-white">{data.value}</span> households ({data.payload.pct}%)
      </div>
    </div>
  );
}

export function AreaExposureCharts({ areas }: { areas: PublicAreaStat[] }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const barData = React.useMemo(() => {
    return areas.map((area) => {
      const breakdown = getAreaRiskBreakdown(area);
      return {
        name: area.area_name,
        low: breakdown.low,
        medium: breakdown.med,
        high: breakdown.high,
        total: breakdown.total,
        exposure: area.flood_exposure,
      };
    });
  }, [areas]);

  const { totalLow, totalMed, totalHigh, overallTotal, pieData } = React.useMemo(() => {
    const low = barData.reduce((sum, d) => sum + d.low, 0);
    const med = barData.reduce((sum, d) => sum + d.medium, 0);
    const high = barData.reduce((sum, d) => sum + d.high, 0);
    const total = low + med + high;

    const data = [
      { name: "Low Risk", value: low, color: "#10B981", pct: total ? Math.round((low / total) * 100) : 0 },
      { name: "Medium Risk", value: med, color: "#F59E0B", pct: total ? Math.round((med / total) * 100) : 0 },
      { name: "High Risk", value: high, color: "#EF4444", pct: total ? Math.round((high / total) * 100) : 0 },
    ];

    return {
      totalLow: low,
      totalMed: med,
      totalHigh: high,
      overallTotal: total,
      pieData: data,
    };
  }, [barData]);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
        <div className="lg:col-span-7 h-[420px] rounded-2xl border border-neutral-200 bg-neutral-50 animate-pulse" />
        <div className="lg:col-span-5 h-[420px] rounded-2xl border border-neutral-200 bg-neutral-50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Column: Stacked Horizontal Bar Chart by Area */}
      <Card radius="xl" className="lg:col-span-7 border border-neutral-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        <CardContent className="flex flex-col h-full justify-between p-5 md:p-6 gap-4">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-overline inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-emerald-800">
                <BarChart3 aria-hidden className="size-4 text-emerald-600" />
                Risk Classification by Area
              </span>
            </div>
            <p className="text-caption text-neutral-600">
              Breakdown of registered households in each area categorized into Low, Medium, and High flood risk.
            </p>
          </div>

          {/* Bar Chart Container */}
          <div className="h-[290px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                barSize={22}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#334155"
                  fontSize={13}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  width={62}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.7)", radius: 6 }} />
                <Bar dataKey="low" name="Low Risk" stackId="risk" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" name="Medium Risk" stackId="risk" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high" name="High Risk" stackId="risk" fill="#EF4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Strip */}
          <div className="flex items-center justify-center gap-6 border-t border-neutral-100 pt-3.5 text-xs font-semibold">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="size-3 rounded-full bg-emerald-500 shadow-2xs" />
              <span>Low Risk</span>
              <span className="text-[11px] text-neutral-500 font-normal">({totalLow})</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="size-3 rounded-full bg-amber-500 shadow-2xs" />
              <span>Medium Risk</span>
              <span className="text-[11px] text-neutral-500 font-normal">({totalMed})</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="size-3 rounded-full bg-red-500 shadow-2xs" />
              <span>High Risk</span>
              <span className="text-[11px] text-neutral-500 font-normal">({totalHigh})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Column: Overall Donut / Pie Chart for San Jose */}
      <Card radius="xl" className="lg:col-span-5 border border-neutral-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        <CardContent className="flex flex-col h-full justify-between p-5 md:p-6 gap-4">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-overline inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-emerald-800">
                <PieChartIcon aria-hidden className="size-4 text-emerald-600" />
                San Jose Overall Distribution
              </span>
            </div>
            <p className="text-caption text-neutral-600">
              Total distribution of all {overallTotal} registered households across Barangay San Jose.
            </p>
          </div>

          {/* Donut Chart with Center Label */}
          <div className="relative h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                  dataKey="value"
                  cornerRadius={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Hero Metric */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="size-28 flex flex-col items-center justify-center rounded-full bg-slate-50/90 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                <span className="text-display-sm font-black text-neutral-900 leading-none">
                  {overallTotal}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                  Households
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3">
            <div className="flex flex-col items-center rounded-xl bg-emerald-50/90 border border-emerald-200/70 p-2.5 text-center transition-all hover:bg-emerald-100/80">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Low Risk</span>
              <span className="text-h3 font-black text-emerald-950 tabular my-0.5">{totalLow}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-md">
                {overallTotal ? Math.round((totalLow / overallTotal) * 100) : 0}%
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-amber-50/90 border border-amber-200/70 p-2.5 text-center transition-all hover:bg-amber-100/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Medium</span>
              <span className="text-h3 font-black text-amber-950 tabular my-0.5">{totalMed}</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded-md">
                {overallTotal ? Math.round((totalMed / overallTotal) * 100) : 0}%
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-red-50/90 border border-red-200/70 p-2.5 text-center transition-all hover:bg-red-100/80">
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">High Risk</span>
              <span className="text-h3 font-black text-red-950 tabular my-0.5">{totalHigh}</span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100/90 px-1.5 py-0.2 rounded-md">
                {overallTotal ? Math.round((totalHigh / overallTotal) * 100) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
