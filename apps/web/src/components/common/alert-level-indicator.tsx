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
  /**
   * Show the alert level description paragraph. Defaults to true.
   */
  showDescription?: boolean;
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
    activeCard:
      "border-orange-400 bg-orange-50/90 text-orange-950 shadow-2xs ring-1 ring-orange-300/50",
    icon: AlertTriangle,
    key: "level_2_m" as const,
  },
  {
    level: 3 as const,
    label: "Critical",
    activeCard:
      "border-red-500 bg-red-50/90 text-red-950 shadow-xs ring-1 ring-red-400/50",
    icon: ShieldAlert,
    key: "level_3_m" as const,
  },
];

const ALERT_PARAGRAPHS: Record<AlertLevel, string> = {
  0: "River water level is currently within safe operating limits. No active flood threat is reported.",
  1: "Water has reached Alert Level 1 (Prepare at 22.4 m). Families in low-lying areas should prepare Go-Bags and stay alert for BDRRMC notices.",
  2: "Water has reached Alert Level 2 (Evacuate at 23.0 m). Residents along riverbanks and flood-prone zones are advised to evacuate immediately.",
  3: "Water has reached Alert Level 3 (Critical at 23.6 m). Mandatory evacuation is in effect across all flood-prone zones. Await emergency BDRRMC rescue teams.",
};

export function AlertLevelIndicator({
  level,
  currentValueM,
  thresholds,
  className,
  onDark = false,
  explainMissingThresholds = true,
  showDescription = true,
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
          "flex flex-col gap-3 rounded-2xl border p-3.5 shadow-2xs transition-all duration-300",
          onDark
            ? "border-white/15 bg-gradient-to-b from-slate-900/80 to-slate-950/60"
            : "border-neutral-200/90 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50",
        )}
        role="img"
        aria-label={
          level === 0
            ? "River alert level: Normal"
            : `River alert level ${level} of 3${currentValueM != null ? `, currently ${currentValueM} metres` : ""}`
        }
      >
        {/* Continuous Multi-Color Gauge Track */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 transition-all duration-700 ease-out"
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
                  "flex min-h-[68px] flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all duration-300",
                  reached
                    ? segment.activeCard
                    : onDark
                      ? "border-white/10 bg-white/5 text-neutral-400"
                      : "border-neutral-200/60 bg-white/70 text-neutral-400",
                )}
              >
                {/* Stage Header */}
                <div className="flex w-full items-center justify-between gap-1 overflow-hidden">
                  <span className="text-[10px] font-extrabold tracking-tight whitespace-nowrap uppercase sm:text-[10.5px]">
                    {segment.label}
                  </span>
                  <Icon
                    className={cn(
                      "ml-auto size-3.5 shrink-0",
                      reached
                        ? "text-current"
                        : onDark
                          ? "text-neutral-500"
                          : "text-neutral-300",
                      isCurrent && "animate-pulse",
                    )}
                    aria-hidden
                  />
                </div>

                {/* Threshold Height Value */}
                {hasThresholds ? (
                  <div className="flex w-full items-baseline justify-between gap-1 border-t border-neutral-200/50 pt-1.5">
                    <span className="shrink-0 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                      Height
                    </span>
                    <span
                      className={cn(
                        "text-body tabular ml-auto font-black tracking-tight",
                        reached ? "text-neutral-950" : "text-neutral-400",
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

        {/* Active Alert Level Description Paragraph */}
        {showDescription ? (
          <p
            className={cn(
              "text-caption pt-0.5 leading-relaxed",
              onDark ? "text-neutral-300" : "text-neutral-600",
            )}
          >
            {ALERT_PARAGRAPHS[level] ?? ALERT_PARAGRAPHS[0]}
          </p>
        ) : null}
      </div>

      {!hasThresholds && explainMissingThresholds ? (
        <p
          className={cn(
            "text-caption italic",
            onDark ? "text-primary-100/70" : "text-neutral-500",
          )}
        >
          Threshold heights for this station are pending confirmation from the Rodriguez
          MDRRMO. The level shown is the one declared by the barangay.
        </p>
      ) : null}
    </div>
  );
}
