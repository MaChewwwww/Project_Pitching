"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AssetMetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  sub: string;
  badge?: React.ReactNode;
  tone?: "neutral" | "emerald" | "rose" | "amber" | "sky";
}

export function AssetMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  badge,
  tone = "neutral",
}: AssetMetricCardProps) {
  const toneMap = {
    neutral: {
      card: "bg-white border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300",
      iconBox: "bg-slate-100 text-slate-700",
      sub: "text-slate-500",
      value: "text-slate-950",
    },
    emerald: {
      card: "bg-emerald-50/50 border-emerald-200/80 text-emerald-950 shadow-2xs hover:border-emerald-300",
      iconBox: "bg-emerald-100 text-emerald-700",
      sub: "text-emerald-700 font-medium",
      value: "text-emerald-950",
    },
    rose: {
      card: "bg-rose-50/60 border-rose-200 text-rose-950 shadow-2xs hover:border-rose-300",
      iconBox: "bg-rose-100 text-rose-700",
      sub: "text-rose-700 font-medium",
      value: "text-rose-950",
    },
    amber: {
      card: "bg-amber-50/50 border-amber-200/80 text-amber-950 shadow-2xs hover:border-amber-300",
      iconBox: "bg-amber-100 text-amber-800",
      sub: "text-amber-800 font-medium",
      value: "text-amber-950",
    },
    sky: {
      card: "bg-sky-50/50 border-sky-200 text-sky-950 shadow-2xs hover:border-sky-300",
      iconBox: "bg-sky-100 text-sky-700",
      sub: "text-sky-700 font-medium",
      value: "text-sky-950",
    },
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 transition-all hover:shadow-xs",
        toneMap.card,
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "grid size-7 place-items-center rounded-lg shadow-2xs shrink-0",
              toneMap.iconBox,
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 truncate">
            {label}
          </span>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black tracking-tight tabular-nums",
              toneMap.value,
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
              {unit}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col justify-center text-right min-w-0 flex-1 pl-1">
          <span className={cn("text-[11px] leading-tight line-clamp-1 text-right", toneMap.sub)}>
            {sub}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AssetMetricStrip({ items }: { items: AssetMetricCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, idx) => (
        <AssetMetricCard key={idx} {...item} />
      ))}
    </div>
  );
}
