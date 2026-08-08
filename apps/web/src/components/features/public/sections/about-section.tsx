import * as React from "react";
import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { MISSION, SDG_ENTRIES, VISION, WHAT_IT_IS } from "@/lib/content/about";
import { Section } from "./section";

/**
 * About the platform (FR-PUB-002, BR-0.2).
 *
 * Mirrors the reference's centred header over a card grid.
 *
 * Mission and vision close BRD OI-10 (Section 11, D-14) — drafted from the
 * team's own concept paper, not invented copy. See `lib/content/about.ts`.
 * The SDG alignment beside them is not a placeholder either — BRD Section 12
 * states it outright.
 */

export function AboutSection() {
  return (
    <Section id="about" tone="tint">
      <SectionHeader
        align="center"
        rule
        icon={Info}
        eyebrow="About the platform"
        title="Built for"
        titleAccent="Barangay San Jose"
        description={WHAT_IT_IS.split("\n\n")[0]}
        className="mx-auto max-w-3xl"
      />

      <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6">
        {[
          { label: "Mission", body: MISSION },
          { label: "Vision", body: VISION },
        ].map((item, i) => (
          <Reveal key={item.label} delay={i === 0 ? 0 : 1}>
            <Card radius="xl" className="h-full">
              <CardContent className="flex flex-col gap-2">
                <span className="text-overline text-primary-700">{item.label}</span>
                <p className="text-body text-neutral-600">{item.body}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 md:mt-8">
        <p className="text-overline mb-4 text-neutral-500">
          Sustainable Development Goals this supports
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {SDG_ENTRIES.map((sdg, i) => (
            <Reveal key={sdg.number} delay={(i % 4) as 0 | 1 | 2 | 3}>
              <Card radius="xl" topAccent className="h-full">
                <CardContent className="flex h-full flex-col gap-3">
                  <span className="bg-primary-100 text-primary-700 grid size-10 place-items-center rounded-md">
                    <sdg.icon aria-hidden className="size-5" strokeWidth={2} />
                  </span>
                  <span className="text-overline text-primary-700">SDG {sdg.number}</span>
                  <h3 className="text-h4 text-neutral-900">{sdg.title}</h3>
                  <p className="text-body-sm text-neutral-600">{sdg.description}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
