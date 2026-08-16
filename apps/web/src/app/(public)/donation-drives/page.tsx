import type { Metadata } from "next";
import { HandHeart, Info, MapPin, PhoneCall } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { Reveal } from "@/components/common/reveal";
import { DriveCard } from "@/components/features/donations/drive-card";
import { DonationDrivesFilterSelect } from "@/components/features/donations/donation-drives-filter-select";
import { UTILITY_BAR } from "@/lib/content/site";
import { getDonationDrives } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Donation Drives & Relief",
  description:
    "Official collection notices, relief campaigns, drop-off details, and verified barangay contact information from Barangay San Jose.",
};

/**
 * Donation drives (FR-PUB-010, FR-DON-001, FR-DON-015…017).
 *
 * Informational calls for in-kind goods and disaster relief only.
 * No monetary or online payments are collected through this platform (FR-DON-010).
 */
export default async function DonationDrivesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: rawPage, status: rawStatus } = await searchParams;
  const requestedPage = Number(rawPage);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const status =
    rawStatus === "active" || rawStatus === "completed" || rawStatus === "all"
      ? rawStatus
      : undefined;

  const drives = await getDonationDrives({ page, size: 9, status });

  return (
    <>
      <PageHeader
        title="Community"
        titleAccent="Donation Drives"
        description="Official collection notices, disaster relief campaigns, drop-off details, and verified organizer information published by Barangay San Jose."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Donation Drives" }]}
        action={<DonationDrivesFilterSelect currentStatus={status ?? "all"} />}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        {drives.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {drives.items.map((drive, i) => (
              <Reveal key={drive.id} delay={(i % 3) as 0 | 1 | 2}>
                <DriveCard drive={drive} clamp />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HandHeart}
            title="No donation drives found"
            description="No relief campaigns match the selected filter category at this time."
          />
        )}

        <PaginationControls
          page={drives.page}
          pages={drives.pages}
          pathname="/donation-drives"
          params={{ status }}
        />

        {/* Drop-Off Center Guidelines Card */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-neutral-50 p-6 md:p-8 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-emerald-100 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <MapPin className="size-4 text-emerald-600" />
                Where to Bring In-Kind Goods
              </span>
              <h3 className="mt-1 font-display text-lg font-bold text-neutral-900">
                Barangay San Jose Relief & Operations Center
              </h3>
              <p className="mt-1 text-sm text-neutral-600">{UTILITY_BAR.address}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:0285550100"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all"
              >
                <PhoneCall className="size-3.5" />
                Call (02) 8555-0100
              </a>
            </div>
          </div>

          <div className="mt-5 grid gap-4 text-xs text-neutral-600 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1">
              <span className="font-bold text-neutral-900 uppercase tracking-wide">
                Operating Hours
              </span>
              <p>{UTILITY_BAR.officeHours}</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-neutral-900 uppercase tracking-wide">
                Accepted In-Kind Goods
              </span>
              <p>Non-perishable canned food, bottled water, hygiene kits, blankets, clothing.</p>
            </div>

            <div className="space-y-1">
              <span className="flex items-center gap-1 font-bold text-neutral-900 uppercase tracking-wide">
                <Info className="size-3 text-emerald-600" />
                Transparency Policy
              </span>
              <p>This platform lists official barangay drives. No cash donations or online payments handled.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
