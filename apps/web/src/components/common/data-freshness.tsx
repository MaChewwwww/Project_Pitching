"use client";

import * as React from "react";
import { Clock, RadioTower, TriangleAlert } from "lucide-react";

import { useRelativeTime } from "@/hooks/use-relative-time";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReadingSource } from "@/lib/api/public-types";

/**
 * When a reading was taken, where it came from, and whether it is too old to
 * trust (FR-WX-010, FR-WX-011, BR-3.8).
 *
 * design.md's third principle: "a number with no age is a lie waiting to happen."
 * This component is the reason no reading on the public site is ever rendered
 * bare.
 *
 * **Stale data is marked, not hidden.** A 90-minute-old river level is still the
 * best information available; blanking it would leave the resident with nothing.
 *
 * Client-rendered solely so the relative time is hydration-safe — see
 * `use-relative-time`.
 */

const SOURCE_LABEL: Record<ReadingSource, string> = {
  open_meteo: "Open-Meteo",
  pagasa: "DOST-PAGASA",
  manual: "Entered by barangay staff",
};

export interface DataFreshnessProps {
  observedAt: string;
  source: ReadingSource;
  ageMinutes: number;
  isStale: boolean;
  station?: string | null;
  staleAfterMinutes?: number;
  variant?: "inline" | "block";
  onDark?: boolean;
  className?: string;
}

export function DataFreshness({
  observedAt,
  source,
  ageMinutes,
  isStale,
  station,
  staleAfterMinutes,
  variant = "inline",
  onDark = false,
  className,
}: DataFreshnessProps) {
  const relative = useRelativeTime(observedAt, ageMinutes);
  const muted = onDark ? "text-primary-100/70" : "text-neutral-500";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1",
        variant === "block" && "flex-col items-start gap-1",
        className,
      )}
    >
      <span className={cn("text-caption inline-flex items-center gap-1.5 font-medium", muted)}>
        {!isStale ? (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
        ) : (
          <Clock aria-hidden className="size-3 text-warning shrink-0" />
        )}
        <time dateTime={observedAt} title={formatPhtDateTime(observedAt)}>
          Updated {relative}
        </time>
      </span>

      <span className={cn("text-caption inline-flex items-center gap-1", muted)}>
        <RadioTower aria-hidden className="size-3" />
        {SOURCE_LABEL[source]}
        {station ? ` · ${station}` : null}
      </span>

      {isStale ? (
        <span className="text-caption border-warning-border bg-warning-bg text-warning inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-semibold">
          <TriangleAlert aria-hidden className="size-3" />
          Stale
          {staleAfterMinutes ? (
            <span className="font-normal">— older than {staleAfterMinutes} min</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
