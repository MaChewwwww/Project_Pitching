"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, User } from "lucide-react";
import type { MemberOut } from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  safe: {
    label: "Confirmed Safe",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    ring: "ring-emerald-500/20 bg-emerald-600 text-white",
    cardBorder: "border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/30",
    icon: ShieldCheck,
  },
  needs_rescue: {
    label: "Needs Rescue",
    badge: "bg-red-100 text-red-800 border-red-300 animate-pulse",
    ring: "ring-red-500/30 bg-red-600 text-white animate-pulse",
    cardBorder: "border-red-300 bg-gradient-to-br from-white via-white to-red-50/40 shadow-xs",
    icon: ShieldAlert,
  },
  unaccounted: {
    label: "Pending Check-In",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    ring: "ring-slate-400/20 bg-slate-100 text-slate-700",
    cardBorder: "border-neutral-200/90 bg-white",
    icon: User,
  },
} as const;

function computeAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split("-");
  if (parts.length === 3) {
    const birthYear = parseInt(parts[0], 10);
    if (!Number.isNaN(birthYear)) {
      // Approximate age calculation that doesn't trigger impure timer renders
      const currentYear = 2026;
      return Math.max(0, currentYear - birthYear);
    }
  }
  return null;
}

export function HouseholdSafetyLine({
  members,
  statuses = {},
}: {
  members: MemberOut[];
  statuses?: Record<string, "safe" | "needs_rescue" | "unaccounted">;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => {
        const status = statuses[member.id] ?? "unaccounted";
        const meta = STATUS_MAP[status] ?? STATUS_MAP.unaccounted;
        const Icon = meta.icon;

        const age = computeAge(member.birth_date);
        const isSenior = age !== null && age >= 60;
        const isChild = age !== null && age < 18;

        return (
          <div
            key={member.id}
            className={cn(
              "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:shadow-xs",
              meta.cardBorder,
            )}
          >
            {/* Top row: Avatar + Identity + Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-xs ring-4 transition-transform group-hover:scale-105",
                    meta.ring,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-neutral-900">
                      {member.full_name}
                    </span>
                    {member.is_head ? (
                      <span className="rounded-full bg-emerald-100 border border-emerald-200/80 px-2 py-0.2 text-[10px] font-black text-emerald-800 uppercase">
                        Head
                      </span>
                    ) : null}
                  </div>
                  <span className="block truncate text-xs text-neutral-500 font-medium">
                    {member.relationship_to_head ||
                      (member.is_head ? "Household Head" : "Family Member")}
                    {age !== null ? ` • ${age} yrs old` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle row: Vulnerability Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {isSenior ? (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  Senior Citizen (60+)
                </span>
              ) : null}
              {isChild ? (
                <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                  Minor / Child
                </span>
              ) : null}
              {member.is_pwd ? (
                <span className="rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                  PWD
                </span>
              ) : null}
              {member.is_pregnant ? (
                <span className="rounded-md border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-800">
                  Pregnant
                </span>
              ) : null}
              {member.is_lactating ? (
                <span className="rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                  Lactating
                </span>
              ) : null}
              {member.has_chronic_condition ? (
                <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                  Chronic Condition
                </span>
              ) : null}
              {member.is_bedridden ? (
                <span className="rounded-md border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-900">
                  Bedridden
                </span>
              ) : null}
            </div>

            {/* Bottom row: Safety Status Badge */}
            <div className="mt-3.5 flex items-center justify-between border-t border-neutral-100 pt-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Safety Status
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight",
                  meta.badge,
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {meta.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
