import type { Metadata } from "next";
import { BedDouble } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import { getEvacuationCenters, getHotlines } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Evacuation centres",
  description:
    "Every evacuation centre in Barangay San Jose — address, capacity, current occupancy and whether it is open.",
};

/**
 * All evacuation centres (FR-PUB-008, FR-EVC-002/003).
 *
 * Closed centres are shown rather than filtered out, so nobody travels to one
 * that is not accepting people. The hotlines repeat at the foot of the page: if a
 * resident is reading this, they may be about to leave the house, and NFR-AVL-004
 * wants the numbers reachable on the surface they are actually looking at.
 */
export default async function EvacuationCentersPage() {
  const [{ items: centers }, hotlines] = await Promise.all([
    getEvacuationCenters({ size: 50 }),
    getHotlines(),
  ]);

  const open = centers.filter((c) => c.is_open).length;

  return (
    <>
      <PageHeader
        eyebrow="Where to go"
        title="Evacuation"
        titleAccent="centres"
        description={
          centers.length > 0
            ? `${open} of ${centers.length} centres are currently open. Capacity and occupancy update as people check in.`
            : "Capacity and occupancy update as people check in."
        }
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Evacuation centres" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12">
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
            title="No evacuation centres listed yet"
            description="Centres appear here once the barangay adds them to the facility registry."
          />
        )}

        <div className="mt-12 border-t border-neutral-200 pt-8">
          <p className="text-overline mb-4 text-neutral-500">
            Before you travel — call ahead
          </p>
          <HotlineList hotlines={hotlines} />
        </div>
      </div>
    </>
  );
}
