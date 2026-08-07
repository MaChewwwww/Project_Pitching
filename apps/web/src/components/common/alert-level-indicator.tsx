import * as React from "react";

import { cn } from "@/lib/utils";
import type { AlertLevel, RiverThresholds } from "@/lib/api/public-types";

/**
 * The three-segment river alert gauge (design.md Section 7.2, BR-3.2).
 *
 * **When `thresholds` is null the gauge says so rather than inventing numbers.**
 * The Level 1/2/3 heights for this station are an open item — the MDRRMO has not
 * confirmed them (BRD OI-4). The obvious shortcut is to borrow Marikina's
 * 15/16/18 m, but those belong to a different river at a different gauge, and
 * printing them here would be worse than printing nothing: a resident comparing
 * a real reading against a wrong threshold draws a wrong conclusion.
 *
 * Alert levels are always a solid badge or banner with a number and a word, never
 * a map fill (design.md Section 3.4). This gauge is the badge form.
 */

export interface AlertLevelIndicatorProps {
  level: AlertLevel;
  currentValueM?: number | null;
  thresholds?: RiverThresholds | null;
  className?: string;
  onDark?: boolean;
}

const SEGMENTS = [
  {
    level: 1 as const,
    label: "Prepare",
    active: "bg-alert-1",
    key: "level_1_m" as const,
  },
  {
    level: 2 as const,
    label: "Evacuate",
    active: "bg-alert-2",
    key: "level_2_m" as const,
  },
  { level: 3 as const, label: "Forced", active: "bg-alert-3", key: "level_3_m" as const },
];

export function AlertLevelIndicator({
  level,
  currentValueM,
  thresholds,
  className,
  onDark = false,
}: AlertLevelIndicatorProps) {
  const hasThresholds =
    thresholds != null &&
    (thresholds.level_1_m != null ||
      thresholds.level_2_m != null ||
      thresholds.level_3_m != null);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="flex gap-1"
        role="img"
        aria-label={
          level === 0
            ? "River alert level: Normal"
            : `River alert level ${level} of 3${currentValueM != null ? `, currently ${currentValueM} metres` : ""}`
        }
      >
        {SEGMENTS.map((segment) => {
          const reached = level >= segment.level;
          return (
            <div key={segment.level} className="flex flex-1 flex-col gap-1.5">
              <span
                className={cn(
                  "block h-2 rounded-full",
                  reached ? segment.active : onDark ? "bg-white/15" : "bg-neutral-200",
                )}
              />
              <span
                className={cn(
                  "text-caption font-semibold",
                  reached
                    ? onDark
                      ? "text-white"
                      : "text-neutral-800"
                    : onDark
                      ? "text-primary-100/50"
                      : "text-neutral-400",
                )}
              >
                {segment.level} · {segment.label}
              </span>
              {hasThresholds ? (
                <span
                  className={cn(
                    "text-caption tabular",
                    onDark ? "text-primary-100/60" : "text-neutral-500",
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

      {!hasThresholds ? (
        <p
          className={cn(
            "text-caption",
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
