"use client";

import {
  BarChart3,
  ClipboardCheck,
  Home,
  MapPinned,
  Phone,
  PhoneOff,
  Users,
  UserRoundCheck,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/common/card";
import type { RegistrySummary } from "@/lib/api/registry-types";

type FloodRiskCounts = {
  low: number;
  medium: number;
  high: number;
};

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

export function HouseholdRegistrySummary({
  summary,
  riskCounts,
  noContactHouseholds,
}: {
  summary?: RegistrySummary;
  riskCounts?: FloodRiskCounts;
  noContactHouseholds?: number;
}) {
  if (!summary) return null;

  const average = summary.average_household_size?.toFixed(1) ?? "—";
  const totalHouseholds = summary.areas.reduce((total, area) => total + area.households, 0);
  const totalCitizens = summary.areas.reduce((total, area) => total + area.citizens, 0);
  const areas = [...summary.areas]
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }))
    .map((area, index) => ({
      ...area,
      color: AREA_COLORS[index % AREA_COLORS.length],
      householdShare: totalHouseholds ? Math.round((area.households / totalHouseholds) * 100) : 0,
      citizenShare: totalCitizens ? Math.round((area.citizens / totalCitizens) * 100) : 0,
    }));
  const hasDistribution = areas.some((area) => area.households > 0 || area.citizens > 0);

  return (
    <section aria-label="Household registry overview">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="h-full overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white">
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
                  {summary.self_registered_households} Self-Registered · {summary.bhw_assisted_households} BHW-Assisted
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

            <div className="mt-5 grid grid-cols-3 divide-x divide-emerald-200/80 border-t border-emerald-100/80 pt-3" aria-label="Households by flood risk">
              <div className="flex items-center justify-between gap-2 pr-3">
                <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold text-neutral-500 sm:text-[10px]">
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  Low Flood Risk
                </p>
                <p className="shrink-0 text-lg font-bold text-emerald-700 tabular-nums">
                  {riskCounts ? riskCounts.low.toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 px-3">
                <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold text-neutral-500 sm:text-[10px]">
                  <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  Medium Flood Risk
                </p>
                <p className="shrink-0 text-lg font-bold text-amber-700 tabular-nums">
                  {riskCounts ? riskCounts.medium.toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 pl-3">
                <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold text-neutral-500 sm:text-[10px]">
                  <span className="size-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                  High Flood Risk
                </p>
                <p className="shrink-0 text-lg font-bold text-rose-700 tabular-nums">
                  {riskCounts ? riskCounts.high.toLocaleString() : "—"}
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="order-3 h-full overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-amber-50/40">
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
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                    <Phone aria-hidden className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-800">No Contact Number</p>
                    <p className="text-[11px] text-neutral-500">Households missing phone details</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-700 tabular-nums">{noContactHouseholds ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="order-2 h-full overflow-hidden border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/45">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
                <MapPinned aria-hidden className="size-4 text-sky-700" />
                Population by Area
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-sky-800 uppercase">
              {areas.length} areas represented
            </span>
          </div>

          {hasDistribution ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(150px,0.72fr)_1fr] sm:items-center">
              <div className="mx-auto w-full max-w-[180px]">
                <div className="relative h-44" role="img" aria-label="Population by area. Outer ring shows households; inner ring shows citizens.">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={areas} dataKey="households" nameKey="area" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="#ffffff" strokeWidth={3}>
                      {areas.map((area) => <Cell key={`households-${area.id}`} fill={area.color} />)}
                    </Pie>
                    <Pie data={areas} dataKey="citizens" nameKey="area" innerRadius={31} outerRadius={44} paddingAngle={2} stroke="#ffffff" strokeWidth={3}>
                      {areas.map((area) => <Cell key={`citizens-${area.id}`} fill={area.color} fillOpacity={0.55} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-bold tracking-tight text-neutral-950 tabular-nums">
                    {summary.households.toLocaleString()} <span className="font-normal text-neutral-400">·</span> {summary.citizens.toLocaleString()}
                  </p>
                </div>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {areas.map((area) => (
                  <div key={area.id} className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />
                    <span className="min-w-0 flex-1 truncate font-bold text-neutral-800">{areaLabel(area.name)}</span>
                    <span className="shrink-0 text-right text-[10px] text-neutral-500 tabular-nums sm:text-[11px]">
                      <span className="font-bold text-neutral-800">{area.households}</span>{" "}
                      <span className="font-semibold">Households ({area.householdShare}%)</span>{" "}
                      <span aria-hidden className="px-1">|</span>{" "}
                      <span className="font-bold text-neutral-800">{area.citizens}</span>{" "}
                      <span className="font-semibold">Citizens ({area.citizenShare}%)</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="sm:col-span-2 flex flex-nowrap items-center justify-center gap-x-4 whitespace-nowrap text-[10px] font-semibold text-neutral-500" aria-label="Chart ring legend">
                <span>Outer ring: Households</span>
                <span aria-hidden>|</span>
                <span>Inner ring: Citizens</span>
              </div>
              <p className="sr-only">
                Area distribution: {areas.map((area) => `${areaLabel(area.name)} has ${area.households} households (${area.householdShare} percent) and ${area.citizens} citizens (${area.citizenShare} percent)`).join("; ")}.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
              Distribution will appear after the first household is registered.
            </p>
          )}
        </CardContent>
        </Card>
      </div>
    </section>
  );
}
