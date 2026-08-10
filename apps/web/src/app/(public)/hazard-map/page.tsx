import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { HazardMap } from "@/components/features/map/hazard-map";
import { LayerToggle } from "@/components/features/map/layer-toggle";
import { MapLegend } from "@/components/features/map/map-legend";
import { toTelHref } from "@/lib/format";
import {
  getAreaBoundaries,
  getAreaStats,
  getFacilities,
  getRiverLevel,
  getSirens,
} from "@/lib/api/public";
import type { FacilityType } from "@/lib/api/public-types";

export const metadata: Metadata = {
  title: "Flood hazard map",
  description:
    "Flood-prone areas across Barangay San Jose, surveyed by Project NOAH, with barangay facilities and current river level.",
};

const FACILITY_LABEL: Record<FacilityType, string> = {
  evacuation_center: "Evacuation centers",
  hospital: "Hospitals",
  clinic: "Clinics",
  barangay_hall: "Barangay hall",
  police: "Police",
  fire: "Fire station",
  rescue_station: "Rescue stations",
};

const EXPOSURE_TONE = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

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
  const [stats, facilities, river, areaBoundaries, sirens] = await Promise.all([
    getAreaStats(),
    getFacilities(),
    getRiverLevel(),
    getAreaBoundaries(),
    getSirens(),
  ]);

  const evacuationFacilities = facilities.filter(
    (f) => f.type === "evacuation_center",
  );

  const byType = evacuationFacilities.reduce<Partial<Record<FacilityType, typeof facilities>>>(
    (acc, facility) => {
      (acc[facility.type] ??= []).push(facility);
      return acc;
    },
    {},
  );

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
                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-100 shadow-md border border-slate-800 backdrop-blur-md">
                  <span className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                    River Status
                  </span>
                  <span
                    className={
                      river.alert_level >= 3
                        ? "text-red-400 font-extrabold"
                        : river.alert_level === 2
                          ? "text-amber-400 font-extrabold"
                          : "text-yellow-300 font-extrabold"
                    }
                  >
                    🌊 River Alert Level {river.alert_level}
                  </span>
                </div>
              )}

              <LayerToggle />
              <MapLegend />

              {/* Data & map attribution — always visible including mobile */}
              <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 px-4 py-3 text-[11px] text-primary-200/60 shadow-xl backdrop-blur-md flex flex-col gap-1.5">
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
                  <span>contributors</span>
                  <span>&middot;</span>
                  <span>&copy;</span>
                  <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:text-white transition-colors">CARTO</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-h2 mb-1 text-neutral-900">Exposure by area</h2>
          <p className="text-body mb-6 text-neutral-600">
            How much of each area sits inside a mapped flood polygon, and how many
            households are registered there.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {stats.areas.map((area) => (
              <Card key={area.area_id} radius="xl">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-h4 text-neutral-900">{area.area_name}</h3>
                    <Badge
                      tone={
                        area.flood_exposure
                          ? EXPOSURE_TONE[area.flood_exposure]
                          : "neutral"
                      }
                      className="shrink-0"
                    >
                      {area.flood_exposure ?? "unassessed"}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-overline text-neutral-500">Households</dt>
                      <dd className="text-h3 tabular text-neutral-900">
                        {area.registered_households}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-overline text-neutral-500">Evac centers</dt>
                      <dd className="text-h3 tabular text-neutral-900">
                        {area.evac_center_count}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-h2 mb-1 text-neutral-900">Evacuation centers</h2>
          <p className="text-body mb-6 text-neutral-600">
            {evacuationFacilities.length} evacuation centers are pinned on the map.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {Object.entries(byType).map(([type, items]) => (
              <Card key={type} radius="xl">
                <CardContent className="flex flex-col gap-3">
                  <span className="text-overline text-primary-700 inline-flex items-center gap-1.5">
                    <Building2 aria-hidden className="size-3.5" />
                    {FACILITY_LABEL[type as FacilityType]}
                  </span>
                  <ul className="flex flex-col gap-2.5">
                    {items.map((facility) => (
                      <li key={facility.id} className="flex flex-col">
                        <span className="text-body font-semibold text-neutral-800">
                          {facility.name}
                        </span>
                        {facility.address ? (
                          <span className="text-caption text-neutral-500">
                            {facility.address}
                          </span>
                        ) : null}
                        {facility.contact_number ? (
                          <a
                            href={toTelHref(facility.contact_number)}
                            className="text-caption text-primary-700 focus-visible:ring-ring w-fit rounded-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {facility.contact_number}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Attribution
          sources={["hazard", "basemap", "river"]}
          disclaimer={["boundaries", "warning-authority"]}
        />
      </div>
    </>
  );
}
