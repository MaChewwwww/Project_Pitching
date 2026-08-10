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
    activeBg: "bg-amber-500/10 border-amber-300/80 text-amber-950",
    barColor: "bg-amber-500",
    icon: AlertCircle,
    key: "level_1_m" as const,
  },
  {
    level: 2 as const,
    label: "Evacuate",
    activeBg: "bg-orange-500/15 border-orange-400 text-orange-950 shadow-2xs",
    barColor: "bg-orange-500",
    icon: AlertTriangle,
    key: "level_2_m" as const,
  },
  {
    level: 3 as const,
    label: "Forced Evac",
    activeBg: "bg-red-500/20 border-red-500 text-red-950 shadow-xs",
    barColor: "bg-red-600",
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

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="grid grid-cols-3 gap-2"
        role="img"
        aria-label={
          level === 0
            ? "River alert level: Normal"
            : `River alert level ${level} of 3${currentValueM != null ? `, currently ${currentValueM} metres` : ""}`
        }
      >
        {SEGMENTS.map((segment) => {
          const reached = level >= segment.level;
          const isCurrent = level === segment.level;
          const Icon = segment.icon;

          return (
            <div
              key={segment.level}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all duration-200",
                reached
                  ? segment.activeBg
                  : onDark
                  ? "border-white/10 bg-white/5 text-neutral-400"
                  : "border-neutral-200/60 bg-neutral-50/60 text-neutral-400"
              )}
            >
              {/* Segment Progress Fill Bar */}
              <div className="w-full bg-neutral-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    reached ? segment.barColor : "bg-transparent"
                  )}
                  style={{ width: reached ? "100%" : "0%" }}
                />
              </div>

              {/* Step Label & Active Icon */}
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {segment.level} · {segment.label}
                </span>
                {reached ? (
                  <Icon className={cn("size-3.5 shrink-0", isCurrent && "animate-pulse")} />
                ) : null}
              </div>

              {/* Threshold Height */}
              {hasThresholds ? (
                <span
                  className={cn(
                    "text-caption tabular font-bold",
                    reached ? "text-neutral-900" : "text-neutral-400"
                  )}
                >
                  {thresholds?.[segment.key] != null
                    ? `${thresholds[segment.key]} m`
                    : "—"}
                </span>
              ) : null}
            </div>
          );
        })}
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
