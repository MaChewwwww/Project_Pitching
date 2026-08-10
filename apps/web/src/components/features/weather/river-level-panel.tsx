import * as React from "react";
import { Waves } from "lucide-react";

import { AlertLevelIndicator } from "@/components/common/alert-level-indicator";
import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { DataFreshness } from "@/components/common/data-freshness";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import type { AlertLevel, PublicRiverLevel } from "@/lib/api/public-types";

/**
 * River level and the current alert level (FR-WX-004/005/010/011/012).
 */

const MEASUREMENT_THEME: Record<AlertLevel, { bg: string; unit: string; val: string }> = {
  0: {
    bg: "border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/30",
    unit: "text-emerald-700",
    val: "text-neutral-900",
  },
  1: {
    bg: "border-amber-300/80 bg-gradient-to-r from-amber-50/90 to-yellow-50/40 shadow-2xs",
    unit: "text-amber-800 font-bold",
    val: "text-amber-950",
  },
  2: {
    bg: "border-orange-300/90 bg-gradient-to-r from-orange-50/90 to-amber-50/40 shadow-2xs",
    unit: "text-orange-800 font-bold",
    val: "text-orange-950",
  },
  3: {
    bg: "border-red-400 bg-gradient-to-r from-red-50 to-rose-50/40 shadow-xs",
    unit: "text-red-800 font-bold",
    val: "text-red-950",
  },
};

export function RiverLevelPanel({
  river,
  className,
  onDark = false,
  density = "full",
}: {
  river: PublicRiverLevel;
  className?: string;
  onDark?: boolean;
  density?: "full" | "compact";
}) {
  const reading = river.reading ?? river.last_known_good;
  const usingFallback = river.reading == null && river.last_known_good != null;
  const compact = density === "compact";
  const theme = MEASUREMENT_THEME[river.alert_level] ?? MEASUREMENT_THEME[0];

  if (!reading) {
    return (
      <Card radius="xl" className={className}>
        <CardContent>
          <EmptyState
            icon={Waves}
            size="sm"
            title="No river reading available"
            description="The gauge has not reported yet. Call the barangay hotline for the current situation."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      radius="xl"
      variant={onDark ? "dark" : "flat"}
      className={cn(
        "h-full border border-neutral-200/80 shadow-sm transition-all duration-300 hover:shadow-md",
        compact && "[--card-spacing:--spacing(4)]",
        className
      )}
    >
      <CardContent className={cn("flex h-full flex-col justify-between gap-5", compact ? "gap-2.5" : "gap-5")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-overline inline-flex items-center gap-1.5 font-bold uppercase tracking-wider",
                onDark ? "text-primary-300" : "text-emerald-800"
              )}
            >
              <Waves aria-hidden className="size-4 text-emerald-600 animate-pulse" />
              River Level Gauge
            </span>
            <StatusBadge kind="alert" level={river.alert_level} className="shrink-0 shadow-xs" />
          </div>

          {/* Dynamic Measurement Banner matching active alert stage */}
          <div
            className={cn(
              "flex items-baseline gap-2 rounded-2xl border p-4 transition-all duration-300",
              onDark ? "border-white/10 bg-white/10" : theme.bg
            )}
          >
            <span
              className={cn(
                "tabular font-black tracking-tight",
                compact ? "text-display-md" : "text-display-lg",
                onDark ? "text-white" : theme.val
              )}
            >
              {reading.value}
            </span>
            <span
              className={cn("text-h2 font-bold", onDark ? "text-primary-200" : theme.unit)}
            >
              {reading.unit}
            </span>
            {reading.station ? (
              <span className="ml-auto text-caption font-semibold text-neutral-500 max-sm:hidden">
                {reading.station}
              </span>
            ) : null}
          </div>

          {usingFallback ? (
            <p
              className={cn(
                "text-caption border-warning-border bg-warning-bg/60 rounded-xl border p-2.5 font-medium",
                onDark ? "text-neutral-800" : "text-neutral-700"
              )}
            >
              Showing the last reading we received. The gauge has not reported since.
            </p>
          ) : null}

          <AlertLevelIndicator
            level={river.alert_level}
            currentValueM={reading.value}
            thresholds={river.thresholds}
            onDark={onDark}
            explainMissingThresholds={!compact}
          />

          <Attribution onDark={onDark} disclaimer="warning-authority" short={compact} />
        </div>

        <div className={cn("mt-auto flex flex-col pt-2 border-t border-neutral-100", compact ? "gap-1 pt-0.5" : "gap-2")}>
          <DataFreshness
            observedAt={reading.observed_at}
            source={reading.source}
            showStation={false}
            ageMinutes={reading.age_minutes}
            isStale={reading.is_stale || river.is_stale || reading.age_minutes > 15}
            staleAfterMinutes={15}
            onDark={onDark}
          />
        </div>
      </CardContent>
    </Card>
  );
}
