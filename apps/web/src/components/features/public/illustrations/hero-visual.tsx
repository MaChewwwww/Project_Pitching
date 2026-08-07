"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Box, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Decides whether this device gets the live 3D scene or the static illustration.
 *
 * **The gate is a product decision, not an optimisation** (design.md Section 9.6,
 * FR-MAP-012). On a low-end Android the scene stutters and drains battery, and
 * the audience for this page is specifically someone on a cheap phone over a
 * congested connection. Two conditions must both hold:
 *
 * - viewport ≥ `md` (768px), and
 * - `navigator.hardwareConcurrency > 4`
 *
 * Everything else gets the inline SVG, which is not a degraded experience — it is
 * the same scene, drawn flat.
 *
 * `fallbackNode` arrives as a prop from a Server Component, so the SVG stays
 * server-rendered and ships zero JavaScript. Only this gate and the 3D chunk are
 * client code.
 *
 * The dynamic import is what keeps `three` out of the landing bundle
 * (NFR-PERF-007) — nothing here references the module until the gate opens.
 */

const BarangayScene3D = dynamic(() => import("./barangay-scene-3d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <Loader2 aria-hidden className="text-primary-300 size-6 animate-spin" />
      <span className="sr-only">Loading the interactive map</span>
    </div>
  ),
});

export interface HeroVisualProps {
  /** The server-rendered SVG. Shown until (and unless) the 3D scene takes over. */
  fallbackNode: React.ReactNode;
  className?: string;
}

export function HeroVisual({ fallbackNode, className }: HeroVisualProps) {
  // Whether the device clears the gate, and whether the reader asked anyway.
  // Kept as two independent facts rather than one "enabled" flag synced from the
  // other: an opt-in must survive a resize back below `md`, and deriving the
  // answer avoids a second effect that only exists to copy state around.
  const [gateOpen, setGateOpen] = React.useState(false);
  const [optedIn, setOptedIn] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");

    const evaluate = () => {
      const cores = navigator.hardwareConcurrency ?? 2;
      setGateOpen(query.matches && cores > 4);
    };

    evaluate();
    query.addEventListener("change", evaluate);
    return () => query.removeEventListener("change", evaluate);
  }, []);

  const show3d = gateOpen || optedIn;

  return (
    <div className={cn("relative h-full w-full", className)}>
      {show3d ? <BarangayScene3D /> : fallbackNode}

      {/* The explicit "View 3D" opt-in design.md Section 9.6 requires, so a
          device below the gate is not simply denied the feature. */}
      {!show3d ? (
        <button
          type="button"
          onClick={() => setOptedIn(true)}
          className="text-label absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-3 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <Box aria-hidden className="size-4" />
          View in 3D
        </button>
      ) : null}

      {show3d ? (
        <p className="text-caption absolute bottom-3 left-3 text-white/60">
          Drag to rotate · tap an area for detail
        </p>
      ) : null}
    </div>
  );
}
