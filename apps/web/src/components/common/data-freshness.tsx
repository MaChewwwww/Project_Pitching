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

const SOURCE_LABEL: Record<ReadingSource, { name: string; full: string }> = {
  open_meteo: { name: "Open-Meteo", full: "Open-Meteo Weather API" },
  pagasa: { name: "DOST-PAGASA", full: "DOST-PAGASA River Station" },
  manual: { name: "Staff Entry", full: "Barangay Staff Entry" },
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
}: DataFreshnessProps) {
  const relative = useRelativeTime(observedAt, ageMinutes);
  const muted = onDark ? "text-primary-100/70" : "text-neutral-500";
  const sourceMeta = SOURCE_LABEL[source] || { name: source, full: source };

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-x-2 gap-y-1",
        variant === "block" && "flex-col items-start gap-1",
        className,
      )}
    >
      {/* Updated Time Badge */}
      <span className={cn("text-caption inline-flex items-center gap-1.5 font-semibold", muted)}>
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

      {/* Source Tag Badge */}
      <span
        className={cn(
          "text-caption inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-neutral-600 border-neutral-200/80 bg-neutral-50/90 shadow-2xs ml-auto",
          onDark && "border-white/10 bg-white/10 text-white"
        )}
      >
        <Database aria-hidden className="size-3 text-sky-500 shrink-0" />
        <span>Source: {sourceMeta.full}</span>
        {showStation && station ? ` · ${station}` : null}
      </span>

      {/* Stale Warning Badge */}
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
