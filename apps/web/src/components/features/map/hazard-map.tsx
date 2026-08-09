"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type {
  AreaBoundaryFeature,
  PublicAreaStat,
  PublicFacility,
} from "@/lib/api/public-types";
import type { PublicSiren } from "./hazard-map-client";

/**
 * Server-component wrapper for the Leaflet map client island.
 *
 * `react-leaflet` touches `window` at module load — it is not SSR-safe.
 * `ssr: false` here is mandatory, not optional.
 *
 * The loading skeleton is the same height as the map so the page doesn't
 * jump when Leaflet hydrates.
 */

const HazardMapClientDynamic = dynamic(
  () =>
    import("./hazard-map-client").then((m) => ({
      default: m.HazardMapClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-full w-full bg-neutral-100 rounded-xl flex items-center justify-center">
        <span className="text-sm text-neutral-400">Loading map…</span>
      </div>
    ),
  },
);

interface HazardMapProps {
  facilities: PublicFacility[];
  areaBoundaries: AreaBoundaryFeature[];
  areaStats: PublicAreaStat[];
  sirens: PublicSiren[];
  className?: string;
}

export function HazardMap({
  facilities,
  areaBoundaries,
  areaStats,
  sirens,
  className,
}: HazardMapProps) {
  return (
    <div className={className}>
      <HazardMapClientDynamic
        facilities={facilities}
        areaBoundaries={areaBoundaries}
        areaStats={areaStats}
        sirens={sirens}
      />
    </div>
  );
}
