import * as React from "react";
import { CloudRain, Droplets, Thermometer, Umbrella, Wind } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { DataFreshness } from "@/components/common/data-freshness";
import { cn } from "@/lib/utils";
import type {
  PublicReading,
  PublicWeatherCurrent,
  ReadingMetric,
} from "@/lib/api/public-types";

/**
 * Current conditions and short-term forecast (FR-PUB-004, FR-WX-001/002).
 *
 * Every reading carries its source and observation time (FR-WX-010) — the whole
 * panel is built so that no number can appear without one.
 *
 * The forecast strip is a plain bar chart in CSS rather than Recharts, which
 * NFR-PERF-007 keeps out of the landing bundle entirely. Six bars do not justify
 * a charting library.
 */

const METRIC_META: Record<ReadingMetric, { label: string; icon: typeof CloudRain }> = {
  temperature: { label: "Temperature", icon: Thermometer },
  humidity: { label: "Humidity", icon: Droplets },
  rainfall: { label: "Rainfall", icon: CloudRain },
  precipitation_probability: { label: "Chance of rain", icon: Umbrella },
  heat_index: { label: "Heat index", icon: Wind },
  river_level: { label: "River level", icon: CloudRain },
};

export function WeatherPanel({
  weather,
  className,
}: {
  weather: PublicWeatherCurrent;
  className?: string;
}) {
  const peak = Math.max(...weather.forecast.map((f) => f.value), 1);

  return (
    <Card radius="xl" className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {weather.readings.map((reading: PublicReading) => {
            const meta = METRIC_META[reading.metric];
            const Icon = meta.icon;
            return (
              <div key={reading.id} className="flex flex-col gap-1">
                <span className="text-overline inline-flex items-center gap-1.5 text-neutral-500">
                  <Icon aria-hidden className="size-3" />
                  {meta.label}
                </span>
                <span className="text-h2 tabular text-neutral-900">
                  {reading.value}
                  <span className="text-body ml-0.5 font-normal text-neutral-500">
                    {reading.unit}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-neutral-500">Rainfall, next 18 hours</span>
          <div className="flex h-24 items-end gap-2">
            {weather.forecast.map((point) => {
              const hour = new Intl.DateTimeFormat("en-PH", {
                timeZone: "Asia/Manila",
                hour: "numeric",
                hour12: true,
              }).format(new Date(point.valid_at));
              return (
                <div
                  key={point.valid_at}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-caption tabular text-neutral-600">
                    {point.value}
                  </span>
                  <div
                    className="bg-primary-400 w-full rounded-t-sm"
                    style={{ height: `${Math.max(6, (point.value / peak) * 100)}%` }}
                    // The value is already in the label above, so the bar itself
                    // is decoration to a screen reader.
                    aria-hidden
                  />
                  <span className="text-caption text-neutral-500">{hour}</span>
                </div>
              );
            })}
          </div>
          <p className="sr-only">
            Forecast rainfall in millimetres:{" "}
            {weather.forecast
              .map(
                (p) =>
                  `${new Intl.DateTimeFormat("en-PH", {
                    timeZone: "Asia/Manila",
                    hour: "numeric",
                    hour12: true,
                  }).format(new Date(p.valid_at))}, ${p.value} millimetres`,
              )
              .join("; ")}
          </p>
        </div>

        <DataFreshness
          className="mt-auto"
          observedAt={weather.observed_at}
          source={weather.source}
          ageMinutes={weather.readings[0]?.age_minutes ?? 0}
          isStale={weather.is_stale}
          staleAfterMinutes={weather.readings[0]?.stale_after_minutes}
        />
      </CardContent>
    </Card>
  );
}
