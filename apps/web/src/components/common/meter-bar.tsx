import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A progress bar (evacuation occupancy, donation drive progress).
 *
 * Exists instead of `ui/progress` because that primitive carries `"use client"`,
 * and pulling a client boundary into the landing page for a static bar costs
 * bundle size on exactly the page that has the tightest budget (NFR-PERF-006).
 * This renders from a server component and ships no JavaScript at all.
 *
 * `aria-valuetext` carries the real quantities, so a screen reader hears
 * "285 of 400 kg" rather than "71 percent" — which is the number a person
 * bringing rice to the barangay hall actually needs.
 */

export interface MeterBarProps {
  value: number;
  max: number;
  /** Names what is being measured. Required — an unlabelled meter is not usable. */
  label: string;
  valueText?: string;
  tone?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const TONE = {
  primary: "bg-primary-600",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export function MeterBar({
  value,
  max,
  label,
  valueText,
  tone = "primary",
  className,
}: MeterBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText ?? `${value} of ${max}`}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-200", className)}
    >
      <div
        className={cn("h-full rounded-full", TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
