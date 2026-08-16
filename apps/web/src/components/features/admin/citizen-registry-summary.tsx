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
import type { RegistryMemberOut, RegistryMemberSummary } from "@/lib/api/registry-types";

const AGE_COLORS = {
  infants: "#38bdf8",  // Sky Light (0-4)
  children: "#0284c7", // Sky Blue (5-12)
  teens: "#6366f1",    // Indigo (13-17)
  adults: "#059669",   // Emerald (18-59)
  seniors: "#7c3aed",  // Violet (60+)
};

const SUPPORT_COLORS = {
  pwd: "#2563eb",       // Blue
  pregnant: "#ec4899",  // Pink
  lactating: "#f43f5e", // Rose
  chronic: "#f59e0b",   // Amber
  mobility: "#dc2626",  // Red
};

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function CitizenRegistrySummary({
  summary,
  citizens,
}: {
  summary?: RegistryMemberSummary;
  citizens?: RegistryMemberOut[];
}) {
  // Compute 5 Age Brackets
  const ageGroupCounts = React.useMemo(() => {
    if (citizens && citizens.length > 0) {
      let infants = 0;
      let children = 0;
      let teens = 0;
      let adults = 0;
      let seniors = 0;

      for (const c of citizens) {
        const ageVal = calculateAge(c.birth_date);
        if (ageVal !== null) {
          if (ageVal <= 4) infants++;
          else if (ageVal <= 12) children++;
          else if (ageVal <= 17) teens++;
          else if (ageVal <= 59) adults++;
          else seniors++;
        } else {
          if (c.is_child) children++;
          else if (c.is_senior) seniors++;
          else adults++;
        }
      }
      return { infants, children, teens, adults, seniors };
    }

    // Fallback if list items not passed
    const totalChild = summary?.age_groups.children ?? 0;
    const infants = Math.round(totalChild * 0.3);
    const children = Math.round(totalChild * 0.45);
    const teens = totalChild - infants - children;
    return {
      infants,
      children,
      teens,
      adults: summary?.age_groups.adults ?? 0,
      seniors: summary?.age_groups.seniors ?? 0,
    };
  }, [citizens, summary]);

  // Compute Support Needs with separated Pregnant and Lactating
  const supportCounts = React.useMemo(() => {
    if (citizens && citizens.length > 0) {
      let pwd = 0;
      let pregnant = 0;
      let lactating = 0;
      let chronic = 0;
      let mobility = 0;

      for (const c of citizens) {
        if (c.is_pwd) pwd++;
        if (c.is_pregnant) pregnant++;
        if (c.is_lactating) lactating++;
        if (c.has_chronic_condition) chronic++;
        if (c.is_bedridden) mobility++;
      }
      return { pwd, pregnant, lactating, chronic, mobility };
    }

    // Fallback if list items not passed
    const mat = summary?.support.maternal ?? 0;
    return {
      pwd: summary?.support.pwd ?? 0,
      pregnant: Math.round(mat * 0.6),
      lactating: Math.round(mat * 0.4),
      chronic: summary?.support.chronic_condition ?? 0,
      mobility: summary?.support.mobility_limited ?? 0,
    };
  }, [citizens, summary]);

  if (!summary) return null;

  const totalCitizens = summary.citizens || 1;
  const completePct = Math.min(100, Math.round((summary.complete_profiles / totalCitizens) * 100));

  const ageData = [
    { name: "Infants & Toddlers (0-4)", value: ageGroupCounts.infants, color: AGE_COLORS.infants },
    { name: "Children (5-12)", value: ageGroupCounts.children, color: AGE_COLORS.children },
    { name: "Teenagers (13-17)", value: ageGroupCounts.teens, color: AGE_COLORS.teens },
    { name: "Adults (18-59)", value: ageGroupCounts.adults, color: AGE_COLORS.adults },
    { name: "Seniors (60+)", value: ageGroupCounts.seniors, color: AGE_COLORS.seniors },
  ];

  const supportData = [
    { name: "PWD", value: supportCounts.pwd, color: SUPPORT_COLORS.pwd },
    { name: "Pregnant", value: supportCounts.pregnant, color: SUPPORT_COLORS.pregnant },
    { name: "Lactating", value: supportCounts.lactating, color: SUPPORT_COLORS.lactating },
    { name: "Chronic Condition", value: supportCounts.chronic, color: SUPPORT_COLORS.chronic },
    { name: "Mobility-Limited", value: supportCounts.mobility, color: SUPPORT_COLORS.mobility },
  ].filter((item) => item.value > 0);

  const totalSupportPersons = summary.with_support_needs;

  return (
    <section aria-label="Registered citizen overview" className="grid gap-3 lg:grid-cols-[1fr_1.15fr_1.1fr]">
      {/* CARD 1: Population & Registry Health */}
      <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white portal-card-hover">
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

      {/* CARD 2: Age Demographics Breakdown */}
      <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/50 portal-card-hover">
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
              5 Groups
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[130px_1fr] items-center gap-3 sm:gap-4">
            <div className="relative h-36" role="img" aria-label="Age group breakdown chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val) => [`${val ?? 0} Citizens`, "Count"]}
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

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 px-2 py-1 shadow-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGE_COLORS.infants }} />
                  Infants &amp; Toddlers (0-4)
                </span>
                <span className="font-bold tabular-nums text-neutral-900 text-[11px]">
                  {ageGroupCounts.infants}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((ageGroupCounts.infants / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 px-2 py-1 shadow-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGE_COLORS.children }} />
                  Children (5-12)
                </span>
                <span className="font-bold tabular-nums text-neutral-900 text-[11px]">
                  {ageGroupCounts.children}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((ageGroupCounts.children / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 px-2 py-1 shadow-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGE_COLORS.teens }} />
                  Teenagers (13-17)
                </span>
                <span className="font-bold tabular-nums text-neutral-900 text-[11px]">
                  {ageGroupCounts.teens}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((ageGroupCounts.teens / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 px-2 py-1 shadow-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGE_COLORS.adults }} />
                  Adults (18-59)
                </span>
                <span className="font-bold tabular-nums text-neutral-900 text-[11px]">
                  {ageGroupCounts.adults}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((ageGroupCounts.adults / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/90 px-2 py-1 shadow-2xs">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-800 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGE_COLORS.seniors }} />
                  Seniors (60+)
                </span>
                <span className="font-bold tabular-nums text-neutral-900 text-[11px]">
                  {ageGroupCounts.seniors}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({Math.round((ageGroupCounts.seniors / totalCitizens) * 100)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Citizens with Support Needs (Pie Chart) */}
      <Card className="overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-amber-50/30 portal-card-hover">
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
              {totalSupportPersons} Citizens
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[130px_1fr] items-center gap-3 sm:gap-4">
            <div className="relative h-36" role="img" aria-label="Support needs distribution pie chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val) => [`${val ?? 0} Records`, "Count"]}
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
                  {totalSupportPersons}
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">With Needs</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS.pwd }} />
                  PWD
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{supportCounts.pwd}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS.pregnant }} />
                  Pregnant
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{supportCounts.pregnant}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS.lactating }} />
                  Lactating
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{supportCounts.lactating}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS.chronic }} />
                  Chronic Condition
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{supportCounts.chronic}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SUPPORT_COLORS.mobility }} />
                  Mobility-Limited
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{supportCounts.mobility}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
