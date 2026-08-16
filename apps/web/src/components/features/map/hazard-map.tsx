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
      <div className="flex h-full min-h-[340px] w-full animate-pulse items-center justify-center rounded-xl bg-slate-950">
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
  center?: [number, number];
  zoom?: number;
  showHazardLayer?: boolean;
  /** A private, read-only marker used by the resident household view. */
  householdMarker?: { position: [number, number]; label?: string };
  /** Keep a supplied center for static embeds instead of using the public overview viewport. */
  preserveStaticCenter?: boolean;
  className?: string;
}

export function HazardMap({
  facilities = [],
  areaBoundaries = [],
  areaStats = [],
  sirens = [],
  interactive = true,
  center,
  zoom,
  showHazardLayer = true,
  householdMarker,
  preserveStaticCenter,
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
        center={center}
        zoom={zoom}
        showHazardLayer={showHazardLayer}
        householdMarker={householdMarker}
        preserveStaticCenter={preserveStaticCenter}
      />
    </div>
  );
}
