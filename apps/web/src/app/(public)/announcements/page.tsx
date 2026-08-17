import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { Reveal } from "@/components/common/reveal";
import { AnnouncementCard } from "@/components/features/alerts/announcement-card";
import { AnnouncementsFilterSelect } from "@/components/features/alerts/announcements-filter-select";
import { getAnnouncements } from "@/lib/api/public";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Barangay Announcements",
  description:
    "Official weather advisories, class suspensions, road closures and emergency notices from Barangay San Jose.",
};

/**
 * The full announcement feed (FR-PUB-003, FR-ALT-009).
 *
 * Includes alerts and earlier notices. FR-ALT-009 requires alert history to stay
 * publicly viewable without adding lifecycle labels to every article card.
 */
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  const { page: rawPage, kind: rawKind } = await searchParams;
  const requestedPage = Number(rawPage);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const kind = rawKind === "announcement" || rawKind === "alert" ? rawKind : undefined;

  const announcements = await getAnnouncements({ page, size: 9, kind });

  return (
    <>
      <PageHeader
        title="Barangay"
        titleAccent="Announcements"
        description="Official weather advisories, emergency alerts, class suspensions, road closures, and public notices published by Barangay San Jose."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Announcements" }]}
        action={<AnnouncementsFilterSelect currentKind={kind ?? "all"} />}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        {announcements.items.length > 0 ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {announcements.items.map((announcement, i) => (
              <Reveal
                key={announcement.id}
                delay={(i % 3) as 0 | 1 | 2}
                className="min-w-0"
              >
                <AnnouncementCard announcement={announcement} clamp />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Megaphone}
            title="No announcements found"
            description="No notices match the selected filter category."
          />
        )}
        <PaginationControls
          page={announcements.page}
          pages={announcements.pages}
          pathname="/announcements"
          params={{ kind }}
        />
      </div>
    </>
  );
}
