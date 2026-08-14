"use client";

import * as React from "react";
import {
  CheckCircle2,
  HeartPulse,
  PhoneOff,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent } from "@/components/common/card";
import type { RegistryMemberSummary } from "@/lib/api/registry-types";

const AGE_COLORS = {
  children: "#0284c7", // Sky Blue
  adults: "#059669",   // Emerald
  seniors: "#7c3aed",  // Violet
};

const SUPPORT_COLORS = [
  { key: "pwd", label: "PWD", color: "#2563eb" },               // Blue
  { key: "maternal", label: "Maternal", color: "#ec4899" },        // Pink
  { key: "chronic", label: "Chronic Condition", color: "#f59e0b" },// Amber
  { key: "mobility", label: "Mobility-Limited", color: "#dc2626" },// Red
] as const;

export function CitizenRegistrySummary({ summary }: { summary?: RegistryMemberSummary }) {
  if (!summary) return null;

  const totalCitizens = summary.citizens || 1;
  const completePct = Math.min(100, Math.round((summary.complete_profiles / totalCitizens) * 100));

  // Prepare Age Demographics Data
  const ageData = [
    { name: "Children (<18)", value: summary.age_groups.children, color: AGE_COLORS.children },
    { name: "Adults (18-59)", value: summary.age_groups.adults, color: AGE_COLORS.adults },
    { name: "Seniors (60+)", value: summary.age_groups.seniors, color: AGE_COLORS.seniors },
  ];

  // Prepare Support Needs Data
  const totalSupportItems =
    summary.support.pwd +
    summary.support.maternal +
    summary.support.chronic_condition +
    summary.support.mobility_limited;

  const supportData = [
    { name: "PWD", value: summary.support.pwd, color: SUPPORT_COLORS[0].color },
    { name: "Maternal", value: summary.support.maternal, color: SUPPORT_COLORS[1].color },
    { name: "Chronic Condition", value: summary.support.chronic_condition, color: SUPPORT_COLORS[2].color },
    { name: "Mobility-Limited", value: summary.support.mobility_limited, color: SUPPORT_COLORS[3].color },
  ].filter((item) => item.value > 0);

  return (
    <section aria-label="Registered citizen overview" className="grid gap-3 lg:grid-cols-[1fr_1.1fr_1.1fr]">
      {/* CARD 1: Population & Registry Health */}
      <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <UsersRound aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-950">Registered Citizens</p>
                <p className="text-xs text-neutral-500">Demographics &amp; Roster</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
              San Jose
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-950 tabular-nums">
              {summary.citizens.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">Total Persons</span>
          </div>

          {/* Heads vs Members Breakdown */}
          <div className="mt-3 grid grid-cols-2 divide-x divide-emerald-100 rounded-xl border border-emerald-100/80 bg-white/80 p-2.5">
            <div className="pr-2">
              <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Heads of Household</p>
              <p className="mt-0.5 text-base font-bold text-neutral-900 tabular-nums">
                {summary.household_heads.toLocaleString()}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  ({Math.round((summary.household_heads / totalCitizens) * 100)}%)
                </span>
              </p>
            </div>
            <div className="pl-3">
              <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Members</p>
              <p className="mt-0.5 text-base font-bold text-neutral-900 tabular-nums">
                {summary.household_members.toLocaleString()}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  ({Math.round((summary.household_members / totalCitizens) * 100)}%)
                </span>
              </p>
            </div>
          </div>

          {/* Profile Health Progress */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Complete Profiles
              </span>
              <span className="font-bold text-emerald-800 tabular-nums">
                {summary.complete_profiles} ({completePct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${completePct}%` }}
              />
            </div>
            {summary.no_contact_number > 0 ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                <PhoneOff className="size-3 shrink-0 text-amber-600" />
                <span>{summary.no_contact_number} citizens need contact phone numbers</span>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Age Demographics Breakdown (Replaces Population by Area) */}
      <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                <UserCheck aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-950">Age Demographics</p>
                <p className="text-xs text-neutral-500">Lifecycle Distribution</p>
              </div>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-800 uppercase">
              Age Groups
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[130px_1fr] items-center gap-3 sm:gap-4">
            <div className="relative h-36" role="img" aria-label="Age group breakdown chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} Citizens`, "Count"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px", padding: "6px 10px" }}
                  />
                  <Pie
                    data={ageData}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`age-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-neutral-950 tabular-nums">
                  {summary.citizens}
                </span>
                <span className="text-[10px] font-medium text-neutral-500">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 p-2 shadow-2xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-800">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: AGE_COLORS.children }} />
                  Children (&lt;18)
                </span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {summary.age_groups.children}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((summary.age_groups.children / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 p-2 shadow-2xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-800">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: AGE_COLORS.adults }} />
                  Adults (18–59)
                </span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {summary.age_groups.adults}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((summary.age_groups.adults / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 p-2 shadow-2xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-800">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: AGE_COLORS.seniors }} />
                  Seniors (60+)
                </span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {summary.age_groups.seniors}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((summary.age_groups.seniors / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Citizens with Support Needs (Pie Chart) */}
      <Card className="overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-amber-50/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <HeartPulse aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-950">Support &amp; Readiness</p>
                <p className="text-xs text-neutral-500">Vulnerability Needs</p>
              </div>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-100/80 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-violet-800 uppercase">
              {summary.with_support_needs} Citizens
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[130px_1fr] items-center gap-3 sm:gap-4">
            <div className="relative h-36" role="img" aria-label="Support needs distribution pie chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} Records`, "Count"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px", padding: "6px 10px" }}
                  />
                  <Pie
                    data={supportData.length ? supportData : [{ name: "None", value: 1, color: "#e5e7eb" }]}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  >
                    {(supportData.length ? supportData : [{ name: "None", value: 1, color: "#e5e7eb" }]).map(
                      (entry, index) => (
                        <Cell key={`support-${index}`} fill={entry.color} />
                      ),
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-violet-700 tabular-nums">
                  {summary.with_support_needs}
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">With Needs</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS[0].color }} />
                  PWD
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{summary.support.pwd}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS[1].color }} />
                  Maternal
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{summary.support.maternal}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS[2].color }} />
                  Chronic Condition
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{summary.support.chronic_condition}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS[3].color }} />
                  Mobility-Limited
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{summary.support.mobility_limited}</span>
              </div>

              {totalSupportItems === 0 ? (
                <p className="mt-1 text-[10px] text-neutral-400">No support needs recorded yet.</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
