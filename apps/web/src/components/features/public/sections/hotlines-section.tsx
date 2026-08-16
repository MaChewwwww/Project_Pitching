import * as React from "react";
import { Phone } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { EmptyState } from "@/components/common/empty-state";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { Section } from "./section";
import { HotlineDirectoryTabs } from "./hotline-directory-tabs";
import { getHotlines } from "@/lib/api/public";

/**
 * Emergency hotlines (FR-PUB-007, BR-0.7).
 *
 * **This section never returns null**, unlike the content sections around it.
 * NFR-AVL-004 makes the hotlines the one thing that must render whatever else has
 * failed, so an empty list gets an explicit empty state rather than a
 * disappearing section — somebody scrolling to where the numbers should be must
 * find something, even if that something is an apology.
 *
 * The section sits seventh in the BRD's page order, which is why it is not the
 * only route to a hotline: the floating action button and the utility bar both
 * carry the primary number, so FR-PUB-015's "reachable without scrolling" does
 * not depend on where this lands.
 */

export async function HotlinesSection() {
  const hotlines = await getHotlines();

  return (
    <Section id="hotlines">
      <Reveal>
        <SectionHeader
          icon={Phone}
          eyebrow="In an emergency"
          title="Emergency"
          titleAccent="hotlines"
          description="Tap any number to call or copy. Filter by service or search your specific purok / zone."
        />
      </Reveal>

      <div className="mt-8">
        {hotlines.length > 0 ? (
          <HotlineDirectoryTabs hotlines={hotlines} />
        ) : (
          <EmptyState
            icon={Phone}
            title="Hotline directory unavailable"
            description="Contact the Barangay San Jose hall directly, or the Rodriguez MDRRMO."
          />
        )}
      </div>

      <Attribution className="mt-6" disclaimer="no-rescue-promise" />
    </Section>
  );
}

