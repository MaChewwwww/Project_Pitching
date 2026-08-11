import type { Metadata } from "next";
import { HandHeart } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { DriveCard } from "@/components/features/donations/drive-card";
import { UTILITY_BAR } from "@/lib/content/site";
import { getDonationDrives } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Donation Drives & Relief",
  description:
    "What Barangay San Jose is collecting right now, how much has arrived, and where to drop goods off.",
};

/**
 * Donation drives (FR-PUB-010, FR-DON-004).
 *
 * Open drives first, closed ones below so a donor can see what a past drive
 * actually achieved. The submission form is FR-DON-002 and needs the API; until
 * then the drop-off details below are what a donor actually acts on.
 */
export default async function DonationDrivesPage() {
  const drives = await getDonationDrives({ size: 50 });

  return (
    <>
      <PageHeader
        title="Donation"
        titleAccent="Donation Drives"
        description="Collection notices, drop-off details, and verified barangay contact information."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Donation Drives" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        {drives.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {drives.items.map((drive, i) => (
              <Reveal key={drive.id} delay={(i % 2) as 0 | 1}>
                <DriveCard drive={drive} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HandHeart}
            title="No drives are open right now"
            description="When the barangay opens a collection, what it needs will be listed here."
          />
        )}

        <div className="bg-primary-50 border-primary-200 mt-10 rounded-[20px] border p-5 md:p-6">
          <p className="text-overline text-primary-700 mb-2">Where to bring goods</p>
          <p className="text-body text-neutral-700">{UTILITY_BAR.address}</p>
          <p className="text-body-sm mt-1 text-neutral-600">{UTILITY_BAR.officeHours}</p>
        </div>
      </div>
    </>
  );
}
