"use client";

import * as React from "react";

import { HAZARD_GEOJSON_URL } from "@/lib/map";

/**
 * Loads the staged hazard GeoJSON, and **treats its absence as a degraded
 * layer rather than an error**.
 *
 * `public/data/*.geojson` is gitignored (one artifact, one home — architecture.md
 * Section 12.5), so a fresh clone that has not run `make hazard-web` serves a
 * 404 here. That must not blank the map: the basemap, the area polygons, the
 * facility pins, the legend, and the attribution are all still correct and
 * useful without the flood layer. Throwing would take the whole page down
 * through the client boundary, which is the failure mode `lib/api/public.ts`
 * already guards against on the server side (FR-PUB-016, NFR-AVL-002).
 *
 * Not React Query: this is a static asset with no invalidation story, fetched
 * once per mount, and adding it to the query cache would put a 700 KB payload
 * in a cache built for API responses.
 */

/** A GeoJSON feature collection, narrowed only as far as the map actually reads. */
export interface HazardFeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    /** `Var` is NOAH's hazard-level column: 1 Low, 2 Medium, 3 High. */
    properties: { Var?: number; hazard_level?: string; depth?: string } | null;
    geometry: unknown;
  }[];
}

export type HazardLoadState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: HazardFeatureCollection }
  | { status: "unavailable"; data: null };

export function useHazardGeoJson(enabled = true): HazardLoadState {
  const [state, setState] = React.useState<HazardLoadState>({
    status: "loading",
    data: null,
  });

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(HAZARD_GEOJSON_URL);
        if (!response.ok) throw new Error(`${response.status}`);
        const data = (await response.json()) as HazardFeatureCollection;
        if (!Array.isArray(data?.features)) throw new Error("not a FeatureCollection");
        if (!cancelled) setState({ status: "ready", data });
      } catch (error) {
        // Deliberately console.warn, not an error boundary. Same reasoning as
        // `logDegraded` in lib/api/public.ts: say so loudly in the console,
        // degrade quietly in the UI.
        console.warn(
          `[map] hazard layer unavailable (${HAZARD_GEOJSON_URL}) — run \`make hazard-web\`.`,
          error,
        );
        if (!cancelled) setState({ status: "unavailable", data: null });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
