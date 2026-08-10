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
 * Current conditions and dual-metric hourly forecast (FR-PUB-004, FR-WX-001/002).
 */

const METRIC_META: Record<
  ReadingMetric,
  { label: string; icon: typeof CloudRain; color: string; bg: string }
> = {
  temperature: { label: "Temperature", icon: Thermometer, color: "text-amber-600", bg: "bg-amber-50/70 border-amber-200/60" },
  humidity: { label: "Humidity", icon: Droplets, color: "text-blue-600", bg: "bg-blue-50/70 border-blue-200/60" },
  rainfall: { label: "Rainfall", icon: CloudRain, color: "text-sky-600", bg: "bg-sky-50/70 border-sky-200/60" },
  precipitation_probability: { label: "Chance of rain", icon: Umbrella, color: "text-indigo-600", bg: "bg-indigo-50/70 border-indigo-200/60" },
  heat_index: { label: "Heat index", icon: Wind, color: "text-orange-600", bg: "bg-orange-50/70 border-orange-200/60" },
  river_level: { label: "River level", icon: CloudRain, color: "text-emerald-600", bg: "bg-emerald-50/70 border-emerald-200/60" },
};

export function WeatherPanel({
  weather,
  className,
}: {
  weather: PublicWeatherCurrent;
  className?: string;
}) {
  // Pair forecast array by valid_at timestamp to display both rainfall (mm) and rain chance (%)
  const hourlyMap = new Map<string, { timeIso: string; rainfall: number; probability: number }>();
  for (const point of weather.forecast) {
    const key = point.valid_at;
    const existing = hourlyMap.get(key) || { timeIso: key, rainfall: 0, probability: 0 };
    if (point.metric === "rainfall") {
      existing.rainfall = point.value;
    } else if (point.metric === "precipitation_probability") {
      existing.probability = Math.round(point.value);
    }
    hourlyMap.set(key, existing);
  }

  const hourlyForecast = Array.from(hourlyMap.values()).slice(0, 6);
  const peakRainfall = Math.max(...hourlyForecast.map((f) => f.rainfall), 1);

  return (
    <Card radius="xl" className={cn("h-full border border-neutral-200/80 shadow-sm transition-all duration-300 hover:shadow-md", className)}>
      <CardContent className="flex h-full flex-col gap-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {weather.readings.map((reading: PublicReading) => {
            const meta = METRIC_META[reading.metric];
            const Icon = meta.icon;
            return (
              <div
                key={reading.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                  meta.bg
                )}
              >
                <span className="text-overline inline-flex items-center gap-1.5 font-bold uppercase text-neutral-600">
                  <Icon aria-hidden className={cn("size-4", meta.color)} />
                  {meta.label}
                </span>
                <span className="text-h2 tabular font-black text-neutral-900">
                  {reading.value}
                  <span className="text-body ml-1 font-normal text-neutral-500">
                    {reading.unit}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Dual-Metric Hourly Prediction & Chance of Rain Strip */}
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/50 to-indigo-50/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-overline inline-flex items-center gap-1.5 font-bold tracking-wider text-sky-900 uppercase">
              <Umbrella className="size-4 text-sky-600" />
              Hourly Prediction &amp; Rain Chance
            </span>
            <span className="text-caption font-semibold text-sky-700/80">
              Next 18 Hours
            </span>
          </div>

          <div className="flex h-36 items-end gap-2 pt-2">
            {hourlyForecast.map((item, i) => {
              const hour = new Intl.DateTimeFormat("en-PH", {
                timeZone: "Asia/Manila",
                hour: "numeric",
                hour12: true,
              }).format(new Date(item.timeIso));

              const heightPct = Math.max(12, (item.rainfall / peakRainfall) * 100);

              return (
                <div
                  key={`${item.timeIso}-${i}`}
                  className="group flex flex-1 flex-col items-center justify-between h-full rounded-xl p-1.5 transition-all duration-200 hover:-translate-y-1 hover:bg-white/80 hover:shadow-sm"
                >
                  {/* Rainfall Visual Bar & Value (TOP) */}
                  <div className="flex flex-col items-center justify-end w-full flex-1 gap-1 py-1">
                    <span className="text-[11px] font-semibold tabular text-neutral-600 opacity-80 group-hover:opacity-100">
                      {item.rainfall} mm
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-sky-500 via-sky-400 to-indigo-400 shadow-xs transition-all duration-300 group-hover:from-sky-600 group-hover:to-indigo-500"
                      style={{ height: `${heightPct}%` }}
                      aria-hidden
                    />
                  </div>

                  {/* Hour Label (MIDDLE) */}
                  <span className="text-caption font-bold text-neutral-700 text-[11px]">
                    {hour}
                  </span>

                  {/* Rain Chance % Badge (BOTTOM - below hour label) */}
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100/90 px-1.5 py-0.5 text-[10px] font-black text-sky-800 border border-sky-200/60">
                      <Droplets className="size-2.5 text-sky-600" />
                      {item.probability}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Freshness Footer */}
        {weather.observed_at && weather.source ? (
          <DataFreshness
            className="mt-auto pt-1"
            observedAt={weather.observed_at}
            source={weather.source}
            ageMinutes={weather.readings[0]?.age_minutes ?? 0}
            isStale={weather.is_stale}
            staleAfterMinutes={weather.readings[0]?.stale_after_minutes}
          />
        ) : (
          <p className="text-caption mt-auto text-neutral-500">
            No weather reading available yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
