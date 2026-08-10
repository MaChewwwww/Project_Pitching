"use client";

import * as React from "react";
import { Clock, Database, TriangleAlert } from "lucide-react";

import { useRelativeTime } from "@/hooks/use-relative-time";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReadingSource } from "@/lib/api/public-types";

/**
 * When a reading was taken, where it came from, and whether it is too old to
 * trust (FR-WX-010, FR-WX-011, BR-3.8).
 */

const SOURCE_LABEL: Record<ReadingSource, string> = {
  open_meteo: "Open-Meteo",
  pagasa: "DOST-PAGASA",
  manual: "Staff Entry",
};

export interface DataFreshnessProps {
  observedAt: string;
  source: ReadingSource;
  ageMinutes: number;
  isStale: boolean;
  station?: string | null;
  showStation?: boolean;
  staleAfterMinutes?: number;
  variant?: "inline" | "block";
  onDark?: boolean;
  className?: string;
  showStaleBadge?: boolean;
}

export function DataFreshness({
  observedAt,
  source,
  ageMinutes,
  isStale,
  station,
  showStation = true,
  staleAfterMinutes,
  variant = "inline",
  onDark = false,
  className,
  showStaleBadge = false,
}: DataFreshnessProps) {
  const relative = useRelativeTime(observedAt, ageMinutes);
  const sourceLabel = SOURCE_LABEL[source] || source;

  const threshold = staleAfterMinutes || 30;
  const isWarning = isStale || ageMinutes > threshold;
  const isSevere = isWarning && ageMinutes > threshold * 2;

  let dotPingBg = "bg-emerald-400";
  let dotBg = "bg-emerald-500";
  let textColor = onDark ? "text-primary-100/70" : "text-neutral-500";

  if (isSevere) {
    dotPingBg = "bg-red-400";
    dotBg = "bg-red-500";
    textColor = onDark ? "text-red-300 font-semibold" : "text-red-600 font-semibold";
  } else if (isWarning) {
    dotPingBg = "bg-amber-400";
    dotBg = "bg-amber-500";
    textColor = onDark ? "text-amber-300 font-semibold" : "text-amber-600 font-semibold";
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-x-2 gap-y-1 flex-nowrap",
        variant === "block" && "flex-col items-start gap-1",
        className,
      )}
    >
      {/* Updated Time Badge */}
      <span className={cn("text-caption inline-flex items-center gap-1.5 font-semibold shrink-0 whitespace-nowrap", textColor)}>
        <span className="relative flex size-2 shrink-0">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", dotPingBg)} />
          <span className={cn("relative inline-flex size-2 rounded-full", dotBg)} />
        </span>
        <time dateTime={observedAt} title={formatPhtDateTime(observedAt)}>
          Updated {relative}
        </time>
      </span>

      {/* Source Tag Badge */}
      <span
        className={cn(
          "text-caption inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-neutral-600 border-neutral-200/80 bg-neutral-50/90 shadow-2xs ml-auto shrink-0 whitespace-nowrap",
          onDark && "border-white/10 bg-white/10 text-white"
        )}
      >
        <Database aria-hidden className="size-3 text-sky-500 shrink-0" />
        <span>{sourceLabel}</span>
        {showStation && station ? ` · ${station}` : null}
      </span>

      {/* Stale Warning Badge — Hidden per user request */}
      {showStaleBadge && isStale ? (
        <span className="text-caption border-warning-border bg-warning-bg text-warning inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-semibold shrink-0 whitespace-nowrap">
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
