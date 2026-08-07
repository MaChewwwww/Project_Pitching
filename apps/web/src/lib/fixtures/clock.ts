/**
 * Relative time helpers for fixtures.
 *
 * Every fixture timestamp is expressed relative to *now*, never as a hardcoded
 * date. A hardcoded "2026-08-07T10:00:00Z" looks fine the day it is written and
 * reads as "3 weeks ago" the month after — which, on a page whose whole premise
 * is that data freshness is visible, makes the demo look abandoned.
 *
 * `fixtureNow()` is a function rather than a module constant on purpose. A
 * constant is evaluated once when the module is first imported and then frozen
 * for the lifetime of the server process; a function is evaluated on every
 * render, so ISR revalidation (60s) keeps the page current.
 */

export function fixtureNow(): Date {
  return new Date();
}

function shift(ms: number): string {
  return new Date(fixtureNow().getTime() + ms).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO-8601 UTC, `Z` suffix — the format architecture.md Section 6.1 mandates. */
export function minutesAgo(n: number): string {
  return shift(-n * MINUTE);
}

export function hoursAgo(n: number): string {
  return shift(-n * HOUR);
}

export function daysAgo(n: number): string {
  return shift(-n * DAY);
}

export function hoursAhead(n: number): string {
  return shift(n * HOUR);
}

export function daysAhead(n: number): string {
  return shift(n * DAY);
}

/**
 * A fixed past date, for genuinely historical facts.
 *
 * Typhoon Ondoy happened in 2009; expressing that as `daysAgo(6100)` would be
 * absurd. Use this only where the date is part of the fact itself.
 */
export function fixedDate(iso: string): string {
  return new Date(iso).toISOString();
}

/** Minutes between `iso` and now, rounded down. Mirrors the API's `age_minutes`. */
export function ageMinutes(iso: string): number {
  return Math.max(
    0,
    Math.floor((fixtureNow().getTime() - new Date(iso).getTime()) / MINUTE),
  );
}
