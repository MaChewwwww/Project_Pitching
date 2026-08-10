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
 * Renders the absolute Philippine time during SSR and on the first client
 * render, then swaps to the relative form inside an effect once only the browser
 * is deciding. Ticks every 30 seconds afterwards so an open page does not quietly go stale.
 */
export function useRelativeTime(iso: string, ageMinutes: number): string {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!iso) return;
      // Ensure ISO string is treated as UTC if missing timezone suffix
      const normalizedIso =
        iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;

      const parsed = Date.parse(normalizedIso);
      if (isNaN(parsed)) return;

      const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed) / 60_000));
      setRelative(formatAge(diffMinutes));
    };

    compute();
    const timer = setInterval(compute, 30_000);
    return () => clearInterval(timer);
  }, [iso]);

  return relative ?? `${formatPhtDateTime(iso)} (${formatAge(ageMinutes)})`;
}
