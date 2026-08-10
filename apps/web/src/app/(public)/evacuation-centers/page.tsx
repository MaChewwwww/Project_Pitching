import type { Metadata } from "next";
import { BedDouble, Building2, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import { toTelHref } from "@/lib/format";
import { getEvacuationCenters, getFacilities, getHotlines } from "@/lib/api/public";
import type { FacilityType } from "@/lib/api/public-types";

export const metadata: Metadata = {
  title: "Barangay Facilities",
  description:
    "All barangay facilities in Barangay San Jose — evacuation centers, health clinics, rescue stations, police, and fire stations.",
};

const FACILITY_LABEL: Record<FacilityType, string> = {
  evacuation_center: "Evacuation Centers",
  hospital: "Hospitals",
  clinic: "Health Clinics & Outposts",
  barangay_hall: "Barangay Hall",
  police: "Police Station",
  fire: "Fire Station",
  rescue_station: "Rescue Stations",
};

/**
 * All barangay facilities & evacuation centers directory (FR-PUB-008, FR-EVC-002/003).
 */
export default async function EvacuationCentersPage() {
  const [{ items: centers }, facilities, hotlines] = await Promise.all([
    getEvacuationCenters({ size: 50 }),
    getFacilities(),
    getHotlines(),
  ]);

  const open = centers.filter((c) => c.is_open).length;

  const nonEvacFacilities = facilities.filter(
    (f) => f.type !== "evacuation_center",
  );

  const byType = nonEvacFacilities.reduce<
    Partial<Record<FacilityType, typeof facilities>>
  >((acc, facility) => {
    (acc[facility.type] ??= []).push(facility);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Barangay"
        titleAccent="Facilities & Centers"
        description={
          centers.length > 0
            ? `${open} of ${centers.length} evacuation centers open. Full directory of emergency stations, clinics, and barangay facilities below.`
            : "Directory of emergency stations, clinics, and barangay facilities."
        }
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Barangay Facilities" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12 flex flex-col gap-8">
        {/* Evacuation Centers */}
        <section>
          <div className="mb-6">
            <h2 className="text-h2 text-neutral-900">Evacuation Centers</h2>
            <p className="text-body text-neutral-600">
              {open} of {centers.length} centers are active and accepting evacuees.
            </p>
          </div>

          {centers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              {centers.map((center, i) => (
                <Reveal key={center.id} delay={(i % 2) as 0 | 1}>
                  <EvacCenterCard center={center} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BedDouble}
              title="No evacuation centers listed yet"
              description="Centers appear here once the barangay adds them to the facility registry."
            />
          )}
        </section>

        {/* Other Barangay Facilities */}
        {Object.keys(byType).length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-h2 text-neutral-900">Other Barangay Facilities</h2>
              <p className="text-body text-neutral-600">
                Health clinics, rescue outposts, and administrative offices across Barangay San Jose.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {Object.entries(byType).map(([type, items]) => (
                <Card key={type} radius="xl">
                  <CardContent className="flex flex-col gap-3">
                    <span className="text-overline text-primary-700 inline-flex items-center gap-1.5 font-bold">
                      <Building2 aria-hidden className="size-4" />
                      {FACILITY_LABEL[type as FacilityType]}
                    </span>
                    <ul className="flex flex-col gap-3 divide-y divide-neutral-100">
                      {items.map((facility) => (
                        <li key={facility.id} className="flex flex-col gap-1 pt-2.5 first:pt-0">
                          <span className="text-body font-semibold text-neutral-900">
                            {facility.name}
                          </span>
                          {facility.address ? (
                            <span className="text-caption text-neutral-500">
                              📍 {facility.address}
                            </span>
                          ) : null}
                          {facility.contact_number ? (
                            <a
                              href={toTelHref(facility.contact_number)}
                              className="text-caption text-primary-700 focus-visible:ring-ring inline-flex items-center gap-1 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                            >
                              <Phone className="size-3" />
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
        )}

        <div className="border-t border-neutral-200 pt-8">
          <p className="text-overline mb-4 text-neutral-500">
            Before you travel — call ahead
          </p>
          <HotlineList hotlines={hotlines} />
        </div>
      </div>
    </>
  );
}
