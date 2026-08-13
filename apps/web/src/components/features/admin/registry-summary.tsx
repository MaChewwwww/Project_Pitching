"use client";

import {
  BarChart3,
  ClipboardCheck,
  Home,
  MapPinned,
  PhoneOff,
  Users,
  UserRoundCheck,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card, CardContent } from "@/components/common/card";
import type { RegistrySummary } from "@/lib/api/registry-types";

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">
          {label}
        </p>
        <Icon aria-hidden className="size-4 text-emerald-700" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-neutral-950 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

export function RegistrySummaryRibbon({ summary }: { summary?: RegistrySummary }) {
  if (!summary) return null;
  const average = summary.average_household_size?.toFixed(1) ?? "—";
  const maxArea = Math.max(...summary.areas.map((area) => area.households), 1);

  return (
    <section aria-label="Registry coverage" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Home}
          label="Households"
          value={summary.households.toLocaleString()}
          detail={`${summary.self_registered_households} self · ${summary.bhw_assisted_households} BHW-assisted`}
          tone="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
        />
        <Metric
          icon={Users}
          label="Registered citizens"
          value={summary.citizens.toLocaleString()}
          detail={`${average} people per household on average`}
          tone="border-sky-200 bg-gradient-to-br from-sky-50 to-white"
        />
        <Metric
          icon={PhoneOff}
          label="Needs contact follow-up"
          value={summary.unreachable_households.toLocaleString()}
          detail="Households marked unreachable by phone"
          tone="border-amber-200 bg-gradient-to-br from-amber-50 to-white"
        />
        <Metric
          icon={UserRoundCheck}
          label="Review queue"
          value={summary.possible_duplicates.toLocaleString()}
          detail="Possible duplicate household records"
          tone="border-violet-200 bg-gradient-to-br from-violet-50 to-white"
        />
      </div>

      <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <BarChart3 aria-hidden className="size-4 text-emerald-700" />
                Coverage by area
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Registered households and citizens, scoped to your access.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800">
              {summary.areas.length} areas represented
            </span>
          </div>
          {summary.areas.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.areas.map((area) => (
                <div key={area.id} className="rounded-xl border border-neutral-200 bg-white/85 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-neutral-800">{area.name}</span>
                    <span className="text-[11px] font-semibold text-neutral-500 tabular-nums">
                      {area.citizens} citizens
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                      style={{ width: `${Math.max(8, (area.households / maxArea) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-500">
                    {area.households} household{area.households === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-500">
              Coverage will appear after the first household is registered.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

const AREA_COLORS = ["#00a878", "#168aad", "#5e60ce", "#8d5cf6", "#e08e0b", "#d45d79"];

function areaLabel(value: string): string {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { area: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-neutral-900">{areaLabel(item.payload?.area ?? "Area")}</p>
      <p className="mt-1 text-neutral-600">
        {item.name === "citizens" ? "Citizens" : "Households"}: {item.value?.toLocaleString() ?? 0}
      </p>
    </div>
  );
}

export function HouseholdRegistrySummary({ summary }: { summary?: RegistrySummary }) {
  if (!summary) return null;

  const average = summary.average_household_size?.toFixed(1) ?? "—";
  const areas = summary.areas.map((area, index) => ({
    ...area,
    color: AREA_COLORS[index % AREA_COLORS.length],
  }));
  const totalHouseholds = areas.reduce((total, area) => total + area.households, 0);
  const totalCitizens = areas.reduce((total, area) => total + area.citizens, 0);
  const hasDistribution = areas.some((area) => area.households > 0 || area.citizens > 0);

  return (
    <section aria-label="Household registry overview" className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <Home aria-hidden className="size-4" />
                  </span>
                  Household &amp; Registered Citizens
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Coverage at a glance across the active registry.
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-emerald-700 uppercase">
                {areas.length} areas
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-x divide-emerald-200/80">
              <div className="pr-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">Households</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-neutral-950 tabular-nums">
                  {summary.households.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {summary.self_registered_households} self · {summary.bhw_assisted_households} BHW-assisted
                </p>
              </div>
              <div className="pl-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">Registered Citizens</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-neutral-950 tabular-nums">
                  {summary.citizens.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{average} people per household</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2.5">
              <Users aria-hidden className="size-4 shrink-0 text-emerald-700" />
              <p className="text-xs leading-relaxed text-neutral-600">
                {totalCitizens.toLocaleString()} citizens distributed across {totalHouseholds.toLocaleString()} active household records.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-amber-50/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <ClipboardCheck aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-950">Review Queue &amp; Follow Up</p>
                <p className="mt-1 text-xs text-neutral-500">Small queues worth an officer&apos;s next look.</p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-neutral-200/80 rounded-xl border border-neutral-200/80 bg-white/75">
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <UserRoundCheck aria-hidden className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-800">Review Queue</p>
                    <p className="text-[11px] text-neutral-500">Possible duplicate records</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-violet-700 tabular-nums">{summary.possible_duplicates}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <PhoneOff aria-hidden className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-800">Follow Up</p>
                    <p className="text-[11px] text-neutral-500">Marked unreachable by phone</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-700 tabular-nums">{summary.unreachable_households}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/45">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
                <MapPinned aria-hidden className="size-4 text-sky-700" />
                Distribution by Area
              </p>
              <p className="mt-1 text-xs text-neutral-500">Outer ring: households · inner ring: citizens.</p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-sky-800 uppercase">
              {areas.length} areas represented
            </span>
          </div>

          {hasDistribution ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(220px,0.8fr)_1fr] md:items-center">
              <div
                className="relative h-60 min-w-0"
                role="img"
                aria-label="Household and citizen distribution donut chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={areas} dataKey="households" nameKey="area" innerRadius={82} outerRadius={108} paddingAngle={2} stroke="#ffffff" strokeWidth={3}>
                      {areas.map((area) => <Cell key={`households-${area.id}`} fill={area.color} />)}
                    </Pie>
                    <Pie data={areas} dataKey="citizens" nameKey="area" innerRadius={55} outerRadius={78} paddingAngle={2} stroke="#ffffff" strokeWidth={3}>
                      {areas.map((area) => <Cell key={`citizens-${area.id}`} fill={area.color} fillOpacity={0.58} />)}
                    </Pie>
                    <Tooltip content={<DistributionTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold tracking-tight text-neutral-950 tabular-nums">{summary.households.toLocaleString()}</p>
                  <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">Households</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white/80 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />
                      <span className="truncate text-xs font-bold text-neutral-800">{areaLabel(area.name)}</span>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-neutral-500 tabular-nums">
                      {area.households} H · {area.citizens} C
                    </span>
                  </div>
                ))}
              </div>
              <p className="sr-only md:col-span-2">
                Area distribution: {areas.map((area) => `${areaLabel(area.name)} has ${area.households} households and ${area.citizens} citizens`).join("; ")}.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
              Distribution will appear after the first household is registered.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
