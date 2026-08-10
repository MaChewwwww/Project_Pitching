import * as React from "react";
import { Waves } from "lucide-react";

import { AlertLevelIndicator } from "@/components/common/alert-level-indicator";
import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { DataFreshness } from "@/components/common/data-freshness";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import type { PublicRiverLevel } from "@/lib/api/public-types";

/**
 * River level and the current alert level (FR-WX-004/005/010/011/012).
 */

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

          <div className="flex items-baseline gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 p-4">
            <span
              className={cn(
                "tabular font-black tracking-tight",
                compact ? "text-display-md" : "text-display-lg",
                onDark ? "text-white" : "text-neutral-900"
              )}
            >
              {reading.value}
            </span>
            <span
              className={cn("text-h2 font-bold", onDark ? "text-primary-200" : "text-emerald-700")}
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
        </div>

        <div className={cn("mt-auto flex flex-col pt-2 border-t border-neutral-100", compact ? "gap-1 pt-0.5" : "gap-2")}>
          <Attribution onDark={onDark} disclaimer="warning-authority" short={compact} />
          <DataFreshness
            observedAt={reading.observed_at}
            source={reading.source}
            showStation={false}
            ageMinutes={reading.age_minutes}
            isStale={reading.is_stale || river.is_stale}
            staleAfterMinutes={reading.stale_after_minutes}
            onDark={onDark}
          />
        </div>
      </CardContent>
    </Card>
  );
}
