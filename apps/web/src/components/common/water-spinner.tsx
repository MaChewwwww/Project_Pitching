import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The public site's loading indicator (design.md Section 7.2, Definition of Done
 * item 3).
 *
 * A droplet falling into a rippling surface, inside two counter-precessing
 * rings — the flood-readiness subject rendered as motion, using the same water
 * vocabulary as the hero illustrations rather than a generic arc spinner.
 *
 * **No `"use client"`, and that is the point.** All of the animation lives in
 * `globals.css` (`.ws-*`), so this renders as static markup inside a Server
 * Component's `<Suspense fallback>` and adds nothing to the landing bundle
 * (NFR-PERF-006). A client-side spinner would pull a JavaScript boundary into
 * every section it guards, which is the cost `SectionBoundary` exists to keep to
 * one component per page.
 *
 * Announced once, not continuously: `role="status"` with the label inside it,
 * so a screen reader says "Loading weather" rather than reading the geometry.
 * `aria-live` is deliberately absent — the default `polite` on `role="status"`
 * is correct, and the surrounding skeleton is `aria-hidden`.
 */

const SIZE = {
  sm: "32px",
  md: "56px",
  lg: "88px",
} as const;

export interface WaterSpinnerProps {
  size?: keyof typeof SIZE;
  /** Authenticated portals use the quieter cycle; public fallbacks retain their original tempo. */
  tempo?: "default" | "calm";
  /** Names what is loading. Read by screen readers; shown when `showLabel`. */
  label?: string;
  /** Renders the label as visible caption text under the spinner. */
  showLabel?: boolean;
  className?: string;
}

export function WaterSpinner({
  size = "md",
  tempo = "default",
  label = "Loading",
  showLabel = false,
  className,
}: WaterSpinnerProps) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3", className)}
    >
      <div
        aria-hidden
        className="ws-root"
        data-tempo={tempo}
        style={{ "--ws-size": SIZE[size] } as React.CSSProperties}
      >
        <div className="ws-stage">
          {/* Impact surface, below the droplet in stacking order. */}
          <div className="ws-surface">
            <div className="ws-ripple ws-ripple-a" />
            <div className="ws-ripple ws-ripple-b" />
          </div>

          <div className="ws-glow" />

          <div className="ws-drop ws-drop-slot">
            <div className="ws-drop-body" />
          </div>

          <div className="ws-orbit ws-orbit-a">
            <div className="ws-ring ws-ring-a" />
          </div>
          <div className="ws-orbit ws-orbit-b">
            <div className="ws-ring ws-ring-b" />
          </div>
        </div>
      </div>

      {showLabel ? (
        <span className="text-body-sm text-neutral-500">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
