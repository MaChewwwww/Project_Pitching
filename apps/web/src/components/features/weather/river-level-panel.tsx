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
 *
 * **This panel never goes blank.** When the current fetch fails it falls back to
 * `last_known_good` and says how old it is — NFR-AVL-003 and FR-WX-012 both
 * require that, because an old river level is still information and an empty
 * panel is not.
 *
 * The threshold heights are an open item (BRD OI-4), which `AlertLevelIndicator`
 * handles by saying so rather than inventing metres.
 */

export function RiverLevelPanel({
  river,
  className,
  onDark = false,
}: {
  river: PublicRiverLevel;
  className?: string;
  onDark?: boolean;
}) {
  const reading = river.reading ?? river.last_known_good;
  const usingFallback = river.reading == null && river.last_known_good != null;

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
      className={cn("h-full", className)}
    >
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "text-overline inline-flex items-center gap-1.5",
              onDark ? "text-primary-300" : "text-neutral-500",
            )}
          >
            <Waves aria-hidden className="size-3" />
            River level
          </span>
          <StatusBadge kind="alert" level={river.alert_level} className="shrink-0" />
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-display-md tabular",
              onDark ? "text-white" : "text-neutral-900",
            )}
          >
            {reading.value}
          </span>
          <span
            className={cn("text-h3", onDark ? "text-primary-200" : "text-neutral-500")}
          >
            {reading.unit}
          </span>
        </div>

        {usingFallback ? (
          <p
            className={cn(
              "text-caption border-warning-border bg-warning-bg/60 rounded-md border p-2",
              onDark ? "text-neutral-800" : "text-neutral-700",
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
        />

        <div className="mt-auto flex flex-col gap-2">
          <DataFreshness
            observedAt={reading.observed_at}
            source={reading.source}
            station={reading.station}
            ageMinutes={reading.age_minutes}
            isStale={reading.is_stale || river.is_stale}
            staleAfterMinutes={reading.stale_after_minutes}
            onDark={onDark}
          />
          <Attribution onDark={onDark} disclaimer="warning-authority" />
        </div>
      </CardContent>
    </Card>
  );
}
