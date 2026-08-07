import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { ActivityCard } from "@/components/features/activities/activity-card";
import { Section } from "./section";
import { getActivities } from "@/lib/api/public";

/** The next few activities (FR-PUB-006, BR-0.6). Full listing on `/activities`. */
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
        action={
          <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
            <Link href="/activities">
              View all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {activities.slice(0, 3).map((activity, i) => (
          <Reveal key={activity.id} delay={(i % 3) as 0 | 1 | 2}>
            <ActivityCard activity={activity} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
