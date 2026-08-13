"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Building2,
  Clock3,
  ExternalLink,
  Gauge,
  Layers3,
  MapPin,
  Users,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import type { FloodEventRecord } from "@/components/features/admin/flood-event-editor";
import { formatNumber, formatPhtDate } from "@/lib/format";

const PEAK_THRESHOLDS = {
  extreme: { label: "Extreme", color: "#DC2626", min: 21 },
  severe: { label: "Severe", color: "#D97706", min: 18 },
  watch: { label: "Moderate", color: "#0F766E", min: 0 },
} as const;

const DISPLACEMENT_COLORS = ["#0F766E", "#2563EB", "#7C3AED", "#C2410C"];
const AREA_COLORS = ["#007C5A", "#0E7490", "#4F46E5", "#C2410C", "#BE123C", "#7C3AED"];

type EventMetric = {
  id: string;
  name: string;
  shortName: string;
  value: number;
  date: string;
  color: string;
  status?: string;
  share?: number;
};

function shortName(name: string) {
  return name.length > 17 ? `${name.slice(0, 15)}…` : name;
}

function formatMeters(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(value);
}

function peakBand(value: number) {
  if (value >= PEAK_THRESHOLDS.extreme.min) return PEAK_THRESHOLDS.extreme;
  if (value >= PEAK_THRESHOLDS.severe.min) return PEAK_THRESHOLDS.severe;
  return PEAK_THRESHOLDS.watch;
}

function EmptyChart({ description }: { description: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-5 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-neutral-300 shadow-2xs">
        <BarChart3 aria-hidden className="size-5" />
      </span>
      <p className="mt-3 max-w-xs text-xs leading-relaxed text-neutral-500">
        {description}
      </p>
    </div>
  );
}

export function FloodHistoryInsights({
  events,
  isLoading,
  summaryOnly = false,
  hideSummary = false,
}: {
  events: FloodEventRecord[];
  isLoading: boolean;
  summaryOnly?: boolean;
  hideSummary?: boolean;
}) {
  const insights = React.useMemo(() => {
    const chronologicalEvents = [...events].sort(
      (left, right) =>
        new Date(left.started_at).getTime() - new Date(right.started_at).getTime(),
    );
    const peaks: EventMetric[] = chronologicalEvents
      .filter((event) => event.peak_level_m != null)
      .map((event) => {
        const value = event.peak_level_m!;
        const band = peakBand(value);
        return {
          id: event.id,
          name: event.name,
          shortName: shortName(event.name),
          value,
          date: formatPhtDate(event.started_at),
          color: band.color,
          status: band.label,
        };
      });

    const displaced: EventMetric[] = chronologicalEvents
      .filter((event) => event.households_displaced != null)
      .map((event) => ({
        id: event.id,
        name: event.name,
        shortName: shortName(event.name),
        value: event.households_displaced!,
        date: formatPhtDate(event.started_at),
        color: "#0F766E",
      }));

    const maxDisplaced = Math.max(...displaced.map((event) => event.value), 0);
    displaced.forEach((event) => {
      const ratio = maxDisplaced ? event.value / maxDisplaced : 0;
      const colorIndex = ratio >= 0.8 ? 3 : ratio >= 0.55 ? 2 : ratio >= 0.3 ? 1 : 0;
      event.color = DISPLACEMENT_COLORS[colorIndex];
      event.share = maxDisplaced ? event.value / maxDisplaced : 0;
    });

    const areas = new Map<string, number>();
    for (const event of events) {
      for (const area of event.area_names) {
        areas.set(area, (areas.get(area) ?? 0) + 1);
      }
    }
    const areaReach = [...areas.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([name, value], index) => ({
        id: name,
        name,
        shortName: name,
        value,
        date: "",
        color: AREA_COLORS[index % AREA_COLORS.length],
      }));

    const recordPeak = peaks.reduce<(typeof peaks)[number] | null>(
      (highest, current) =>
        !highest || current.value > highest.value ? current : highest,
      null,
    );
    const topArea = [...areas.entries()].sort((left, right) => right[1] - left[1])[0];
    const totalDisplaced = displaced.length
      ? displaced.reduce((sum, event) => sum + event.value, 0)
      : null;

    return {
      peaks,
      displaced,
      areaReach,
      recordPeak,
      totalDisplaced,
      topArea,
      areaCount: areas.size,
      ongoingCount: events.filter((event) => event.is_ongoing || !event.ended_at).length,
    };
  }, [events]);

  if (isLoading) {
    return (
      <aside
        aria-label="Loading history insights"
        className={
          summaryOnly ? "space-y-4" : "space-y-4 lg:sticky lg:top-5 lg:self-start"
        }
      >
        {!hideSummary ? (
          <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white p-4 shadow-2xs sm:p-5">
            <div className="flex animate-pulse items-center gap-3">
              <div className="size-10 rounded-xl bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-neutral-200" />
                <div className="h-2.5 w-56 max-w-full rounded bg-neutral-100" />
              </div>
            </div>
            <div className="mt-4 h-32 animate-pulse rounded-2xl bg-neutral-100" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl bg-neutral-100"
                />
              ))}
            </div>
          </div>
        ) : null}
        {!summaryOnly
          ? [0, 1, 2].map((item) => (
              <Card key={item} className="min-h-72 animate-pulse bg-neutral-50">
                <CardContent>
                  <div className="h-4 w-36 rounded bg-neutral-200" />
                  <div className="mt-5 h-52 rounded-2xl bg-neutral-100" />
                </CardContent>
              </Card>
            ))
          : null}
      </aside>
    );
  }

  return (
    <aside
      className={summaryOnly ? "space-y-4" : "space-y-4 lg:sticky lg:top-5 lg:self-start"}
      aria-label="Flood history insights"
    >
      {!hideSummary ? (
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_40%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfeff_100%)] p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-700/20">
                <Gauge aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="mt-1 text-base font-bold tracking-tight text-neutral-950">
                  History at a glance
                </h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
                  A comparison of recorded impact, not a live flood forecast.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-9 shrink-0 self-start rounded-full border-emerald-200 bg-white/80 px-3 text-emerald-800 shadow-2xs hover:bg-emerald-50"
            >
              <Link href="/admin/weather-readings">
                <Waves aria-hidden className="size-3.5" />
                <span>Weather Watch</span>
                <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricTile
              label="Events in view"
              value={formatNumber(events.length)}
              detail={
                insights.ongoingCount
                  ? `${insights.ongoingCount} ongoing now`
                  : "Historical records"
              }
              icon={BarChart3}
              tone="emerald"
            />
            <MetricTile
              label="Record peak"
              value={
                insights.recordPeak ? `${formatMeters(insights.recordPeak.value)} m` : "—"
              }
              detail={
                insights.recordPeak
                  ? `${insights.recordPeak.name} · ${insights.recordPeak.date}`
                  : "No peak level recorded"
              }
              icon={Gauge}
              tone="amber"
            />
            <MetricTile
              label="Households displaced"
              value={
                insights.totalDisplaced == null
                  ? "—"
                  : formatNumber(insights.totalDisplaced)
              }
              detail={
                insights.displaced.length
                  ? `${insights.displaced.length} records with counts`
                  : "No counts recorded"
              }
              icon={Users}
              tone="sky"
            />
            <MetricTile
              label="Most affected"
              value={insights.topArea?.[0] ?? "—"}
              detail={
                insights.topArea
                  ? `${insights.topArea[1]} event${insights.topArea[1] === 1 ? "" : "s"} · ${insights.areaCount} areas`
                  : "No areas recorded"
              }
              icon={Building2}
              tone="violet"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-neutral-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-2.5 py-1.5 shadow-2xs">
              <Layers3 aria-hidden className="size-3.5 text-emerald-600" />
              {insights.areaCount} area{insights.areaCount === 1 ? "" : "s"} referenced
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-2.5 py-1.5 shadow-2xs">
              <Clock3 aria-hidden className="size-3.5 text-indigo-600" />
              {insights.ongoingCount
                ? `${insights.ongoingCount} ongoing`
                : "No ongoing events"}
            </span>
          </div>
        </section>
      ) : null}

      {!summaryOnly ? (
        <ChartCard
          title="Peak water level"
          eyebrow="Crest comparison"
          description="How high the water rose in each event"
          unit="m"
          data={insights.peaks}
          empty="Record a peak level to compare flood-water crests over time. Events without a peak are left out."
          icon={Activity}
          summary={
            insights.recordPeak ? `${formatMeters(insights.recordPeak.value)} m` : "—"
          }
          summaryLabel={insights.recordPeak ? "highest" : "no peaks"}
          legend={
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              <LegendDot color={PEAK_THRESHOLDS.watch.color} label="Moderate · <18m" />
              <LegendDot color={PEAK_THRESHOLDS.severe.color} label="Severe · 18m+" />
              <LegendDot color={PEAK_THRESHOLDS.extreme.color} label="Extreme · 21m+" />
            </div>
          }
          referenceLines={[
            {
              value: PEAK_THRESHOLDS.severe.min,
              label: "18m",
              color: PEAK_THRESHOLDS.severe.color,
            },
            {
              value: PEAK_THRESHOLDS.extreme.min,
              label: "21m",
              color: PEAK_THRESHOLDS.extreme.color,
            },
          ]}
        />
      ) : null}

      {!summaryOnly ? (
        <ChartCard
          title="Displaced households"
          eyebrow="Community impact"
          description="Recorded household impact by event"
          data={insights.displaced}
          empty="Add displaced-household counts to compare historical impact. Events without a count are left out."
          icon={Users}
          summary={
            insights.totalDisplaced == null ? "—" : formatNumber(insights.totalDisplaced)
          }
          summaryLabel={
            insights.totalDisplaced == null ? "no counts" : "households total"
          }
          legend={
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              <LegendDot color={DISPLACEMENT_COLORS[0]} label="Lower impact" />
              <LegendDot color={DISPLACEMENT_COLORS[1]} label="Mid impact" />
              <LegendDot color={DISPLACEMENT_COLORS[3]} label="Highest impact" />
            </div>
          }
        />
      ) : null}

      {!summaryOnly ? (
        <AreaReachCard data={insights.areaReach} areaCount={insights.areaCount} />
      ) : null}
    </aside>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
  tone: "emerald" | "sky" | "amber" | "violet";
}) {
  const toneStyles = {
    emerald: "border-emerald-100 bg-white/90 text-emerald-700",
    sky: "border-sky-100 bg-white/80 text-sky-700",
    amber: "border-amber-100 bg-white/80 text-amber-700",
    violet: "border-violet-100 bg-white/80 text-violet-700",
  } as const;

  return (
    <div className={`min-w-0 rounded-2xl border p-3.5 shadow-2xs ${toneStyles[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">
          {label}
        </span>
        <Icon aria-hidden className="size-3.5 shrink-0" />
      </div>
      <p className="mt-2 truncate text-xl font-bold tracking-tight text-neutral-950 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-neutral-500">{detail}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ChartCard({
  title,
  eyebrow,
  description,
  unit,
  data,
  empty,
  icon: Icon,
  summary,
  summaryLabel,
  legend,
  referenceLines,
}: {
  title: string;
  eyebrow: string;
  description: string;
  unit?: string;
  data: EventMetric[];
  empty: string;
  icon: typeof Gauge;
  summary: string;
  summaryLabel: string;
  legend: React.ReactNode;
  referenceLines?: Array<{ value: number; label: string; color: string }>;
}) {
  return (
    <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50/60 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-700 uppercase">
                {eyebrow}
              </p>
              <h2 className="mt-0.5 truncate text-sm font-bold text-neutral-950">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tracking-tight text-neutral-950 tabular-nums">
              {summary}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500">{summaryLabel}</p>
          </div>
        </div>

        <div className="px-3 py-4 sm:px-4">
          {data.length ? (
            <div
              className="h-64"
              role="img"
              aria-label={`${title}: ${data.map((item) => `${item.name}, ${formatMeters(item.value)}${unit ? ` ${unit}` : " households"}`).join("; ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid
                    stroke="#E5E7EB"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value) =>
                      unit ? `${value}m` : formatNumber(Number(value))
                    }
                  />
                  {referenceLines?.map((line) => (
                    <ReferenceLine
                      key={line.value}
                      y={line.value}
                      stroke={line.color}
                      strokeDasharray="4 4"
                      label={{
                        value: line.label,
                        fill: line.color,
                        fontSize: 9,
                        position: "insideTopRight",
                      }}
                    />
                  ))}
                  <Tooltip
                    cursor={{ fill: "#F0FDFA" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as EventMetric;
                      return (
                        <div
                          role="tooltip"
                          className="min-w-44 rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-xl"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-1 size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <p className="leading-snug font-bold text-neutral-950">
                              {item.name}
                            </p>
                          </div>
                          <p className="mt-2 text-base font-bold text-neutral-950 tabular-nums">
                            {unit
                              ? `${formatMeters(item.value)} ${unit}`
                              : `${formatNumber(item.value)} households`}
                          </p>
                          <p className="mt-0.5 text-[10px] text-neutral-500">
                            Started {item.date}
                          </p>
                          {!unit && item.share != null ? (
                            <p className="mt-1 text-[10px] font-semibold text-indigo-700">
                              {Math.round(item.share * 100)}% of the highest recorded
                              impact
                            </p>
                          ) : null}
                          {item.status ? (
                            <p
                              className="mt-1 text-[10px] font-semibold"
                              style={{ color: item.color }}
                            >
                              {item.status} crest band
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[7, 7, 2, 2]} maxBarSize={64}>
                    {data.map((item) => (
                      <Cell key={item.id} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart description={empty} />
          )}
        </div>
        <div className="border-t border-neutral-100 bg-neutral-50/50 px-4 py-3 sm:px-5">
          {legend}
        </div>
      </CardContent>
    </Card>
  );
}

function AreaReachCard({ data, areaCount }: { data: EventMetric[]; areaCount: number }) {
  return (
    <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50/60 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
              <MapPin aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.16em] text-violet-700 uppercase">
                Geographic reach
              </p>
              <h2 className="mt-0.5 truncate text-sm font-bold text-neutral-950">
                Areas affected
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Event mentions across the barangay
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tracking-tight text-neutral-950 tabular-nums">
              {areaCount}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500">areas in view</p>
          </div>
        </div>
        <div className="px-3 py-4 sm:px-4">
          {data.length ? (
            <div
              className="h-56"
              role="img"
              aria-label={`Areas affected: ${data.map((item) => `${item.name}, ${item.value} events`).join("; ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 4, right: 10, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="#E5E7EB"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={76}
                    tick={{ fontSize: 10, fill: "#4B5563" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#F5F3FF" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as EventMetric;
                      return (
                        <div
                          role="tooltip"
                          className="rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-xl"
                        >
                          <p className="font-bold text-neutral-950">{item.name}</p>
                          <p className="mt-1 text-neutral-600">
                            Recorded in <span className="font-bold">{item.value}</span>{" "}
                            event{item.value === 1 ? "" : "s"}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 7, 7, 0]} maxBarSize={24}>
                    {data.map((item) => (
                      <Cell key={item.id} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart description="Add affected areas to see which parts of the barangay recur in flood records." />
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-neutral-100 bg-violet-50/40 px-4 py-3 text-[10px] text-violet-800 sm:px-5">
          <Layers3 aria-hidden className="size-3.5 shrink-0" />
          <span>Counts represent event mentions, not a live risk rating.</span>
        </div>
      </CardContent>
    </Card>
  );
}
