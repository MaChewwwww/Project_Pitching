import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { AnnouncementCard } from "@/components/features/alerts/announcement-card";
import { getAnnouncements } from "@/lib/api/public";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Barangay Announcements",
  description:
    "Weather advisories, class suspensions, road closures and emergency notices from Barangay San Jose.",
};

/**
 * The full announcement feed (FR-PUB-003, FR-ALT-009).
 *
 * Includes ended alerts as well as active ones — FR-ALT-009 requires alert
 * history be publicly viewable, and `AnnouncementCard` marks the inactive ones so
 * an old evacuation order cannot be mistaken for a current one.
 */
export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements({ size: 50 });

  return (
    <>
      <PageHeader
        title="Barangay"
        titleAccent="Announcements"
        description="Newest first. Ended alerts are kept here so residents can see what was issued and when."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Announcements" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        {announcements.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {announcements.items.map((announcement, i) => (
              <Reveal key={announcement.id} delay={(i % 3) as 0 | 1 | 2}>
                <AnnouncementCard announcement={announcement} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="When the barangay posts an advisory or notice, it will appear here."
          />
        )}
      </div>
    </>
  );
}
