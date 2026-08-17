import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { Reveal } from "@/components/common/reveal";
import { ActivityCard } from "@/components/features/activities/activity-card";
import {
  ActivitiesFilterNav,
  type ActivityStatus,
} from "@/components/features/activities/activities-filter-nav";
import { getActivities } from "@/lib/api/public";
import type { ActivityType } from "@/lib/api/public-types";

export const metadata: Metadata = {
  title: "SK & Community Activities",
  description:
    "Drills, first aid training, clean-ups and community programmes in Barangay San Jose.",
};

/**
 * Community activities (FR-PUB-006, FR-ACT-003).
 *
 * Published activities include both upcoming events and completed community
 * work, so residents can read recent activity reports. Attendance intent
 * (FR-ACT-004) needs an account and arrives with the registry module — this
 * page is the read-only half.
 */
export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number(params.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const types = [
    "drill",
    "seminar",
    "first_aid",
    "cleanup",
    "tree_planting",
    "ngo_program",
    "other",
  ] as const;
  const selectedType = types.includes(params.type as ActivityType)
    ? (params.type as ActivityType)
    : undefined;
  const selectedStatus: ActivityStatus =
    params.status === "upcoming" || params.status === "past" ? params.status : "all";
  const activities = await getActivities({
    page,
    size: 9,
    period: selectedStatus,
    type: selectedType,
  });

  return (
    <>
      <PageHeader
        title="Community"
        titleAccent="Activities"
        description="Drills, training and programmes run by the barangay and SK. Open to all residents unless stated otherwise."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Activities" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        <ActivitiesFilterNav
          selectedType={selectedType}
          selectedStatus={selectedStatus}
        />

        {activities.items.length > 0 ? (
          <div className="grid min-w-0 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {activities.items.map((activity, i) => (
              <Reveal key={activity.id} delay={(i % 2) as 0 | 1} className="min-w-0">
                <ActivityCard activity={activity} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No Activities Published Yet"
            description="Community activities and completed programme reports will appear here once published."
          />
        )}

        <PaginationControls
          page={activities.page}
          pages={activities.pages}
          pathname="/activities"
          params={{
            type: selectedType,
            status: selectedStatus === "all" ? undefined : selectedStatus,
          }}
        />
      </div>
    </>
  );
}
