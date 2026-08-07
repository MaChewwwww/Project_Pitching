import * as React from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { AnnouncementCard } from "@/components/features/alerts/announcement-card";
import { Section } from "./section";
import { getAnnouncements } from "@/lib/api/public";

/**
 * Latest announcements (FR-PUB-003, BR-0.3).
 *
 * Newest first, emergency notices visually distinct — `AnnouncementCard` handles
 * the second part.
 *
 * Returns `null` when there is nothing to show (FR-PUB-018). The guard lives here
 * rather than in the page so a caller cannot forget it and render an empty shell.
 */

export async function AnnouncementsSection() {
  const { items: announcements } = await getAnnouncements({ size: 6 });

  if (announcements.length === 0) return null;

  return (
    <Section id="announcements">
      <SectionHeader
        icon={Megaphone}
        eyebrow="Latest from the barangay"
        title="Announcements &"
        titleAccent="advisories"
        description="Weather advisories, class suspensions, road closures and emergency notices — posted by the barangay office."
        action={
          <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
            <Link href="/announcements">
              View all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {announcements.slice(0, 3).map((announcement, i) => (
          <Reveal key={announcement.id} delay={(i % 3) as 0 | 1 | 2}>
            <AnnouncementCard announcement={announcement} clamp />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
