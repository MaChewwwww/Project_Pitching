"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Building2, ExternalLink, Gauge, House, Waves } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import type { FloodEventRecord } from "@/components/features/admin/flood-event-editor";

function shortName(name: string) {
  return name.length > 16 ? `${name.slice(0, 14)}…` : name;
}

function EmptyChart({ description }: { description: string }) {
  return (
    <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-5 text-center">
      <BarChart3 aria-hidden className="size-5 text-neutral-300" />
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">{description}</p>
    </div>
  );
}

export function FloodHistoryInsights({
  events,
  isLoading,
}: {
  events: FloodEventRecord[];
  isLoading: boolean;
}) {
  const insights = React.useMemo(() => {
    const peaks = events
      .filter((event) => event.peak_level_m != null)
      .map((event) => ({
        id: event.id,
        name: event.name,
        shortName: shortName(event.name),
        value: event.peak_level_m!,
        date: new Date(event.started_at).getFullYear().toString(),
      }));
    const displaced = events
      .filter((event) => event.households_displaced != null)
      .map((event) => ({
        id: event.id,
        name: event.name,
        shortName: shortName(event.name),
        value: event.households_displaced!,
        date: new Date(event.started_at).getFullYear().toString(),
      }));
    const areas = new Map<string, number>();
    for (const event of events)
      for (const area of event.area_names) areas.set(area, (areas.get(area) ?? 0) + 1);
    const recordPeak = peaks.reduce<(typeof peaks)[number] | null>(
      (highest, current) =>
        !highest || current.value > highest.value ? current : highest,
      null,
    );
    const topArea = [...areas.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      peaks: [...peaks].reverse(),
      displaced: [...displaced].reverse(),
      recordPeak,
      totalDisplaced: displaced.reduce((sum, event) => sum + event.value, 0),
      topArea,
    };
  }, [events]);

  if (isLoading)
    return (
      <aside
        aria-label="Loading history insights"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
      >
        {[0, 1, 2].map((item) => (
          <Card key={item} className="min-h-36 animate-pulse bg-neutral-50">
            <CardContent>
              <div className="h-4 w-28 rounded bg-neutral-200" />
              <div className="mt-5 h-20 rounded-xl bg-neutral-100" />
            </CardContent>
          </Card>
        ))}
      </aside>
    );

  return (
    <aside
      className="space-y-4 lg:sticky lg:top-5 lg:self-start"
      aria-label="Flood history insights"
    >
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-700/20">
              <Gauge aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-neutral-900">History at a glance</h2>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                A comparison of recorded impact, not a live flood forecast.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 shrink-0 rounded-full border-emerald-200 bg-white px-3 text-emerald-800 hover:bg-emerald-50"
          >
            <Link href="/admin/weather-readings">
              <Waves aria-hidden className="size-3.5" />
              <span>Weather Watch</span>
              <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat
            label="Events in view"
            value={events.length.toLocaleString("en-PH")}
            detail="Historical records"
            icon={BarChart3}
            emphasis
          />
          <Stat
            label="Record peak"
            value={insights.recordPeak ? `${insights.recordPeak.value} m` : "—"}
            detail={insights.recordPeak?.shortName ?? "No peak recorded"}
            icon={Gauge}
          />
          <Stat
            label="Households displaced"
            value={insights.totalDisplaced.toLocaleString("en-PH")}
            detail="Across events in view"
            icon={House}
          />
          <Stat
            label="Most affected"
            value={insights.topArea?.[0] ?? "—"}
            detail={
              insights.topArea
                ? `${insights.topArea[1]} event${insights.topArea[1] === 1 ? "" : "s"}`
                : "No areas recorded"
            }
            icon={Building2}
          />
        </div>
      </section>

      <ChartCard
        title="Peak water level"
        description="Recorded crest height by event"
        unit="m"
        data={insights.peaks}
        empty="Record a peak level to compare flood-water crests over time."
        color="var(--color-primary-600)"
      />
      <ChartCard
        title="Displaced households"
        description="Recorded household impact by event"
        data={insights.displaced}
        empty="Add displaced-household counts to compare historical impact."
        color="var(--color-primary-700)"
      />
    </aside>
  );
}

function Stat({
  label,
  value,
  detail,
  icon: Icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Gauge;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-3.5 shadow-2xs ${
        emphasis ? "border-emerald-200 bg-white" : "border-white/90 bg-white/75"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
          {label}
        </span>
        <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
      </div>
      <p className="mt-2 truncate text-xl font-bold tracking-tight text-neutral-900">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-[10px] text-neutral-500">{detail}</p>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  description,
  unit,
  data,
  empty,
  color,
}: {
  title: string;
  description: string;
  unit?: string;
  data: Array<{
    id: string;
    name: string;
    shortName: string;
    value: number;
    date: string;
  }>;
  empty: string;
  color: string;
}) {
  return (
    <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-2xs">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-700">
            {data.length} {data.length === 1 ? "event" : "events"}
          </span>
        </div>
        <div className="px-3 py-4 sm:px-4">
          {data.length ? (
            <div
              className="h-60"
              role="img"
              aria-label={`${title}: ${data.map((item) => `${item.name}, ${item.value}${unit ? ` ${unit}` : " households"}`).join("; ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 14, right: 8, left: 2, bottom: 18 }}>
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
                    height={48}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value) =>
                      unit ? `${value}m` : Number(value).toLocaleString("en-PH")
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "#ECFDF5" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="min-w-40 rounded-lg border border-neutral-200 bg-white p-2.5 text-xs shadow-md">
                          <p className="font-bold text-neutral-900">
                            {payload[0].payload.name}
                          </p>
                          <p className="mt-1 text-neutral-600">
                            {payload[0].payload.value.toLocaleString("en-PH")}
                            {unit ? ` ${unit}` : " households"}
                          </p>
                          <p className="mt-0.5 text-neutral-500">
                            {payload[0].payload.date}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill={color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={72}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart description={empty} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
