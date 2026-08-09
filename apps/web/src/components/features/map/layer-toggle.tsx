"use client";

import * as React from "react";
import { Layers } from "lucide-react";

import { MAP_LAYERS } from "@/lib/map";
import { useMapLayers } from "@/lib/map-layer-store";
import type { MapLayerKey } from "@/lib/map";

/**
 * Layer visibility toggles.
 *
 * Reads from and writes to `useMapLayers` (Zustand). Placed as a sibling of
 * the map canvas — they share no React parent, which is why the store is used
 * rather than component state.
 */
export function LayerToggle({ className }: { className?: string }) {
  const { visible, toggle } = useMapLayers();

  const layers = Object.entries(MAP_LAYERS) as [MapLayerKey, string][];

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-slate-100 shadow-xl backdrop-blur-md">
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
          <Layers aria-hidden className="size-3.5 text-sky-400" />
          Layers
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Map layer visibility</legend>
          {layers.map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200 hover:text-white"
            >
              <input
                type="checkbox"
                checked={visible[key]}
                onChange={() => toggle(key)}
                className="size-3.5 rounded accent-sky-500"
              />
              {label}
            </label>
          ))}
        </fieldset>

      </div>
    </div>
  );
}
