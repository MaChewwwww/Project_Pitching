import type { Metadata } from "next";

import { Attribution } from "@/components/common/attribution";
import { PageHeader } from "@/components/common/page-header";
import { EvacCenterFilterGrid } from "@/components/features/evacuation/evac-center-filter-grid";
import { AreaExposureCharts } from "@/components/features/map/area-exposure-charts";
import { HazardMap } from "@/components/features/map/hazard-map";
import { LayerToggle } from "@/components/features/map/layer-toggle";
import { MapLegend } from "@/components/features/map/map-legend";
import {
  getAreaBoundaries,
  getAreaStats,
  getEvacuationCenters,
  getFacilities,
  getRiverLevel,
  getSirens,
} from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Flood hazard map",
  description:
    "Flood-prone areas across Barangay San Jose, surveyed by Project NOAH, with barangay facilities and current river level.",
};

/**
 * The hazard map route (FR-PUB-009, FR-MAP-001…006, FR-MAP-007).
 *
 * Architecture: the Leaflet canvas is a client island (`HazardMapClient`) wrapped
 * in a `dynamic(…, { ssr: false })` import (`HazardMap`). The page itself is a
 * server component — it fetches all data server-side, passes it as props, and
 * renders the static table and directory below. `LayerToggle` and `MapLegend`
 * are separate "use client" islands that share the `useMapLayers` Zustand store
 * with the canvas — no prop drilling through the server boundary.
 *
 * Only area-level aggregates appear here (FR-PUB-014): counts, never a household.
 */
export default async function HazardMapPage() {
  const [stats, facilities, river, areaBoundaries, sirens, evacCentersResponse] =
    await Promise.all([
      getAreaStats(),
      getFacilities(),
      getRiverLevel(),
      getAreaBoundaries(),
      getSirens(),
      getEvacuationCenters({ size: 50 }),
    ]);

  const evacuationFacilities = facilities.filter(
    (f) => f.type === "evacuation_center",
  );

  const evacCenters = evacCentersResponse.items;

  return (
    <>
      <PageHeader
        title="Flood"
        titleAccent="Hazard Map"
        description="Colours follow the national hazard-map convention used on every government map — yellow, orange and red by depth, not by urgency."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Hazard Map" }]}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-5 pb-8 md:gap-10 md:px-6 md:pt-6 md:pb-12">

        {/* Map canvas + sidebar */}
        <section aria-label="Interactive map">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            {/* Map canvas — takes remaining width */}
            <div className="relative h-[450px] sm:h-[550px] lg:h-[680px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <HazardMap
                className="h-full w-full min-h-[450px]"
                center={[14.7415, 121.1315]}
                zoom={14.75}
                facilities={evacuationFacilities}
                areaBoundaries={areaBoundaries.features}
                areaStats={stats.areas}
                sirens={sirens}
              />

            </div>

            {/* Sidebar — stacks below on mobile */}
            <div className="flex flex-col gap-4 lg:w-64 lg:shrink-0">
              {/* River Alert Level Pill — sitting directly above the Layers container */}
              {river.alert_level > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-primary-800/60 bg-primary-950/95 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-xl backdrop-blur-md">
                  <span className="relative flex size-2 shrink-0">
                    <span className={
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 " +
                      (river.alert_level >= 3 ? "bg-red-400" : river.alert_level === 2 ? "bg-amber-400" : "bg-yellow-400")
                    } />
                    <span className={
                      "relative inline-flex size-2 rounded-full " +
                      (river.alert_level >= 3 ? "bg-red-500" : river.alert_level === 2 ? "bg-amber-500" : "bg-yellow-400")
                    } />
                  </span>
                  <span className={
                    river.alert_level >= 3 ? "text-red-300" : river.alert_level === 2 ? "text-amber-300" : "text-yellow-300"
                  }>
                    🌊 Alert Level {river.alert_level}
                  </span>
                </div>
              )}

              <LayerToggle />
              <MapLegend />

              {/* Data Sources */}
              <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 px-4 py-3 text-[11px] text-primary-200/60 shadow-xl backdrop-blur-md flex flex-col gap-1.5">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-primary-400"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                  Data Sources
                </p>
                <div>
                  <span className="font-semibold text-white/70">Locality</span>{" "}
                  Barangay San Jose, Rodriguez (Montalban), Rizal
                </div>
                <div>
                  <span className="font-semibold text-white/70">Data</span>{" "}
                  <span className="text-primary-300">UP NOAH / UPAD (ODC-ODbL)</span>
                </div>
                <div className="border-t border-primary-800/60 pt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
                  <span className="font-semibold text-white/70">Map</span>
                  <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:text-white transition-colors">Leaflet</a>
                  <span>&middot;</span>
                  <span>&copy;</span>
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:text-white transition-colors">OpenStreetMap</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-h2 mb-1 text-neutral-900">Exposure by area</h2>
          <p className="text-body mb-6 text-neutral-600">
            Household risk classification distribution per area and overall across Barangay San Jose.
          </p>

          <AreaExposureCharts areas={stats.areas} />
        </section>

        <section>
          <EvacCenterFilterGrid centers={evacCenters} />
        </section>

        <Attribution
          sources={["hazard", "basemap", "river"]}
          disclaimer="warning-authority"
        />
      </div>
    </>
  );
}

