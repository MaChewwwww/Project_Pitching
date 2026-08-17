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
  Cell,
} from "recharts";
import { Activity, BarChart3, Building2, Users } from "lucide-react";

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

  const metricEvents = React.useMemo(
    () => ({
      peak: events.filter((event) => event.peak_level_m != null),
      displaced: events.filter((event) => event.households_displaced != null),
    }),
    [events],
  );

  // Historical fields are deliberately nullable when a source does not report them.
  // Keep unknown measurements out of both the totals and the chart.
  const metrics = React.useMemo(() => {
    if (!events.length) return null;

    const maxPeakEvent = metricEvents.peak.reduce<PublicFloodEvent | null>(
      (highest, event) =>
        highest == null || (event.peak_level_m ?? 0) > (highest.peak_level_m ?? 0)
          ? event
          : highest,
      null,
    );
    const totalDisplaced = metricEvents.displaced.length
      ? metricEvents.displaced.reduce(
          (total, event) => total + (event.households_displaced ?? 0),
          0,
        )
      : null;
    const areaCounts: Record<string, number> = {};

    events.forEach((ev) => {
      ev.area_names.forEach((area) => {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
    });

    // Area links mean that coverage was recorded, not that an area was the most affected.
    let topArea: string | null = null;
    let topAreaCount = 0;
    Object.entries(areaCounts).forEach(([area, count]) => {
      if (count > topAreaCount) {
        topAreaCount = count;
        topArea = area;
      }
    });

    return {
      maxPeak: maxPeakEvent?.peak_level_m ?? null,
      maxPeakEvent,
      totalDisplaced,
      totalEvents: events.length,
      topArea,
    };
  }, [events, metricEvents]);

  const chartTab =
    activeTab === "peak" && !metricEvents.peak.length && metricEvents.displaced.length
      ? "displaced"
      : activeTab === "displaced" &&
          !metricEvents.displaced.length &&
          metricEvents.peak.length
        ? "peak"
        : activeTab;
  const visibleEvents = chartTab === "peak" ? metricEvents.peak : metricEvents.displaced;

  // Unknown values are omitted before Recharts sees the dataset; it must never
  // turn a missing historical measure into a zero-height bar.
  const chartData = React.useMemo(() => {
    return [...visibleEvents].reverse().map((ev) => {
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
        peak: ev.peak_level_m,
        displaced: ev.households_displaced,
        areasCount: ev.area_names.length,
        isOngoing: ev.is_ongoing || !ev.ended_at,
        fullEvent: ev,
      };
    });
  }, [visibleEvents]);

  if (!events.length || !metrics) {
    return null;
  }

  return (
    <div className="mb-8 flex flex-col gap-6">
      {/* Top Key Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        {/* Metric 1: Record Peak Level */}
        <Card
          radius="lg"
          className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40"
        >
          <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-overline font-semibold text-neutral-500">
                Record Peak Level
              </span>
              <div className="rounded-md bg-amber-100/80 p-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Activity className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular flex items-baseline gap-1 font-bold text-neutral-900 dark:text-white">
                {metrics.maxPeak != null ? `${metrics.maxPeak}` : "—"}
                {metrics.maxPeak != null ? (
                  <span className="text-body-sm font-normal text-neutral-500">m</span>
                ) : null}
              </div>
              <p className="text-caption mt-0.5 truncate text-neutral-500">
                {metrics.maxPeakEvent
                  ? (metrics.maxPeakEvent as PublicFloodEvent).name
                  : "No peak recorded"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Displaced */}
        <Card
          radius="lg"
          className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40"
        >
          <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-overline font-semibold text-neutral-500">
                Total Displaced
              </span>
              <div className="rounded-md bg-sky-100/80 p-1.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                <Users className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular font-bold text-neutral-900 dark:text-white">
                {metrics.totalDisplaced != null
                  ? formatNumber(metrics.totalDisplaced)
                  : "—"}
              </div>
              <p className="text-caption mt-0.5 text-neutral-500">
                {metrics.totalDisplaced != null
                  ? "Recorded figures only"
                  : "No count recorded"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Recorded Events */}
        <Card
          radius="lg"
          className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40"
        >
          <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-overline font-semibold text-neutral-500">
                Recorded Events
              </span>
              <div className="rounded-md bg-emerald-100/80 p-1.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <BarChart3 className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h2 tabular font-bold text-neutral-900 dark:text-white">
                {metrics.totalEvents}
              </div>
              <p className="text-caption mt-0.5 text-neutral-500">
                Historical and exercise records
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Most Affected Area */}
        <Card
          radius="lg"
          className="border-neutral-200/80 bg-neutral-50/50 dark:bg-neutral-900/40"
        >
          <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-overline font-semibold text-neutral-500">
                Most Mapped Area
              </span>
              <div className="rounded-md bg-orange-100/80 p-1.5 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                <Building2 className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-h3 truncate font-bold text-neutral-900 dark:text-white">
                {metrics.topArea ?? "—"}
              </div>
              <p className="text-caption mt-0.5 text-neutral-500">
                Recorded coverage only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Visualizer Card */}
      <Card
        radius="xl"
        className="overflow-hidden border-neutral-200/90 shadow-sm dark:border-neutral-800"
      >
        <div className="flex flex-col gap-4 border-b border-neutral-200/80 bg-neutral-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div>
            <h3 className="text-h3 text-neutral-900 dark:text-white">
              Recorded Flood Comparison
            </h3>
            <p className="text-caption mt-1 text-neutral-500">
              Only source-recorded peak and displacement values are charted; unavailable
              measures remain in the event log.
            </p>
          </div>

          {/* Visualization Toggle Buttons */}
          <div className="inline-flex shrink-0 items-center self-start rounded-lg bg-neutral-200/70 p-1 sm:self-auto dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("peak")}
              disabled={!metricEvents.peak.length}
              aria-pressed={chartTab === "peak"}
              className={cn(
                "text-caption rounded-md px-3 py-1.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                chartTab === "peak"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400",
              )}
            >
              Recorded Peak (m)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("displaced")}
              disabled={!metricEvents.displaced.length}
              aria-pressed={chartTab === "displaced"}
              className={cn(
                "text-caption rounded-md px-3 py-1.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                chartTab === "displaced"
                  ? "bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400",
              )}
            >
              Recorded Displacement
            </button>
          </div>
        </div>

        {/* Chart Rendering Area */}
        <CardContent className="p-4 pt-6 sm:p-6">
          {chartData.length ? (
            <div className="h-[280px] w-full sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                  onClick={(state) => {
                    const chartState = state as {
                      activePayload?: { payload: { id?: string } }[];
                    } | null;
                    const payload = chartState?.activePayload?.[0]?.payload;
                    if (payload?.id) {
                      setSelectedEventId(payload.id);
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
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
                    unit={chartTab === "peak" ? "m" : ""}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const ev: PublicFloodEvent = data.fullEvent;

                        return (
                          <div className="min-w-[200px] rounded-lg border border-neutral-200 bg-white p-3 shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-neutral-100 pb-1.5 dark:border-neutral-800">
                              <span className="text-body-sm font-semibold text-neutral-900 dark:text-white">
                                {ev.name}
                              </span>
                              {ev.is_ongoing ? (
                                <Badge tone="danger">Ongoing</Badge>
                              ) : null}
                            </div>
                            <div className="text-caption flex flex-col gap-1">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Date:</span>
                                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                  {formatPhtDate(ev.started_at)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Peak Level:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {ev.peak_level_m != null
                                    ? `${ev.peak_level_m} m`
                                    : "Not recorded"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Displaced:</span>
                                <span className="font-bold text-neutral-900 dark:text-white">
                                  {ev.households_displaced != null
                                    ? `${formatNumber(ev.households_displaced)} Households`
                                    : "—"}
                                </span>
                              </div>
                              {ev.area_names.length > 0 ? (
                                <div className="mt-1 border-t border-neutral-100 pt-1 text-neutral-500 dark:border-neutral-800">
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

                  <Bar
                    dataKey={chartTab === "peak" ? "peak" : "displaced"}
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  >
                    {chartData.map((entry) => {
                      const isSelected = selectedEventId === entry.id;
                      const fill = chartTab === "peak" ? "#3B82F6" : "#6366F1";

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
          ) : (
            <div className="text-body-sm flex h-[280px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center text-neutral-600 sm:h-[320px] dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
              No sourced {chartTab === "peak" ? "peak-level" : "displacement"} values are
              available for these records.
            </div>
          )}

          <div className="text-caption mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-neutral-500 dark:border-neutral-800">
            <span>
              Only recorded values are charted; no severity thresholds are implied.
            </span>
            <span>Click any bar to highlight event details</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
