import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fades a section in as it scrolls into view (design.md Section 8 — "scroll
 * reveals" are the public site's motion vocabulary, where the admin console gets
 * none).
 *
 * Implemented as a CSS scroll-driven animation (`.reveal` in `globals.css`), so
 * there is no IntersectionObserver, no scroll listener, and no JavaScript — which
 * matters on the one page with a hard bundle budget (NFR-PERF-006). The browser
 * runs it off the main thread.
 *
 * Two safety properties come from doing it in CSS. Where `animation-timeline` is
 * unsupported the starting opacity is never applied, so content cannot get stuck
 * invisible; and the `prefers-reduced-motion` guard is in the same rule, so
 * reduced motion means genuinely no motion rather than a shortened animation.
 */

export interface RevealProps extends React.ComponentProps<"div"> {
  /** Staggers the reveal of items in a grid. */
  delay?: 0 | 1 | 2 | 3;
}

const DELAY = [
  "",
  "[animation-delay:60ms]",
  "[animation-delay:120ms]",
  "[animation-delay:180ms]",
];

export function Reveal({ className, delay = 0, ...props }: RevealProps) {
  return <div className={cn("reveal", DELAY[delay], className)} {...props} />;
}
