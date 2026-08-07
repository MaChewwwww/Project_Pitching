import * as React from "react";
import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";

import { Button } from "@/components/common/button";
import { SectionHeader } from "@/components/common/section-header";
import { HazardMapPlaceholder } from "@/components/features/map/hazard-map-placeholder";
import { Section } from "./section";
import { getAreaStats, getFacilities, getRiverLevel } from "@/lib/api/public";

/**
 * The hazard map (FR-PUB-009, BR-0.9).
 *
 * **Never returns null** — it carries the NOAH and OpenStreetMap attribution and
 * the boundary disclaimer, which are licence terms rather than content
 * (NFR-LGL-001/002, FR-MAP-008).
 *
 * The interactive Leaflet map is FR-MAP-001…007 and its own change. What renders
 * now is the legend and the exposure summary — real information, honestly
 * labelled as not-yet-a-map.
 */

export async function HazardMapSection() {
  const [stats, facilities, river] = await Promise.all([
    getAreaStats(),
    getFacilities(),
    getRiverLevel(),
  ]);
  const areas = stats.areas;

  return (
    <Section id="hazard-map" tone="tint">
      <SectionHeader
        icon={Map}
        eyebrow="Know your area"
        title="Flood"
        titleAccent="hazard map"
        description="Flood-prone areas across the barangay, surveyed by Project NOAH. Colours follow the national hazard-map convention used on every government map."
        action={
          <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
            <Link href="/hazard-map">
              Exposure by area
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-8">
        <HazardMapPlaceholder areas={areas} facilities={facilities} river={river} />
      </div>
    </Section>
  );
}
