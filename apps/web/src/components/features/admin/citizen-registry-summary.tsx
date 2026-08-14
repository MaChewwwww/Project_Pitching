"use client";

import { Accessibility, HeartPulse, MapPinned, UsersRound } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "@/components/common/card";
import type { RegistryMemberSummary } from "@/lib/api/registry-types";

const COLORS = ["#00a878", "#168aad", "#5e60ce", "#8d5cf6", "#e08e0b", "#d45d79"];

export function CitizenRegistrySummary({ summary }: { summary?: RegistryMemberSummary }) {
  if (!summary) return null;
  const areas = [...summary.areas]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((area, index) => ({ ...area, color: COLORS[index % COLORS.length] }));

  return (
    <section aria-label="Registered citizen overview" className="grid gap-3 lg:grid-cols-[0.95fr_1.2fr_0.95fr]">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white">
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white"><UsersRound className="size-4" /></span>Registered Population</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Citizens" value={summary.citizens} />
            <Metric label="Complete Profiles" value={summary.complete_profiles} />
            <Metric label="Household Heads" value={summary.household_heads} />
            <Metric label="Household Members" value={summary.household_members} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-sky-200 bg-gradient-to-br from-white to-sky-50/70">
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><MapPinned className="size-4 text-sky-700" />Population by Area</p>
          <div className="mt-2 grid grid-cols-[132px_1fr] items-center gap-3">
            <div className="relative h-32" role="img" aria-label="Citizen population by area">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={areas} dataKey="citizens" innerRadius={39} outerRadius={59} paddingAngle={2} stroke="#fff" strokeWidth={3}>{areas.map((area) => <Cell key={area.id} fill={area.color} />)}</Pie></PieChart></ResponsiveContainer>
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-lg font-bold tabular-nums">{summary.citizens}</span>
            </div>
            <div className="space-y-1.5">
              {areas.map((area) => <div key={area.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]"><span className="flex items-center gap-2 font-semibold"><i className="size-2 rounded-full" style={{ background: area.color }} />{area.name}</span><span className="text-neutral-600"><b className="text-neutral-900">{area.citizens}</b> Citizens ({summary.citizens ? Math.round(area.citizens / summary.citizens * 100) : 0}%)</span></div>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-amber-50/50">
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-xl bg-violet-600 text-white"><HeartPulse className="size-4" /></span>Support &amp; Readiness</p>
          <div className="mt-4 flex items-end justify-between border-b border-violet-100 pb-3"><div><p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Citizens with support needs</p><p className="mt-1 text-3xl font-bold text-violet-700 tabular-nums">{summary.with_support_needs}</p></div><Accessibility className="size-8 text-violet-200" /></div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><Support label="PWD" value={summary.support.pwd} /><Support label="Maternal" value={summary.support.maternal} /><Support label="Chronic" value={summary.support.chronic_condition} /><Support label="Mobility-Limited" value={summary.support.mobility_limited} /></div>
        </CardContent>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2"><p className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value.toLocaleString()}</p></div>;
}

function Support({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-neutral-600">{label}</span><b className="tabular-nums">{value}</b></div>;
}
