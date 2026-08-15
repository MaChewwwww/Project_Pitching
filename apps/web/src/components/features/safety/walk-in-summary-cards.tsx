"use client";

import * as React from "react";
import {
  CheckCircle2,
  HeartPulse,
  UserCheck,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Badge } from "@/components/common/badge";
import type { UnregisteredPersonOut } from "@/lib/api/safety-types";

export function WalkInSummaryCards({
  people,
  activeEventName,
}: {
  people: UnregisteredPersonOut[];
  activeEventName?: string;
}) {
  const stats = React.useMemo(() => {
    const total = people.length;
    let safe = 0;
    let needsRescue = 0;
    let converted = 0;

    let minorCount = 0;
    let seniorCount = 0;
    let pwdCount = 0;
    let pregnantCount = 0;
    let lactatingCount = 0;
    let chronicCount = 0;
    let bedriddenCount = 0;

    const inCenterCount = people.filter((p) => Boolean(p.evac_center_id)).length;

    for (const p of people) {
      if (p.status === "safe") safe++;
      if (p.status === "needs_rescue") needsRescue++;
      if (p.converted_member_id) converted++;

      if (p.is_child) minorCount++;
      if (p.is_senior) seniorCount++;
      if (p.is_pwd) pwdCount++;
      if (p.is_pregnant) pregnantCount++;
      if (p.is_lactating) lactatingCount++;
      if (p.has_chronic_condition) chronicCount++;
      if (p.is_bedridden) bedriddenCount++;
    }

    const unresolved = total - converted;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    const totalSpecialNeeds =
      minorCount +
      seniorCount +
      pwdCount +
      pregnantCount +
      lactatingCount +
      chronicCount +
      bedriddenCount;

    return {
      total,
      safe,
      needsRescue,
      converted,
      unresolved,
      conversionRate,
      inCenterCount,
      totalSpecialNeeds,
      minorCount,
      seniorCount,
      pwdCount,
      pregnantCount,
      lactatingCount,
      chronicCount,
      bedriddenCount,
    };
  }, [people]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Walk-Ins Recorded */}
      <Card className="relative overflow-hidden border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Total Walk-Ins
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100/80 text-emerald-700 shadow-2xs">
              <Users className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {stats.total}
            </span>
            <span className="text-xs font-semibold text-neutral-500">individuals</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Sheltered in Centers:</span>
            <span className="font-bold text-emerald-800">
              {stats.inCenterCount} ({stats.total > 0 ? Math.round((stats.inCenterCount / stats.total) * 100) : 0}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Safety & Triage Status */}
      <Card className="relative overflow-hidden border-emerald-200/80 bg-gradient-to-br from-white via-slate-50/40 to-emerald-50/20 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Safety Triage
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <CheckCircle2 className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-emerald-700">
                {stats.safe}
              </span>
              <span className="text-xs font-bold text-emerald-800">Safe</span>
            </div>
            {stats.needsRescue > 0 && (
              <div className="flex items-baseline gap-1.5 border-l border-neutral-200 pl-3">
                <span className="text-2xl font-black tracking-tight text-rose-600">
                  {stats.needsRescue}
                </span>
                <span className="text-xs font-bold text-rose-700">Needs Rescue</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Event Context:</span>
            <span className="truncate max-w-[130px] font-bold text-neutral-800" title={activeEventName}>
              {activeEventName || "All Emergency Events"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Priority Vulnerability Demographics */}
      <Card className="relative overflow-hidden border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/20 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Special Needs
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-100/80 text-amber-700 shadow-2xs">
              <HeartPulse className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {stats.minorCount > 0 && (
              <Badge tone="warning" className="text-[11px] font-bold">
                {stats.minorCount} Minor(s)
              </Badge>
            )}
            {stats.seniorCount > 0 && (
              <Badge tone="warning" className="text-[11px] font-bold">
                {stats.seniorCount} Senior(s)
              </Badge>
            )}
            {stats.pwdCount > 0 && (
              <Badge tone="warning" className="text-[11px] font-bold">
                {stats.pwdCount} PWD
              </Badge>
            )}
            {(stats.pregnantCount > 0 || stats.lactatingCount > 0) && (
              <Badge tone="danger" className="text-[11px] font-bold">
                {stats.pregnantCount + stats.lactatingCount} Maternal
              </Badge>
            )}
            {(stats.chronicCount > 0 || stats.bedriddenCount > 0) && (
              <Badge tone="danger" className="text-[11px] font-bold">
                {stats.chronicCount + stats.bedriddenCount} Medical
              </Badge>
            )}
            {stats.totalSpecialNeeds === 0 && (
              <span className="text-xs font-medium text-neutral-500 py-1">
                No active special needs flagged
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-amber-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Total Vulnerability Flags:</span>
            <span className="font-bold text-amber-900">{stats.totalSpecialNeeds}</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Official Registry Conversion */}
      <Card className="relative overflow-hidden border-primary-200/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Registry Conversion
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
              <UserCheck className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-neutral-900">
                {stats.converted}
              </span>
              <span className="text-xs font-semibold text-neutral-500">converted</span>
            </div>
            <span className="text-sm font-black text-emerald-700">
              {stats.conversionRate}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${stats.conversionRate}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-teal-100/80 pt-2 text-xs">
            <span className="font-medium text-neutral-600">Pending Conversion:</span>
            <span className="font-bold text-neutral-800">
              {stats.unresolved} unresolved
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
