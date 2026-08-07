import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { HazardMapPlaceholder } from "@/components/features/map/hazard-map-placeholder";
import { toTelHref } from "@/lib/format";
import { getAreaStats, getFacilities, getRiverLevel } from "@/lib/api/public";
import type { FacilityType } from "@/lib/api/public-types";

export const metadata: Metadata = {
  title: "Flood hazard map",
  description:
    "Flood-prone areas across Barangay San Jose, surveyed by Project NOAH, with barangay facilities and current river level.",
};

const FACILITY_LABEL: Record<FacilityType, string> = {
  evacuation_center: "Evacuation centres",
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
 * The hazard map route (FR-PUB-009, FR-MAP-007).
 *
 * The interactive Leaflet map is FR-MAP-001…006 and its own change. What this
 * page adds over the landing teaser is the per-area exposure table and the full
 * facility directory — real information, honestly labelled as not-yet-a-map.
 *
 * Only area-level aggregates appear here (FR-PUB-014): counts, never a household.
 */
export default async function HazardMapPage() {
  const [stats, facilities, river] = await Promise.all([
    getAreaStats(),
    getFacilities(),
    getRiverLevel(),
  ]);

  const byType = facilities.reduce<Partial<Record<FacilityType, typeof facilities>>>(
    (acc, facility) => {
      (acc[facility.type] ??= []).push(facility);
      return acc;
    },
    {},
  );

  return (
    <>
      <PageHeader
        eyebrow="Know your area"
        title="Flood"
        titleAccent="hazard map"
        description="Colours follow the national hazard-map convention used on every government map — yellow, orange and red by depth, not by urgency."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Hazard map" }]}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 md:gap-12 md:px-6 md:py-12">
        <HazardMapPlaceholder areas={stats.areas} facilities={facilities} river={river} />

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
                        area.flood_exposure ? EXPOSURE_TONE[area.flood_exposure] : "neutral"
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
                      <dt className="text-overline text-neutral-500">Evac centres</dt>
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
          <h2 className="text-h2 mb-1 text-neutral-900">Barangay facilities</h2>
          <p className="text-body mb-6 text-neutral-600">
            {facilities.length} facilities are pinned on the map.
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
