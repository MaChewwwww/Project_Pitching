"use client";

import { useEffect, useState } from "react";
import { formatAge, formatPhtDateTime } from "@/lib/format";

/**
 * A timestamp that is safe to server-render.
 *
 * "14 minutes ago" is computed from the current clock, so the server and the
 * client disagree by however long the request took — React reports that as a
 * hydration mismatch, and under ISR the server's copy can be a full revalidation
 * window out of date.
 *
 * So: render the absolute Philippine time during SSR and on the first client
 * render, then swap to the relative form inside an effect, once only the browser
 * is deciding. The value ticks every 30 seconds afterwards so an open page does
 * not quietly go stale.
 *
 * `suppressHydrationWarning` would also silence the warning, but it silences the
 * whole class of bug rather than fixing this instance of it.
 */
export function useRelativeTime(iso: string, ageMinutes: number): string {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const compute = () =>
      setRelative(formatAge(Math.floor((Date.now() - Date.parse(iso)) / 60_000)));

    compute();
    const timer = setInterval(compute, 30_000);
    return () => clearInterval(timer);
  }, [iso]);

  return relative ?? `${formatPhtDateTime(iso)} (${formatAge(ageMinutes)})`;
}
