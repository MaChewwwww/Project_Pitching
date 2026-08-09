"use client";

import { create } from "zustand";

import type { AreaShading, MapLayerKey } from "@/lib/map";

/**
 * Which map layers are visible, and which indicator shades the area polygons.
 *
 * Zustand rather than component state because the toggle control, the legend,
 * and the map itself are siblings rendered from a server component's page — not
 * a single tree with a shared parent to hold `useState`. `architecture.md`
 * Section 10.3 reserves Zustand for exactly this: small cross-cutting UI state
 * that is **not** server data. The GeoJSON and the facility list are server
 * data and stay in React Query / props; only the booleans live here.
 *
 * One store, not one per map instance. There is only ever one map on screen —
 * the landing page renders a teaser that links to `/hazard-map` rather than a
 * second live map, deliberately (no tiles on first paint, NFR-PERF-006).
 */

interface MapLayerState {
  visible: Record<MapLayerKey, boolean>;
  shading: AreaShading;
  toggle: (layer: MapLayerKey) => void;
  setShading: (shading: AreaShading) => void;
}

/**
 * Hazard and facilities on by default — they are the reason someone opens the
 * map. Area boundaries on too, but sirens off: the siren layer is a simulation
 * of hardware the barangay does not own (FR-MAP-014), so it is opt-in rather
 * than something a resident sees without asking for it.
 */
const DEFAULT_VISIBLE: Record<MapLayerKey, boolean> = {
  hazard: true,
  areas: true,
  facilities: true,
  sirens: false,
};

export const useMapLayers = create<MapLayerState>((set) => ({
  visible: DEFAULT_VISIBLE,
  shading: "hazard",
  toggle: (layer) =>
    set((state) => ({
      visible: { ...state.visible, [layer]: !state.visible[layer] },
    })),
  setShading: (shading) => set({ shading }),
}));
