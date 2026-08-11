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
  // The public landing surface is intentionally the three newest published
  // bulletins. `getAnnouncements` orders by `published_at DESC` server-side.
  const { items: announcements } = await getAnnouncements({ size: 3 });

  if (announcements.length === 0) return null;

  return (
    <Section id="announcements">
      <SectionHeader
        icon={Megaphone}
        title="Announcements &"
        titleAccent="Advisories"
        description="Weather advisories, class suspensions, road closures and emergency notices — posted by the barangay office."
        action={
          <Button
            asChild
            variant="outline"
            pill
            size="md"
            className="size-10 shrink-0 p-0"
          >
            <Link href="/announcements" aria-label="View All">
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5">
          <AnnouncementCard announcement={announcements[0]} clamp variant="lead" />
        </Reveal>
        {announcements.length > 1 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:gap-8">
            {announcements.slice(1).map((announcement, index) => (
              <Reveal key={announcement.id} delay={(index + 1) as 1 | 2}>
                <AnnouncementCard announcement={announcement} clamp variant="support" />
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
