import * as React from "react";
import Link from "next/link";
import { ArrowRight, BedDouble } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { EvacCenterCarousel } from "@/components/features/evacuation/evac-center-carousel";
import { Section } from "./section";
import { getEvacuationCenters } from "@/lib/api/public";

/**
 * Evacuation centres (FR-PUB-008, BR-0.8) — landing page carousel.
 *
 * Open centres first, displayed in a non-autoscrolling carousel for easy
 * horizontal browsing.
 */
export async function EvacCentersSection() {
  const { items: centers } = await getEvacuationCenters({ size: 50 });

  if (!centers || centers.length === 0) return null;

  const sortedCenters = [...centers].sort(
    (a, b) => Number(b.is_open) - Number(a.is_open),
  );

  return (
    <Section id="evacuation-centers">
      <Reveal>
        <SectionHeader
          icon={BedDouble}
          title="Evacuation"
          titleAccent="Centers"
          description="Capacity and current occupancy, updated as people check in."
          action={
            <Button asChild variant="outline" pill size="md" className="shrink-0 max-sm:px-3">
              <Link href="/evacuation-centers" aria-label="View All">
                <span className="hidden sm:inline">View All</span>
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          }
        />
      </Reveal>

      <div className="mt-6">
        <Reveal>
          <EvacCenterCarousel centers={sortedCenters} />
        </Reveal>
      </div>
    </Section>
  );
}
