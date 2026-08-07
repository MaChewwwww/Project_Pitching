import * as React from "react";
import { HandHeart } from "lucide-react";

import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { DriveCard } from "@/components/features/donations/drive-card";
import { Section } from "./section";
import { getDonationDrives } from "@/lib/api/public";

/**
 * Donation drives (FR-PUB-010, BR-0.10).
 *
 * The donation form itself is FR-DON-002 and its own change. This section shows
 * what is needed and how far each drive has got, with drop-off details in the
 * description — which is what a donor needs before a form is involved.
 */

export async function DonationDrivesSection() {
  const { items: drives } = await getDonationDrives({ status: "open" });

  if (drives.length === 0) return null;

  return (
    <Section id="donation-drives">
      <SectionHeader
        icon={HandHeart}
        eyebrow="How to help"
        title="Donation"
        titleAccent="drives"
        description="What the barangay is collecting right now, and how much has actually arrived. No account needed to donate — bring goods to the barangay hall."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        {drives.map((drive, i) => (
          <Reveal key={drive.id} delay={(i % 2) as 0 | 1}>
            <DriveCard drive={drive} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
