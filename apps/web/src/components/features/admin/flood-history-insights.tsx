"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Building2, Gauge, House } from "lucide-react";

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
      className="space-y-4 xl:sticky xl:top-5 xl:self-start"
      aria-label="Flood history insights"
    >
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Gauge aria-hidden className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">History at a glance</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              A comparison of recorded impact, not a live flood forecast.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Stat
            label="Records"
            value={events.length.toLocaleString("en-PH")}
            icon={BarChart3}
          />
          <Stat
            label="Record peak"
            value={insights.recordPeak ? `${insights.recordPeak.value} m` : "—"}
            detail={insights.recordPeak?.shortName ?? "No peak recorded"}
            icon={Gauge}
          />
          <Stat
            label="Displaced"
            value={insights.totalDisplaced.toLocaleString("en-PH")}
            detail="Households recorded"
            icon={House}
          />
          <Stat
            label="Most affected"
            value={insights.topArea?.[0] ?? "—"}
            detail={
              insights.topArea
                ? `${insights.topArea[1]} recorded event${insights.topArea[1] === 1 ? "" : "s"}`
                : "No areas recorded"
            }
            icon={Building2}
          />
        </div>
      </div>

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
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/90 bg-white/85 p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
          {label}
        </span>
        <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
      </div>
      <p className="mt-2 truncate text-lg font-bold tracking-tight text-neutral-900">
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
        <div className="border-b border-neutral-100 px-4 py-3.5">
          <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        </div>
        <div className="p-3.5">
          {data.length ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 8, right: 4, left: -20, bottom: 18 }}
                >
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
                    unit={unit}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
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
                  <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
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
