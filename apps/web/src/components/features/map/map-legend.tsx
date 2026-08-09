"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  AREA_PALETTE,
  HAZARD_LEVELS,
} from "@/lib/map";
import { useMapLayers } from "@/lib/map-layer-store";
import { cn } from "@/lib/utils";

/**
 * Map legend — reflects the active shading mode.
 *
 * When shading = "hazard": shows the three flood-hazard swatches.
 * When shading = "households": shows the five-step green ramp.
 *
 * Collapsible on mobile to keep the map canvas usable on small screens
 * (FR-MAP-010, design.md Section 9).
 */
export function MapLegend({ className }: { className?: string }) {
  const { shading, visible } = useMapLayers();
  const [open, setOpen] = React.useState(true);

  const isHazard = shading === "hazard";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 shadow-xl backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left md:cursor-default"
        aria-expanded={open}
        aria-controls="map-legend-body"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
          Legend
        </p>
        <span className="md:hidden text-slate-400">
          {open ? (
            <ChevronUp aria-hidden className="size-4" />
          ) : (
            <ChevronDown aria-hidden className="size-4" />
          )}
        </span>
      </button>

      <div
        id="map-legend-body"
        className={cn("px-4 pb-4", open ? "block" : "hidden md:block")}
      >
        {/* Hazard swatches */}
        {visible.hazard && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              FLOOD HAZARD LAYER (NOAH)
            </p>
            <ul className="flex flex-col gap-1.5">
              {HAZARD_LEVELS.map((h) => (
                <li key={h.level} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: h.color, opacity: 0.9 }}
                  />
                  <span className="text-xs text-slate-200">
                    <span className="font-semibold">{h.label} Hazard</span> ({h.depth})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Map Boundaries matching mockup — ALWAYS VISIBLE */}
        <div className="mb-3 border-t border-slate-800 pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            MAP BOUNDARIES
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <span className="w-5 border-b-[3px] border-dashed border-blue-600" />
            <span>San Jose Boundary</span>
          </div>
        </div>



        {/* Siren legend */}
        {visible.sirens && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              SIREN UNITS
            </p>
            <ul className="flex flex-col gap-1.5">
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full bg-slate-500"
                />
                <span className="text-xs text-slate-200">Idle Siren</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full bg-red-500 shadow-sm shadow-red-500/50"
                />
                <span className="text-xs text-slate-200">Sounding Siren</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
