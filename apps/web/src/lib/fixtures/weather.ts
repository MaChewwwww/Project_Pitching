import type {
  PublicForecastPoint,
  PublicReading,
  PublicRiverLevel,
  PublicWeatherCurrent,
} from "@/lib/api/public-types";
import { ageMinutes, hoursAgo, hoursAhead, minutesAgo } from "./clock";

/**
 * Weather and river readings (FR-WX-*, FR-PUB-004).
 *
 * Every reading carries its source and observation time, and computes its own
 * staleness — FR-WX-010 forbids a bare number, and FR-WX-011 requires an old one
 * to say so. `STALE_AFTER_MINUTES` mirrors `config.reading.stale_after_minutes`,
 * seeded at 45 in the foundation migration.
 */
const STALE_AFTER_MINUTES = 45;

let nextId = 1;

function reading(
  metric: PublicReading["metric"],
  value: number,
  unit: string,
  source: PublicReading["source"],
  observedAt: string,
  station: string | null = null,
): PublicReading {
  const age = ageMinutes(observedAt);
  return {
    id: nextId++,
    source,
    metric,
    value,
    unit,
    station,
    observed_at: observedAt,
    fetched_at: observedAt,
    age_minutes: age,
    is_stale: age > STALE_AFTER_MINUTES,
    stale_after_minutes: STALE_AFTER_MINUTES,
  };
}

const PAGASA_STATION = "Montalban (Rodriguez) River Gauge";

function forecast(
  hoursFromNow: number,
  metric: PublicForecastPoint["metric"],
  value: number,
  unit: string,
): PublicForecastPoint {
  return {
    valid_at: hoursAhead(hoursFromNow),
    metric,
    value,
    unit,
    horizon: "hourly",
    source: "open_meteo",
    fetched_at: minutesAgo(14),
  };
}

export const WEATHER_CURRENT: PublicWeatherCurrent = {
  readings: [
    reading("temperature", 27.4, "°C", "open_meteo", minutesAgo(14)),
    reading("humidity", 89, "%", "open_meteo", minutesAgo(14)),
    reading("rainfall", 12.6, "mm", "open_meteo", minutesAgo(14)),
    reading("precipitation_probability", 85, "%", "open_meteo", minutesAgo(14)),
    reading("heat_index", 31.2, "°C", "open_meteo", minutesAgo(14)),
  ],
  observed_at: minutesAgo(14),
  source: "open_meteo",
  is_stale: false,
  forecast: [
    forecast(3, "rainfall", 9.2, "mm"),
    forecast(6, "rainfall", 14.8, "mm"),
    forecast(9, "rainfall", 18.1, "mm"),
    forecast(12, "rainfall", 11.4, "mm"),
    forecast(15, "rainfall", 6.7, "mm"),
    forecast(18, "rainfall", 3.1, "mm"),
  ],
};

/**
 * River level.
 *
 * `thresholds` is **null on purpose**. The Level 1/2/3 river heights for this
 * station are an open item — the MDRRMO has not confirmed them (BRD OI-4). The
 * gauge therefore renders unlabelled segments and says so, rather than borrowing
 * Marikina's 15/16/18 m, which belong to a different river at a different station
 * and would be actively misleading here.
 *
 * `alert_level` is 2 because the fixture's active alert says so — in production
 * the API derives it by comparing the reading against those same thresholds.
 */
export const RIVER_LEVEL: PublicRiverLevel = {
  reading: reading("river_level", 13.42, "m", "pagasa", minutesAgo(22), PAGASA_STATION),
  alert_level: 2,
  thresholds: null,
  is_stale: false,
  last_known_good: reading(
    "river_level",
    13.18,
    "m",
    "pagasa",
    hoursAgo(1),
    PAGASA_STATION,
  ),
};
