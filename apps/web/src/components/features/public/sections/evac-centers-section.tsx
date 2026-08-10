import * as React from "react";
import Link from "next/link";
import { ArrowRight, BedDouble } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import { Section } from "./section";
import { getEvacuationCenters } from "@/lib/api/public";

/**
 * Evacuation centres (FR-PUB-008, BR-0.8) — the landing teaser.
 *
 * Open centres first, so the three shown are the three a resident could actually
 * travel to. The full list, including closed ones, is `/evacuation-centers`.
 */
export async function EvacCentersSection() {
  const { items: centers } = await getEvacuationCenters();

  if (centers.length === 0) return null;

  const featured = [...centers]
    .sort((a, b) => Number(b.is_open) - Number(a.is_open))
    .slice(0, 3);

  return (
    <Section id="evacuation-centers">
      <Reveal>
        <SectionHeader
          icon={BedDouble}
          title="Evacuation"
          titleAccent="Centers"
          description="Capacity and current occupancy, updated as people check in."
          action={
            <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
              <Link href="/evacuation-centers">
                All {centers.length} Centers
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          }
        />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {featured.map((center, i) => (
          <Reveal key={center.id} delay={(i % 3) as 0 | 1 | 2}>
            <EvacCenterCard center={center} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
