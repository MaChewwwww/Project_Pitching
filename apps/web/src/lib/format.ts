/**
 * Display formatting.
 *
 * Timestamps are stored and transmitted as UTC (NFR-DAT-003); converting to
 * Philippine time is the frontend's job. Every formatter below pins
 * `timeZone: "Asia/Manila"` explicitly rather than relying on the runtime's
 * locale — the server renders in whatever zone the container is set to, and an
 * unpinned formatter produces different output on the server and the client,
 * which React reports as a hydration mismatch.
 */

const PHT = "Asia/Manila";

/** `7 August 2026` */
export function formatPhtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** `7 Aug` — for compact date blocks on cards. */
export function formatPhtDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** `2:30 PM` */
export function formatPhtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** `7 Aug 2026, 2:30 PM` — the absolute form shown beside every reading. */
export function formatPhtDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Day of the month, for the date block on an activity card. */
export function phtDayOfMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", { timeZone: PHT, day: "numeric" }).format(
    new Date(iso),
  );
}

/** Abbreviated month, for the date block on an activity card. */
export function phtMonthShort(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", { timeZone: PHT, month: "short" }).format(
    new Date(iso),
  );
}

/**
 * A relative age, phrased in whole units.
 *
 * Only ever rendered after mount — see `hooks/use-relative-time.ts` for why.
 */
export function formatAge(minutes: number): string {
  if (minutes < 1) return "Just Now";
  if (minutes === 1) return "1 Minute Ago";
  if (minutes < 60) return `${minutes} Minutes Ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 Hour Ago";
  if (hours < 24) return `${hours} Hours Ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 Day Ago" : `${days} Days Ago`;
}

/**
 * A `tel:` href.
 *
 * Strips everything a dialler cannot use. Built here rather than sent by the API,
 * because it is a presentation concern and the raw number is what the barangay
 * actually maintains.
 */
export function toTelHref(number: string): string {
  const firstNumber = number.split(/[\/,]/)[0] ?? "";
  return `tel:${firstNumber.replace(/[^\d+]/g, "")}`;
}

/** Grouped thousands, for stat bands and KPI values. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

/** Trims a trailing `.0` so `285.0 kg` reads as `285 kg`. */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

/**
 * An external directions link.
 *
 * OpenStreetMap rather than Google Maps: the hazard layers and basemap already
 * credit OSM (NFR-LGL-002), and sending residents to a second provider adds a
 * tracker for no benefit.
 */
export function osmDirectionsUrl(lon: number, lat: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/**
 * Direct Google Maps navigation URL for resident evacuation routing.
 */
export function googleMapsDirectionsUrl(lon: number, lat: number, name?: string): string {
  const destination = `${lat},${lon}`;
  if (name) {
    const query = encodeURIComponent(`${name}, Barangay San Jose, Rodriguez, Rizal`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&query=${query}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

