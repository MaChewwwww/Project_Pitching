"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Building2, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Badge } from "@/components/common/badge";
import type { PublicFloodEvent } from "@/lib/api/public-types";
import { formatNumber, formatPhtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FloodHistoryVisualizerProps {
  events: PublicFloodEvent[];
}

export function FloodHistoryVisualizer({ events }: FloodHistoryVisualizerProps) {
  const [activeTab, setActiveTab] = React.useState<"peak" | "displaced">("peak");
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  // Compute key summary metrics
  const metrics = React.useMemo(() => {
    if (!events.length) return null;

    let maxPeak = 0;
    let maxPeakEvent: PublicFloodEvent | null = null;
    let totalDisplaced = 0;
    const areaCounts: Record<string, number> = {};

    events.forEach((ev) => {
      if (ev.peak_level_m && ev.peak_level_m > maxPeak) {
        maxPeak = ev.peak_level_m;
        maxPeakEvent = ev;
      }
      if (ev.households_displaced) {
        totalDisplaced += ev.households_displaced;
      }
      ev.area_names.forEach((area) => {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
    });

    // Find most affected area
    let topArea = "N/A";
    let topAreaCount = 0;
    Object.entries(areaCounts).forEach(([area, count]) => {
      if (count > topAreaCount) {
        topAreaCount = count;
        topArea = area;
      }
    });

    return {
      maxPeak,
      maxPeakEvent,
      totalDisplaced,
      totalEvents: events.length,
      topArea,
    };
  }, [events]);

  // Format chart data (reverse chronological so oldest is left, newest is right, or vice versa)
  const chartData = React.useMemo(() => {
    return [...events]
      .reverse()
      .map((ev) => {
        const shortDate = new Date(ev.started_at).toLocaleDateString("en-PH", {
          month: "short",
          year: "numeric",
        });
        const shortName = ev.name.length > 18 ? ev.name.slice(0, 16) + "..." : ev.name;

        return {
          id: ev.id,
          name: ev.name,
          shortName,
          date: shortDate,
          peak: ev.peak_level_m ?? 0,
          displaced: ev.households_displaced ?? 0,
          areasCount: ev.area_names.length,
          isOngoing: ev.is_ongoing || !ev.ended_at,
          fullEvent: ev,
        };
      });
  }, [events]);

  if (!events.length || !metrics) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Top Key Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        {/* Metric 1: Record Peak Level */}
        <Card radius="lg" className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-overline text-neutral-500 font-semibold">Record Peak Level</span>
              <div className="p-1.5 rounded-md bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Activity className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular font-bold text-neutral-900 dark:text-white flex items-baseline gap-1">
                {metrics.maxPeak ? `${metrics.maxPeak}` : "—"}
                <span className="text-body-sm font-normal text-neutral-500">m</span>
              </div>
              <p className="text-caption text-neutral-500 truncate mt-0.5">
                {metrics.maxPeakEvent ? metrics.maxPeakEvent.name : "No peak recorded"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Displaced */}
        <Card radius="lg" className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-overline text-neutral-500 font-semibold">Total Displaced</span>
              <div className="p-1.5 rounded-md bg-sky-100/80 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                <Users className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular font-bold text-neutral-900 dark:text-white">
                {formatNumber(metrics.totalDisplaced)}
              </div>
              <p className="text-caption text-neutral-500 mt-0.5">Households across all events</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Recorded Events */}
        <Card radius="lg" className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-overline text-neutral-500 font-semibold">Recorded Events</span>
              <div className="p-1.5 rounded-md bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <BarChart3 className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular font-bold text-neutral-900 dark:text-white">
                {metrics.totalEvents}
              </div>
              <p className="text-caption text-neutral-500 mt-0.5">Historical & live records</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Most Affected Area */}
        <Card radius="lg" className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-overline text-neutral-500 font-semibold">Highest Risk Zone</span>
              <div className="p-1.5 rounded-md bg-orange-100/80 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                <Building2 className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h3 font-bold text-neutral-900 dark:text-white truncate">
                {metrics.topArea}
              </div>
              <p className="text-caption text-neutral-500 mt-0.5">Affected in all major floods</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Visualizer Card */}
      <Card radius="xl" className="overflow-hidden border-neutral-200/90 shadow-sm dark:border-neutral-800">
        <div className="border-b border-neutral-200/80 bg-neutral-50/60 p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h3 text-neutral-900 dark:text-white">Historical Flood Comparison</h3>
              <Badge tone="primary" outline>Interactive Chart</Badge>
            </div>
            <p className="text-caption text-neutral-500 mt-1">
              Comparing river peak crest height (meters) and household displacement across past events
            </p>
          </div>

          {/* Visualization Toggle Buttons */}
          <div className="inline-flex items-center rounded-lg bg-neutral-200/70 p-1 dark:bg-neutral-800 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("peak")}
              className={cn(
                "rounded-md px-3 py-1.5 text-caption font-semibold transition-all",
                activeTab === "peak"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              )}
            >
              Peak River Level (m)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("displaced")}
              className={cn(
                "rounded-md px-3 py-1.5 text-caption font-semibold transition-all",
                activeTab === "displaced"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              )}
            >
              Displaced Households
            </button>
          </div>
        </div>

        {/* Chart Rendering Area */}
        <CardContent className="p-4 sm:p-6 pt-6">
          <div className="h-[280px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setSelectedEventId(state.activePayload[0].payload.id);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="shortName"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  unit={activeTab === "peak" ? "m" : ""}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const ev: PublicFloodEvent = data.fullEvent;

                      return (
                        <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-md dark:border-neutral-800 dark:bg-neutral-900 min-w-[200px]">
                          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1.5 mb-2 dark:border-neutral-800">
                            <span className="font-semibold text-body-sm text-neutral-900 dark:text-white">
                              {ev.name}
                            </span>
                            {ev.is_ongoing ? (
                              <Badge tone="danger">Ongoing</Badge>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-1 text-caption">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Date:</span>
                              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                {formatPhtDate(ev.started_at)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Peak Level:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                {ev.peak_level_m != null ? `${ev.peak_level_m} m` : "Tracking..."}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Displaced:</span>
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {ev.households_displaced != null ? `${formatNumber(ev.households_displaced)} hh` : "—"}
                              </span>
                            </div>
                            {ev.area_names.length > 0 ? (
                              <div className="mt-1 pt-1 border-t border-neutral-100 text-neutral-500 dark:border-neutral-800">
                                Areas: {ev.area_names.join(", ")}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Optional Alert Threshold Reference Lines for River Levels */}
                {activeTab === "peak" ? (
                  <>
                    <ReferenceLine y={21.0} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Extreme (21.0m)", fill: "#EF4444", fontSize: 10, position: "top" }} />
                    <ReferenceLine y={18.0} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: "Severe (18.0m)", fill: "#F59E0B", fontSize: 10, position: "top" }} />
                  </>
                ) : null}

                <Bar
                  dataKey={activeTab === "peak" ? "peak" : "displaced"}
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                >
                  {chartData.map((entry) => {
                    const isSelected = selectedEventId === entry.id;
                    const fill =
                      activeTab === "peak"
                        ? entry.peak >= 21
                          ? "#EF4444"
                          : entry.peak >= 18
                          ? "#F59E0B"
                          : "#3B82F6"
                        : "#6366F1";

                    return (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={fill}
                        opacity={selectedEventId && !isSelected ? 0.4 : 1}
                        className="cursor-pointer transition-all hover:opacity-80"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-caption text-neutral-500 dark:border-neutral-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500" /> &ge;21m Peak (Extreme)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" /> &ge;18m Peak (Severe)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-blue-500" /> &lt;18m Peak (Moderate)
              </span>
            </div>
            <span>Click any bar to highlight event details</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
