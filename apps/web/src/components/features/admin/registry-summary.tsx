"use client";

import { BarChart3, Home, PhoneOff, Users, UserRoundCheck } from "lucide-react";

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
