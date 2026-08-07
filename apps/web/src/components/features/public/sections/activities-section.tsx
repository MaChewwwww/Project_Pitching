import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { ActivityCard } from "@/components/features/activities/activity-card";
import { Section } from "./section";
import { getActivities } from "@/lib/api/public";

/** Upcoming activities (FR-PUB-006, BR-0.6). */
export async function ActivitiesSection() {
  const { items: activities } = await getActivities({ upcoming: true });

  if (activities.length === 0) return null;

  return (
    <Section id="activities" tone="tint">
      <SectionHeader
        icon={CalendarDays}
        eyebrow="What's on"
        title="Upcoming"
        titleAccent="activities"
        description="Drills, training and community programs. Open to all residents unless stated otherwise."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        {activities.slice(0, 4).map((activity, i) => (
          <Reveal key={activity.id} delay={(i % 2) as 0 | 1}>
            <ActivityCard activity={activity} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
