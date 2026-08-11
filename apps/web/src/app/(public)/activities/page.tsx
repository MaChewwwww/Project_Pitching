import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { Reveal } from "@/components/common/reveal";
import { ActivityCard } from "@/components/features/activities/activity-card";
import { getActivities } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "SK & Community Activities",
  description:
    "Drills, first aid training, clean-ups and community programmes in Barangay San Jose.",
};

/**
 * Community activities (FR-PUB-006, FR-ACT-003).
 *
 * Upcoming first, then past ones below a divider. Attendance intent (FR-ACT-004)
 * needs an account and arrives with the registry module — this page is the
 * read-only half.
 */
export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const activities = await getActivities({ page, size: 9, upcoming: true });

  return (
    <>
      <PageHeader
        title="Community"
        titleAccent="Activities"
        description="Drills, training and programmes run by the barangay and SK. Open to all residents unless stated otherwise."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Activities" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        {activities.items.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {activities.items.map((activity, i) => (
              <Reveal key={activity.id} delay={(i % 2) as 0 | 1}>
                <ActivityCard activity={activity} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled right now"
            description="Drills and training sessions are posted here as the barangay schedules them."
          />
        )}

        <PaginationControls page={activities.page} pages={activities.pages} pathname="/activities" />
      </div>
    </>
  );
}
