import * as React from "react";
import {
  AlertTriangle,
  Clock,
  CloudRain,
  Droplets,
  ShieldAlert,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";

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
  temperature: {
    label: "Temperature",
    icon: Thermometer,
    color: "text-amber-600",
    bg: "bg-amber-50/70 border-amber-200/60",
  },
  humidity: {
    label: "Humidity",
    icon: Droplets,
    color: "text-blue-600",
    bg: "bg-blue-50/70 border-blue-200/60",
  },
  rainfall: {
    label: "Rainfall",
    icon: CloudRain,
    color: "text-sky-600",
    bg: "bg-sky-50/70 border-sky-200/60",
  },
  precipitation_probability: {
    label: "Chance of rain",
    icon: Umbrella,
    color: "text-indigo-600",
    bg: "bg-indigo-50/70 border-indigo-200/60",
  },
  heat_index: {
    label: "Today's Heat Index",
    icon: Wind,
    color: "text-orange-600",
    bg: "bg-orange-50/70 border-orange-200/60",
  },
  river_level: {
    label: "River level",
    icon: CloudRain,
    color: "text-emerald-600",
    bg: "bg-emerald-50/70 border-emerald-200/60",
  },
  tcws_signal: {
    label: "PAGASA TCWS",
    icon: ShieldAlert,
    color: "text-purple-600",
    bg: "bg-purple-50/70 border-purple-200/60",
  },
};

const TCWS_META: Record<
  number,
  { label: string; badgeBg: string; wind: string; threat: string; bgGradient: string }
> = {
  0: {
    label: "NO ACTIVE TCWS SIGNAL IN EFFECT",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    wind: "Normal / Light winds (0 – 38 km/h)",
    threat:
      "No Tropical Cyclone Wind Signal currently hoisted over Barangay San Jose / Rizal.",
    bgGradient: "from-emerald-50/60 via-teal-50/30 to-white",
  },
  1: {
    label: "PAGASA TCWS SIGNAL NO. 1",
    badgeBg: "bg-amber-500 text-white border-amber-600 font-extrabold animate-pulse",
    wind: "39 – 61 km/h (Strong Winds expected in 36 hrs)",
    threat:
      "Minimal to minor threat. Secure loose outdoor objects and monitor PAGASA advisories.",
    bgGradient: "from-amber-50 via-yellow-50/70 to-orange-50/30",
  },
  2: {
    label: "PAGASA TCWS SIGNAL NO. 2",
    badgeBg: "bg-orange-600 text-white border-orange-700 font-extrabold animate-pulse",
    wind: "62 – 88 km/h (Gale-Force Winds expected in 24 hrs)",
    threat: "Minor to moderate threat. Stay indoors, charge devices, classes suspended.",
    bgGradient: "from-orange-100/80 via-amber-50 to-red-50/40",
  },
  3: {
    label: "PAGASA TCWS SIGNAL NO. 3",
    badgeBg: "bg-red-600 text-white border-red-700 font-extrabold animate-bounce",
    wind: "89 – 117 km/h (Storm-Force Winds expected in 18 hrs)",
    threat:
      "Moderate to significant threat. Seek sturdy shelter; prepare for pre-emptive evacuation.",
    bgGradient: "from-red-100 via-rose-50 to-orange-100/50",
  },
  4: {
    label: "PAGASA TCWS SIGNAL NO. 4",
    badgeBg: "bg-rose-700 text-white border-rose-800 font-extrabold animate-bounce",
    wind: "118 – 184 km/h (Typhoon-Force Winds expected in 12 hrs)",
    threat: "Severe threat to life & property. Mandatory evacuation in progress.",
    bgGradient: "from-rose-150 via-red-100 to-purple-100/60",
  },
  5: {
    label: "PAGASA TCWS SIGNAL NO. 5",
    badgeBg:
      "bg-purple-800 text-white border-purple-900 font-extrabold animate-bounce ring-2 ring-purple-400",
    wind: "> 185 km/h (Super Typhoon-Force Winds expected in 12 hrs)",
    threat: "Extreme & catastrophic threat. Remain inside assigned evacuation centers.",
    bgGradient: "from-purple-100 via-rose-100 to-red-100",
  },
};

export function WeatherPanel({
  weather,
  className,
}: {
  weather: PublicWeatherCurrent;
  className?: string;
}) {
  const tcwsReading = weather.readings.find((r) => r.metric === "tcws_signal");
  const signalLevel = tcwsReading ? Math.round(Number(tcwsReading.value)) : 0;
  const tcwsInfo = TCWS_META[signalLevel] || TCWS_META[0];

  // Pair forecast array by valid_at timestamp to display both rainfall (mm) and rain chance (%)
  const hourlyMap = new Map<
    string,
    { timeIso: string; rainfall: number; probability: number }
  >();
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
  const standardReadings = weather.readings.filter(
    (r) => r.metric !== "tcws_signal" && r.metric !== "river_level",
  );

  return (
    <Card
      radius="xl"
      className={cn(
        "h-full border border-neutral-200/80 shadow-sm transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {standardReadings.map((reading: PublicReading) => {
            const meta = METRIC_META[reading.metric];
            const Icon = meta.icon;
            return (
              <div
                key={reading.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                  meta.bg,
                )}
              >
                <span className="text-overline inline-flex items-center gap-1.5 font-bold text-neutral-600 uppercase">
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
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/50 to-indigo-50/20 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
            <span className="text-overline inline-flex items-center gap-1.5 font-bold tracking-wider text-sky-900 uppercase">
              <Umbrella className="size-4 shrink-0 text-sky-600" />
              <span className="truncate">Hourly Prediction &amp; Rain Chance</span>
            </span>
            <span className="text-caption inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-200/60 bg-sky-100/90 px-2 py-0.5 font-bold text-sky-800 shadow-2xs">
              <Clock className="size-3 text-sky-600" />
              Next 18 Hours
            </span>
          </div>

          <div className="-mx-1 scrollbar-none overflow-x-auto px-1 pt-2 sm:mx-0 sm:px-0">
            <div className="flex h-36 min-w-[310px] items-end gap-1.5 sm:min-w-0 sm:gap-2">
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
                    className="group flex h-full min-w-[44px] flex-1 flex-col items-center justify-between rounded-xl p-1 transition-all duration-200 hover:-translate-y-1 hover:bg-white/80 hover:shadow-sm sm:min-w-0 sm:p-1.5"
                  >
                    {/* Rainfall Visual Bar & Value (TOP) */}
                    <div className="flex w-full flex-1 flex-col items-center justify-end gap-1 py-1">
                      <span className="tabular text-[10px] font-semibold whitespace-nowrap text-neutral-600 opacity-80 group-hover:opacity-100 sm:text-[11px]">
                        {item.rainfall} mm
                      </span>
                      <div
                        className="w-full max-w-[24px] rounded-t-md bg-gradient-to-t from-sky-500 via-sky-400 to-indigo-400 shadow-xs transition-all duration-300 group-hover:from-sky-600 group-hover:to-indigo-500 sm:max-w-[28px]"
                        style={{ height: `${heightPct}%` }}
                        aria-hidden
                      />
                    </div>

                    {/* Hour Label (MIDDLE) */}
                    <span className="text-caption text-[10px] font-bold whitespace-nowrap text-neutral-700 sm:text-[11px]">
                      {hour}
                    </span>

                    {/* Rain Chance % Badge (BOTTOM - below hour label) */}
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-200/60 bg-sky-100/90 px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap text-sky-800 sm:text-[10px]">
                        <Droplets className="size-2 text-sky-600 sm:size-2.5" />
                        {item.probability}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DOST-PAGASA Tropical Cyclone Wind Signal (TCWS #1 to #5) & Typhoon Watch Banner (2-Row Symmetrical Layout) */}
        <div
          className={cn(
            "mt-auto flex flex-col gap-2 rounded-2xl border bg-gradient-to-r p-2.5 shadow-2xs transition-all duration-300",
            tcwsInfo.bgGradient,
            signalLevel > 0 ? "border-amber-300 shadow-xs" : "border-emerald-200/80",
          )}
        >
          {/* Row 1: Title & Signal Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-1 sm:flex-nowrap">
            <div className="flex min-w-0 items-center gap-2">
              <ShieldAlert
                className={cn(
                  "size-4 shrink-0",
                  signalLevel > 0 ? "text-amber-600" : "text-emerald-600",
                )}
              />
              <span className="text-overline font-black tracking-wider text-neutral-900 uppercase">
                DOST-PAGASA Tropical Cyclone Wind Signal (TCWS)
              </span>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-2xs",
                tcwsInfo.badgeBg,
              )}
            >
              {tcwsInfo.label}
            </span>
          </div>

          {/* Row 2: Winds & Threat Advisory (Symmetrical & Horizontally Aligned) */}
          <div className="flex flex-col justify-between gap-2 rounded-xl border border-black/5 bg-white/80 px-3 py-2 text-xs sm:flex-row sm:items-center">
            <span className="shrink-0 font-semibold text-neutral-800">
              💨 Expected Winds:{" "}
              <strong className="font-extrabold text-neutral-900">{tcwsInfo.wind}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 sm:justify-end">
              <AlertTriangle
                className={cn(
                  "size-3.5 shrink-0",
                  signalLevel > 0 ? "text-amber-600" : "text-emerald-600",
                )}
              />
              <span>{tcwsInfo.threat}</span>
            </span>
          </div>
        </div>

        {/* Freshness Footer */}
        {weather.observed_at && weather.source ? (
          <DataFreshness
            className="pt-1"
            observedAt={weather.observed_at}
            source={weather.source}
            ageMinutes={weather.readings[0]?.age_minutes ?? 0}
            isStale={weather.is_stale || (weather.readings[0]?.age_minutes ?? 0) > 30}
            staleAfterMinutes={30}
          />
        ) : (
          <p className="text-caption text-neutral-500">
            No weather reading available yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
