/**
 * Map constants — viewport, layers, and the one place map colours are defined.
 *
 * Two things this file exists to prevent:
 *
 * 1. **A second hazard palette.** The committed GeoJSON carries a `fill_color`
 *    property (`tools/prepare_hazard.py` writes it), and reading it would put
 *    the palette in two places — the data file and `globals.css` — with no way
 *    to tell which one a wrong colour came from. Map layers read `HAZARD_STYLE`
 *    below and **ignore `properties.fill_color` entirely** (design.md 3.4 owns
 *    the values; the tokens in `globals.css` are the same three).
 * 2. **Bounds and zoom drifting per component.** There was no TS constant for
 *    either before this file; `BARANGAY_CENTER` in `lib/brand.ts` was the only
 *    geographic fact, and it is `{ lat, lon }` while Leaflet wants `lng`.
 *    `BARANGAY_VIEW` below does that conversion once.
 */

import { BARANGAY_CENTER } from "@/lib/brand";

/** Leaflet's spelling of `BARANGAY_CENTER`, default zoom 14 for desktop web. */
export const BARANGAY_VIEW = {
  center: [14.7410, BARANGAY_CENTER.lon] as [number, number],
  zoom: 14,
  minZoom: 11,
  maxZoom: 18,
} as const;

/**
 * The clip extent from `dataset/README.md` — lat 14.708–14.762, lon 121.108–121.162.
 *
 * The hazard GeoJSON is clipped to exactly this box, so panning outside it shows
 * basemap with no data and reads as "the flood layer stopped working". Leaflet
 * order is [[south, west], [north, east]].
 */
export const BARANGAY_BOUNDS: [[number, number], [number, number]] = [
  [14.728, 121.120],
  [14.762, 121.142],
];

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Thick dashed dark blue administrative boundary line style */
export const BOUNDARY_LINE_STYLE = {
  color: "#4ade80",
  weight: 4,
  opacity: 1,
  dashArray: "10, 8",
  fill: false,
};

/** Exact outer administrative boundary GeoJSON for Barangay San Jose (without internal area division lines) */
export const SAN_JOSE_OUTER_BOUNDARY_GEOJSON: GeoJSON.Feature = {
  type: "Feature",
  properties: { name: "Barangay San Jose Administrative Boundary" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [121.137764, 14.761271],
        [121.136842, 14.761728],
        [121.133366, 14.761479],
        [121.130233, 14.761271],
        [121.127572, 14.760981],
        [121.125383, 14.760566],
        [121.124225, 14.759279],
        [121.123538, 14.758034],
        [121.122422, 14.757495],
        [121.121821, 14.757121],
        [121.121521, 14.755918],
        [121.121349, 14.75405],
        [121.121006, 14.751519],
        [121.118731, 14.749361],
        [121.118989, 14.746995],
        [121.118259, 14.745833],
        [121.11856, 14.743924],
        [121.118045, 14.740811],
        [121.118217, 14.739442],
        [121.116886, 14.738612],
        [121.114569, 14.737118],
        [121.115212, 14.735499],
        [121.115212, 14.735416],
        [121.116521, 14.73471],
        [121.118646, 14.733216],
        [121.118667, 14.733216],
        [121.119268, 14.731743],
        [121.118796, 14.730269],
        [121.119311, 14.729854],
        [121.119804, 14.728485],
        [121.119998, 14.727779],
        [121.120341, 14.726949],
        [121.120877, 14.726015],
        [121.121457, 14.724874],
        [121.121929, 14.724272],
        [121.123302, 14.723089],
        [121.124933, 14.72064],
        [121.126993, 14.722093],
        [121.127695, 14.721844],
        [121.128468, 14.721683],
        [121.129407, 14.721839],
        [121.129873, 14.722186],
        [121.130651, 14.722762],
        [121.131204, 14.72353],
        [121.131359, 14.724754],
        [121.134331, 14.726534],
        [121.13483, 14.725984],
        [121.136155, 14.725766],
        [121.138451, 14.725496],
        [121.139181, 14.726492],
        [121.140339, 14.725932],
        [121.142678, 14.725991],
        [121.14351, 14.726658],
        [121.143971, 14.726669],
        [121.144738, 14.726736],
        [121.145173, 14.726627],
        [121.145629, 14.726601],
        [121.146095, 14.727073],
        [121.146256, 14.727431],
        [121.147292, 14.727198],
        [121.145747, 14.735084],
        [121.147292, 14.737304],
        [121.147056, 14.740355],
        [121.145597, 14.743037],
        [121.146519, 14.744012],
        [121.146337, 14.745548],
        [121.145961, 14.746565],
        [121.146369, 14.748219],
        [121.144137, 14.750253],
        [121.142571, 14.751809],
        [121.142088, 14.753703],
        [121.143258, 14.754201],
        [121.140398, 14.755534],
        [121.138505, 14.756976],
        [121.137335, 14.757687],
        [121.137346, 14.75819],
        [121.138183, 14.758688],
        [121.138837, 14.759259],
        [121.139299, 14.759689],
        [121.139427, 14.75985],
        [121.137764, 14.761271]
      ]
    ]
  }
};

/* --- flood hazard (design.md Section 3.4) ---------------------------------- */

/**
 * The official Philippine hazard-map convention — yellow/orange/red by depth,
 * never blue, and always a **translucent fill** (alert level is the solid badge;
 * rendering either as the other form is the mistake design.md 3.4 calls out).
 */
export const HAZARD_LEVELS = [
  { level: 1, label: "Low", depth: "0–0.5 m", color: "#FFED4A" },
  { level: 2, label: "Medium", depth: "0.5–1.5 m", color: "#F59E0B" },
  { level: 3, label: "High", depth: "over 1.5 m", color: "#EF4444" },
] as const;

export type HazardLevel = (typeof HAZARD_LEVELS)[number]["level"];

const HAZARD_COLOR: Record<number, string> = {
  1: "#FFED4A",
  2: "#F59E0B",
  3: "#EF4444",
};

/** Leaflet path options for a hazard polygon. `Var` is the NOAH level column. */
export function hazardStyle(level: number | undefined) {
  return {
    color: HAZARD_COLOR[level ?? 0] ?? "#9CA3AF",
    weight: 0.5,
    opacity: 0.7,
    fillColor: HAZARD_COLOR[level ?? 0] ?? "#9CA3AF",
    fillOpacity: 0.45,
  };
}

/* --- area shading (FR-MAP-002) --------------------------------------------- */

/**
 * The two indicators an area polygon can be shaded by.
 *
 * `households` is deliberately **not** called a vulnerability or risk ramp. It
 * shades by the count of households carrying at least one vulnerability flag —
 * a raw count of a recorded fact, not a computed risk score. Calling it
 * "vulnerability" would imply an assessment the system does not perform
 * (the same distinction `domain/triage.py` draws on the rescue queue), and
 * FR-MAP-002's original wording was reworded for exactly this reason.
 */
export type AreaShading = "hazard" | "households";

export const AREA_SHADING_LABELS: Record<AreaShading, string> = {
  hazard: "Flood exposure",
  households: "Households with a vulnerability flag",
};

/**
 * A green single-hue ramp, five steps. Single-hue because a diverging
 * red/green ramp would collide with the hazard palette on the same canvas and
 * read as a second severity scale; green because that is the platform's own
 * hue and carries no hazard meaning (design.md 3.4).
 */
export const HOUSEHOLD_RAMP = [
  "#dff3e6",
  "#bfe7ce",
  "#92d4ac",
  "#5bb983",
  "#1f8049",
] as const;

export const AREA_PALETTE: Record<string, { stroke: string; fill: string }> = {
  "Area 1": { stroke: "#cbd5e1", fill: "#94a3b8" }, // Slate Gray
  "Area 2": { stroke: "#94a3b8", fill: "#64748b" }, // Silver Gray
  "Area 3": { stroke: "#e2e8f0", fill: "#cbd5e1" }, // Ice White
  "Area 4": { stroke: "#a1a1aa", fill: "#71717a" }, // Zinc Gray
  "Area 5": { stroke: "#f1f5f9", fill: "#e2e8f0" }, // Off White
  "Area 6": { stroke: "#d4d4d8", fill: "#a1a1aa" }, // Cool Gray
};

export function distinctAreaStyle(areaName: string) {
  const palette = AREA_PALETTE[areaName] ?? { stroke: "#cbd5e1", fill: "#94a3b8" };
  return {
    color: palette.stroke,
    weight: 1.5,
    opacity: 0.75,
    dashArray: "4, 4",
    fillColor: palette.fill,
    fillOpacity: 0.18,
  };
}

/* --- layer identity ------------------------------------------------------- */

export const MAP_LAYERS = {
  hazard: "Flood hazard (5-year)",
  areas: "Area list",
  facilities: "Evacuation Centers",
  sirens: "Siren units",
} as const;

export type MapLayerKey = keyof typeof MAP_LAYERS;

/** Where `make hazard-web` stages the layer. A 404 here is a degraded layer, not an error. */
export const HAZARD_GEOJSON_URL = "/data/san_jose_flood_5yr.geojson";
