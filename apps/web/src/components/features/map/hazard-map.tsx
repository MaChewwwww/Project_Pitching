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
      <div className="animate-pulse h-full w-full bg-slate-950 rounded-xl flex items-center justify-center min-h-[340px]">
        <span className="text-sm font-medium text-slate-400">Loading map preview…</span>
      </div>
    ),
  },
);

export interface HazardMapProps {
  facilities?: PublicFacility[];
  areaBoundaries?: AreaBoundaryFeature[];
  areaStats?: PublicAreaStat[];
  sirens?: PublicSiren[];
  interactive?: boolean;
  zoom?: number;
  className?: string;
}

export function HazardMap({
  facilities = [],
  areaBoundaries = [],
  areaStats = [],
  sirens = [],
  interactive = true,
  zoom,
  className,
}: HazardMapProps) {
  return (
    <div className={className}>
      <HazardMapClientDynamic
        facilities={facilities}
        areaBoundaries={areaBoundaries}
        areaStats={areaStats}
        sirens={sirens}
        interactive={interactive}
        zoom={zoom}
      />
    </div>
  );
}
