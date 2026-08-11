import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { BarangayFacilitiesView } from "@/components/features/evacuation/barangay-facilities-view";
import {
  getAreaBoundaries,
  getEvacuationCenters,
  getFacilities,
  getHotlines,
} from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Barangay Facilities & Emergency Services",
  description:
    "Interactive map and directory of all public facilities in Barangay San Jose — evacuation centers, health clinics, rescue stations, police, and fire stations.",
};

/**
 * Overhauled Barangay Facilities & Emergency Services directory (FR-PUB-008, FR-EVC-002/003, FR-MAP-005).
 */
export default async function BarangayFacilitiesPage() {
  const [facilities, evacCentersResponse, areaBoundaries, hotlines] = await Promise.all([
    getFacilities(),
    getEvacuationCenters({ size: 50 }),
    getAreaBoundaries(),
    getHotlines(),
  ]);

  return (
    <>
      <PageHeader
        title="Barangay"
        titleAccent="Facilities & Services"
        description="Interactive map and directory of all evacuation centers, health clinics, emergency stations, and public offices across San Jose."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Barangay Facilities" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        <BarangayFacilitiesView
          facilities={facilities}
          evacCenters={evacCentersResponse.items}
          areaBoundaries={areaBoundaries.features}
          hotlines={hotlines}
        />
      </div>
    </>
  );
}
