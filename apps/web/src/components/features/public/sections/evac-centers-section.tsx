import * as React from "react";
import { BedDouble } from "lucide-react";

import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import { Section } from "./section";
import { getEvacuationCenters } from "@/lib/api/public";

/** Evacuation centres (FR-PUB-008, BR-0.8). */
export async function EvacCentersSection() {
  const { items: centers } = await getEvacuationCenters();

  if (centers.length === 0) return null;

  return (
    <Section id="evacuation-centers">
      <SectionHeader
        icon={BedDouble}
        eyebrow="Where to go"
        title="Evacuation"
        titleAccent="centres"
        description="Capacity and current occupancy, updated as people check in. Closed centres are shown so you do not travel to one."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        {centers.map((center, i) => (
          <Reveal key={center.id} delay={(i % 2) as 0 | 1}>
            <EvacCenterCard center={center} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
