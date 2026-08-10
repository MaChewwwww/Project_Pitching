import * as React from "react";
import { AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";

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
    label: "Critical",
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
        {/* Continuous Multi-Color Gauge Track */}
        <div className="relative w-full h-2.5 rounded-full bg-neutral-200/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-amber-400 via-orange-500 to-red-600"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 3 Step Cards Layout */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {SEGMENTS.map((segment) => {
            const reached = level >= segment.level;
            const isCurrent = level === segment.level;
            const Icon = segment.icon;

            return (
              <div
                key={segment.level}
                className={cn(
                  "flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all duration-300 min-h-[68px]",
                  reached
                    ? segment.activeCard
                    : onDark
                    ? "border-white/10 bg-white/5 text-neutral-400"
                    : "border-neutral-200/60 bg-white/70 text-neutral-400"
                )}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-tight whitespace-nowrap">
                    {segment.label}
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
