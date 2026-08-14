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
    geometry: HazardGeometry | null;
  }[];
}

type Coordinate = readonly [number, number];
type Ring = readonly Coordinate[];
type PolygonCoordinates = readonly Ring[];
type MultiPolygonCoordinates = readonly PolygonCoordinates[];

export interface HazardGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: PolygonCoordinates | MultiPolygonCoordinates;
}

export type WaterwayProximity = "very_near" | "near" | "far";

let hazardDataPromise: Promise<HazardFeatureCollection | null> | null = null;

/** Load the static hazard layer once for point-based pin resolution. */
export function loadHazardGeoJson(): Promise<HazardFeatureCollection | null> {
  if (!hazardDataPromise) {
    hazardDataPromise = fetch(HAZARD_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<HazardFeatureCollection>;
      })
      .then((data) => (Array.isArray(data?.features) ? data : null))
      .catch(() => null);
  }
  return hazardDataPromise;
}

function pointInRing(point: Coordinate, ring: Ring, tolerance = 0.0002): boolean {
  let inside = false;
  const [x, y] = point;
  let minDistanceSq = Infinity;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y);
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }

    const dx = xj - xi;
    const dy = yj - yi;
    const l2 = dx * dx + dy * dy;
    let distSq = 0;
    if (l2 === 0) {
      distSq = (x - xi) ** 2 + (y - yi) ** 2;
    } else {
      let t = ((x - xi) * dx + (y - yi) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      distSq = (x - (xi + t * dx)) ** 2 + (y - (yi + t * dy)) ** 2;
    }
    if (distSq < minDistanceSq) minDistanceSq = distSq;
  }

  return inside || minDistanceSq <= tolerance * tolerance;
}

function pointInPolygon(point: Coordinate, polygon: PolygonCoordinates): boolean {
  const [outer, ...holes] = polygon;
  return Boolean(
    outer &&
    pointInRing(point, outer) &&
    holes.every((hole) => !pointInRing(point, hole, 0)),
  );
}

export function pointInGeometry(point: Coordinate, geometry: HazardGeometry | null): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates as PolygonCoordinates);
  }
  return (geometry.coordinates as MultiPolygonCoordinates).some((polygon) =>
    pointInPolygon(point, polygon),
  );
}

/**
 * Translate the mapped flood-depth band into the registry's proximity default.
 * This is an operational default, not a replacement for field observation:
 * high/medium/low mapped exposure become very_near/near/far respectively.
 * A loaded layer with no intersecting polygon is treated as far; an unavailable
 * layer returns null so the form can require a manual selection.
 */
export function waterwayProximityForPoint(
  data: HazardFeatureCollection | null,
  latitude: number,
  longitude: number,
): WaterwayProximity | null {
  if (!data) return null;

  let highestLevel = 0;
  for (const feature of data.features) {
    if (!pointInGeometry([longitude, latitude], feature.geometry)) continue;
    const level = Number(feature.properties?.Var ?? 0);
    if (level > highestLevel) highestLevel = level;
  }

  if (highestLevel >= 3) return "very_near";
  if (highestLevel === 2) return "near";
  return "far";
}

export function hazardLevelForPoint(
  data: HazardFeatureCollection | null,
  latitude: number,
  longitude: number,
): 1 | 2 | 3 | null {
  if (!data) return null;
  let highestLevel = 0;
  for (const feature of data.features) {
    if (!pointInGeometry([longitude, latitude], feature.geometry)) continue;
    highestLevel = Math.max(highestLevel, Number(feature.properties?.Var ?? 0));
  }
  if (highestLevel === 0) return null;
  if (highestLevel >= 3) return 3;
  if (highestLevel === 2) return 2;
  return 1;
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
