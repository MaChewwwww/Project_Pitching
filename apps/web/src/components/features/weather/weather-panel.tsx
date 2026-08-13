"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Droplets,
  ShieldAlert,
  SunMedium,
  Thermometer,
  ThermometerSun,
  Umbrella,
  Wind,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { DataFreshness } from "@/components/common/data-freshness";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  PublicForecastPoint,
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
    label: "Heat Index",
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

type ForecastMetricTab = "rain" | "heat";
type ForecastHorizon = "hourly" | "daily";

function rainSeverity(rainfall: number) {
  if (rainfall >= 7.6) {
    return { label: "Heavy Rain", icon: CloudLightning, color: "text-indigo-700" };
  }
  if (rainfall >= 2.5) {
    return { label: "Moderate Rain", icon: CloudRain, color: "text-sky-700" };
  }
  return { label: "Light Rain", icon: CloudDrizzle, color: "text-sky-600" };
}

function heatSeverity(heatIndex: number) {
  if (heatIndex >= 42) {
    return { label: "Danger", icon: AlertTriangle, color: "text-red-700" };
  }
  if (heatIndex >= 33) {
    return { label: "Extreme Caution", icon: ThermometerSun, color: "text-orange-700" };
  }
  return { label: "Caution", icon: SunMedium, color: "text-amber-700" };
}

function metricSeverity(metric: ReadingMetric, value: number) {
  if (metric === "rainfall") return rainSeverity(value);
  if (metric === "heat_index") return heatSeverity(value);
  return null;
}

function formatForecastLabel(validAt: string, horizon: ForecastHorizon) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    ...(horizon === "hourly" ? { hour: "numeric", hour12: true } : { weekday: "short" }),
  }).format(new Date(validAt));
}

function buildForecastSeries(
  points: PublicForecastPoint[],
  metric: ForecastMetricTab,
  horizon: ForecastHorizon,
) {
  const byTime = new Map<
    string,
    { validAt: string; rainfall: number; probability: number; heatIndex: number }
  >();
  for (const point of points) {
    if (point.horizon !== horizon) continue;
    const current = byTime.get(point.valid_at) ?? {
      validAt: point.valid_at,
      rainfall: 0,
      probability: 0,
      heatIndex: 0,
    };
    if (point.metric === "rainfall") current.rainfall = point.value;
    if (point.metric === "precipitation_probability") current.probability = point.value;
    if (point.metric === "heat_index") current.heatIndex = point.value;
    byTime.set(point.valid_at, current);
  }

  return Array.from(byTime.values()).slice(0, horizon === "hourly" ? 6 : 7);
}

export function WeatherPanel({
  weather,
  className,
}: {
  weather: PublicWeatherCurrent;
  className?: string;
}) {
  const [forecastMetric, setForecastMetric] = React.useState<ForecastMetricTab>("rain");
  const [forecastHorizon, setForecastHorizon] = React.useState<ForecastHorizon>("hourly");
  const tcwsReading = weather.readings.find((r) => r.metric === "tcws_signal");
  const signalLevel = tcwsReading ? Math.round(Number(tcwsReading.value)) : 0;
  const tcwsInfo = TCWS_META[signalLevel] || TCWS_META[0];

  const forecastSeries = buildForecastSeries(
    weather.forecast,
    forecastMetric,
    forecastHorizon,
  );
  const barPeak = Math.max(
    ...forecastSeries.map((point) =>
      forecastMetric === "rain" ? point.rainfall : point.heatIndex,
    ),
    1,
  );
  const forecastTheme =
    forecastMetric === "rain"
      ? {
          panel: "border-sky-100 bg-gradient-to-b from-sky-50/50 to-indigo-50/20",
          tabShell: "border-sky-200/70 bg-white/70",
          select:
            "border-sky-200/80 text-sky-900 focus:border-sky-600 focus:ring-sky-500/20",
          selectIcon: "text-sky-600",
        }
      : {
          panel: "border-orange-100 bg-gradient-to-b from-orange-50/50 to-amber-50/20",
          tabShell: "border-orange-200/70 bg-white/70",
          select:
            "border-orange-200/80 text-orange-900 focus:border-orange-600 focus:ring-orange-500/20",
          selectIcon: "text-orange-600",
        };
  const readingsByMetric = new Map(
    weather.readings.map((reading) => [reading.metric, reading]),
  );
  const peaksByMetric = new Map(
    weather.peak_readings.map((reading) => [reading.metric, reading]),
  );
  const standardReadings = (
    ["temperature", "rainfall", "humidity", "heat_index"] as const
  ).flatMap((metric) => {
    const reading = readingsByMetric.get(metric);
    return reading ? [{ reading, peak: peaksByMetric.get(metric) }] : [];
  });

  return (
    <TooltipProvider>
      <Card
        radius="xl"
        className={cn(
          "h-full border border-neutral-200/80 shadow-sm transition-all duration-300 hover:shadow-md",
          className,
        )}
      >
        <CardContent className="flex h-full flex-col gap-4">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-[0.82fr_0.82fr_1.18fr_1.18fr]">
            {standardReadings.map(({ reading, peak }) => {
              const meta = METRIC_META[reading.metric];
              const severity = metricSeverity(reading.metric, Number(reading.value));
              const Icon = severity?.icon ?? meta.icon;
              const orderClass: Partial<Record<ReadingMetric, string>> = {
                temperature: "order-1 xl:order-1",
                rainfall: "order-2 xl:order-3",
                humidity: "order-3 xl:order-2",
                heat_index: "order-4 xl:order-4",
              };
              const hasPeak =
                reading.metric === "rainfall" || reading.metric === "heat_index";
              const card = (
                <div
                  className={cn(
                    "flex min-w-0 flex-col gap-1 rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm sm:p-3",
                    hasPeak && "cursor-help",
                    orderClass[reading.metric],
                    meta.bg,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-overline inline-flex min-w-0 items-center gap-1.5 font-bold text-neutral-600 uppercase">
                      <Icon
                        aria-hidden
                        className={cn("size-4", severity?.color ?? meta.color)}
                      />
                      {meta.label}
                    </span>
                    {hasPeak ? (
                      <span className="text-caption shrink-0 font-semibold text-neutral-500">
                        <span className="hidden sm:inline">Peak Today</span>
                        <span className="sm:hidden">Peak</span>
                      </span>
                    ) : null}
                  </div>
                  {hasPeak ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
                      <span className="tabular sm:text-h2 min-w-0 truncate text-xl font-black text-neutral-950">
                        {reading.value}
                        <span className="sm:text-body ml-1 text-sm font-normal text-neutral-500">
                          {reading.unit}
                        </span>
                      </span>
                      <span className="tabular sm:text-h3 border-l border-black/10 pl-2 text-lg font-bold whitespace-nowrap text-neutral-800 sm:pl-3">
                        {peak ? peak.value : "—"}
                        {peak ? (
                          <span className="sm:text-body ml-1 text-sm font-normal text-neutral-500">
                            {peak.unit}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <span className="tabular sm:text-h2 text-xl font-black text-neutral-900">
                      {reading.value}
                      <span className="sm:text-body ml-1 text-sm font-normal text-neutral-500">
                        {reading.unit}
                      </span>
                    </span>
                  )}
                </div>
              );
              if (!hasPeak || !severity) {
                return <React.Fragment key={reading.id}>{card}</React.Fragment>;
              }

              return (
                <Tooltip key={reading.id}>
                  <TooltipTrigger asChild>{card}</TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-60 leading-relaxed whitespace-normal"
                  >
                    <span className="font-bold">{severity.label}.</span> Current{" "}
                    {meta.label.toLowerCase()} is {reading.value} {reading.unit}
                    {peak ? `; today’s peak is ${peak.value} ${peak.unit}.` : "."}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Forecast strip: metric tabs, horizon selector, and severity-aware chart */}
          <div
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-3.5 sm:p-4",
              forecastTheme.panel,
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
              <div
                className={cn(
                  "inline-flex rounded-lg border p-1 shadow-2xs",
                  forecastTheme.tabShell,
                )}
                role="tablist"
                aria-label="Forecast metric"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={forecastMetric === "rain"}
                  onClick={() => setForecastMetric("rain")}
                  className={cn(
                    "text-caption inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                    forecastMetric === "rain"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-sky-800 hover:bg-sky-100/80",
                  )}
                >
                  <Umbrella aria-hidden className="size-3.5" />
                  Rain Chance
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={forecastMetric === "heat"}
                  onClick={() => setForecastMetric("heat")}
                  className={cn(
                    "text-caption inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                    forecastMetric === "heat"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-orange-800 hover:bg-orange-100/70",
                  )}
                >
                  <ThermometerSun aria-hidden className="size-3.5" />
                  Heat Index
                </button>
              </div>
              <Select
                value={forecastHorizon}
                onValueChange={(value) => setForecastHorizon(value as ForecastHorizon)}
              >
                <SelectTrigger
                  className={cn(
                    "h-8 rounded-lg bg-white font-semibold focus:ring-2",
                    forecastTheme.select,
                  )}
                >
                  <Clock
                    aria-hidden
                    className={cn("size-3.5", forecastTheme.selectIcon)}
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  className="w-[var(--radix-select-trigger-width)] min-w-32"
                >
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="-mx-1 scrollbar-none overflow-x-auto px-1 pt-2 sm:mx-0 sm:px-0">
              <div className="flex h-36 min-w-[310px] items-end gap-1.5 sm:min-w-0 sm:gap-2">
                {forecastSeries.length === 0 ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-sky-200 bg-white/45 px-4 text-center">
                    <CloudRain aria-hidden className="size-5 text-sky-500" />
                    <span className="text-caption font-semibold text-sky-900">
                      {forecastHorizon === "daily"
                        ? "Daily outlook is being refreshed."
                        : "Hourly outlook is being refreshed."}
                    </span>
                  </div>
                ) : (
                  forecastSeries.map((item) => {
                    const chartValue =
                      forecastMetric === "rain" ? item.rainfall : item.heatIndex;
                    const heightPct = Math.max(12, (chartValue / barPeak) * 100);
                    const severity =
                      forecastMetric === "rain"
                        ? rainSeverity(item.rainfall)
                        : heatSeverity(item.heatIndex);
                    const SeverityIcon = severity.icon;
                    const chartValueLabel =
                      forecastMetric === "rain"
                        ? `${Math.round(item.probability)}%`
                        : `${item.heatIndex} °C`;
                    const tooltip =
                      forecastMetric === "rain"
                        ? `${severity.label}: ${Math.round(item.probability)}% rain chance${item.rainfall > 0 ? `, ${item.rainfall} mm expected` : ""}.`
                        : `${severity.label}: heat index expected to reach ${item.heatIndex} °C.`;

                    return (
                      <Tooltip key={item.validAt}>
                        <TooltipTrigger asChild>
                          <div
                            tabIndex={0}
                            role="img"
                            aria-label={`${formatForecastLabel(item.validAt, forecastHorizon)}: ${tooltip}`}
                            className="group flex h-full min-w-[44px] flex-1 cursor-help flex-col items-center justify-between rounded-xl p-1 transition-all duration-200 hover:-translate-y-1 hover:bg-white/80 hover:shadow-sm focus-visible:-translate-y-1 focus-visible:bg-white/80 focus-visible:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 sm:min-w-0 sm:p-1.5"
                          >
                            <div className="flex w-full flex-1 flex-col items-center justify-end gap-1 py-1">
                              <span className="tabular inline-flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap text-neutral-600 opacity-80 group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-[11px]">
                                <SeverityIcon
                                  aria-hidden
                                  className={cn("size-3", severity.color)}
                                />
                                {chartValueLabel}
                              </span>
                              <div
                                className={cn(
                                  "w-full max-w-[24px] rounded-t-md shadow-xs transition-all duration-300 sm:max-w-[28px]",
                                  forecastMetric === "rain"
                                    ? "bg-gradient-to-t from-sky-500 via-sky-400 to-indigo-400 group-hover:from-sky-600 group-hover:to-indigo-500"
                                    : "bg-gradient-to-t from-amber-500 via-orange-400 to-red-400 group-hover:from-amber-600 group-hover:to-red-500",
                                )}
                                style={{ height: `${heightPct}%` }}
                                aria-hidden
                              />
                            </div>

                            <span className="text-caption text-[10px] font-bold whitespace-nowrap text-neutral-700 sm:text-[11px]">
                              {formatForecastLabel(item.validAt, forecastHorizon)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={8}
                          className="max-w-60 leading-relaxed whitespace-normal"
                        >
                          <span className="block font-bold">{severity.label}</span>
                          {tooltip}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                )}
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
                <strong className="font-extrabold text-neutral-900">
                  {tcwsInfo.wind}
                </strong>
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
    </TooltipProvider>
  );
}
