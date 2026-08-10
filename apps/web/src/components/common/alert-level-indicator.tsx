import * as React from "react";
import { AlertCircle, AlertTriangle, ShieldAlert, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AlertLevel, RiverThresholds } from "@/lib/api/public-types";

/**
 * The three-segment river alert gauge (design.md Section 7.2, BR-3.2).
 */

export interface AlertLevelIndicatorProps {
  level: AlertLevel;
  currentValueM?: number | null;
  thresholds?: RiverThresholds | null;
  className?: string;
  onDark?: boolean;
  /**
   * Show the two-line explanation of why threshold numbers are absent. Off in
   * dense contexts, where the prose costs more room than the gauge itself.
   */
  explainMissingThresholds?: boolean;
}

const SEGMENTS = [
  {
    level: 1 as const,
    label: "Prepare",
    activeCard: "border-amber-300 bg-amber-50/80 text-amber-950 shadow-2xs",
    icon: AlertCircle,
    key: "level_1_m" as const,
  },
  {
    level: 2 as const,
    label: "Evacuate",
    activeCard: "border-orange-400 bg-orange-50/90 text-orange-950 shadow-2xs ring-1 ring-orange-300/50",
    icon: AlertTriangle,
    key: "level_2_m" as const,
  },
  {
    level: 3 as const,
    label: "Forced Evac",
    activeCard: "border-red-500 bg-red-50/90 text-red-950 shadow-xs ring-1 ring-red-400/50",
    icon: ShieldAlert,
    key: "level_3_m" as const,
  },
];

export function AlertLevelIndicator({
  level,
  currentValueM,
  thresholds,
  className,
  onDark = false,
  explainMissingThresholds = true,
}: AlertLevelIndicatorProps) {
  const hasThresholds =
    thresholds != null &&
    (thresholds.level_1_m != null ||
      thresholds.level_2_m != null ||
      thresholds.level_3_m != null);

  // Compute continuous gauge fill percentage: 0% -> 33% -> 66% -> 100%
  const progressPercent = level === 0 ? 0 : level === 1 ? 33 : level === 2 ? 66 : 100;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Unified Gauge Stage Container */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-3.5 transition-all duration-300 shadow-2xs",
          onDark
            ? "border-white/15 bg-gradient-to-b from-slate-900/80 to-slate-950/60"
            : "border-neutral-200/90 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50"
        )}
        role="img"
        aria-label={
          level === 0
            ? "River alert level: Normal"
            : `River alert level ${level} of 3${currentValueM != null ? `, currently ${currentValueM} metres` : ""}`
        }
      >
        {/* Container Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-overline inline-flex items-center gap-1.5 font-bold tracking-wider text-slate-700 uppercase">
            <Zap className="size-3.5 text-amber-500" />
            Alert Threshold Stages
          </span>
          {level > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300/60 whitespace-nowrap">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
              </span>
              Stage {level} Active {currentValueM != null ? `(${currentValueM}m)` : null}
            </span>
          ) : (
            <span className="text-caption font-semibold text-emerald-700">Normal Water Stage</span>
          )}
        </div>

        {/* Continuous Multi-Color Gauge Track */}
        <div className="relative w-full h-2 rounded-full bg-neutral-200/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-amber-400 via-orange-500 to-red-600"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 3 Symmetrical Step Cards */}
        <div className="grid grid-cols-3 gap-2.5 pt-0.5">
          {SEGMENTS.map((segment) => {
            const reached = level >= segment.level;
            const isCurrent = level === segment.level;
            const Icon = segment.icon;

            return (
              <div
                key={segment.level}
                className={cn(
                  "flex flex-col justify-between gap-2 rounded-xl border p-3 transition-all duration-300 min-h-[72px]",
                  reached
                    ? segment.activeCard
                    : onDark
                    ? "border-white/10 bg-white/5 text-neutral-400"
                    : "border-neutral-200/60 bg-white/70 text-neutral-400"
                )}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide truncate">
                    {segment.level} · {segment.label}
                  </span>
                  {reached ? (
                    <Icon className={cn("size-3.5 shrink-0 ml-auto text-current", isCurrent && "animate-pulse")} />
                  ) : null}
                </div>

                {/* Threshold Height Value */}
                {hasThresholds ? (
                  <div className="flex items-baseline justify-between gap-1 w-full border-t border-neutral-200/50 pt-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 shrink-0">
                      Height
                    </span>
                    <span
                      className={cn(
                        "text-body tabular font-black tracking-tight ml-auto",
                        reached ? "text-neutral-950" : "text-neutral-400"
                      )}
                    >
                      {thresholds?.[segment.key] != null
                        ? `${thresholds[segment.key]} m`
                        : "—"}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {!hasThresholds && explainMissingThresholds ? (
        <p
          className={cn(
            "text-caption italic",
            onDark ? "text-primary-100/70" : "text-neutral-500"
          )}
        >
          Threshold heights for this station are pending confirmation from the Rodriguez
          MDRRMO. The level shown is the one declared by the barangay.
        </p>
      ) : null}
    </div>
  );
}
