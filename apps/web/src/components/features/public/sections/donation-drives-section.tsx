import * as React from "react";
import Link from "next/link";
import { ArrowRight, HandHeart } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { DriveCard } from "@/components/features/donations/drive-card";
import { Section } from "./section";
import { getDonationDrives } from "@/lib/api/public";

/**
 * Donation drives (FR-PUB-010, BR-0.10) — the landing teaser.
 *
 * The donation form itself is FR-DON-002 and its own change. Drop-off details and
 * closed drives live on `/donation-drives`.
 */

export async function DonationDrivesSection() {
  const { items: drives } = await getDonationDrives({ status: "open" });

  if (drives.length === 0) return null;

  return (
    <Section id="donation-drives">
      <Reveal>
        <SectionHeader
          icon={HandHeart}
          title="Donation"
          titleAccent="Drive"
          description="What the barangay is collecting right now, and how much has actually arrived. No account needed to donate."
          action={
            <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
              <Link href="/donation-drives">
                All drives
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          }
        />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        {drives.slice(0, 2).map((drive, i) => (
          <Reveal key={drive.id} delay={(i % 2) as 0 | 1}>
            <DriveCard drive={drive} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
