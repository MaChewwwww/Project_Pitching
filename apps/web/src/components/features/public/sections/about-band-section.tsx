import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, Info } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { HISTORY_BADGE, WHAT_IT_IS, WHY_PREPAREDNESS } from "@/lib/content/about";
import { Section } from "./section";

/**
 * The condensed about band (FR-PUB-002, BR-0.2) — the landing teaser.
 *
 * Replaces what used to be two full-height sections here: the mission/vision/SDG
 * grid and the alternating why-preparedness split, both of which now live on
 * `/about`. The landing page's job is the latest *data*; a static mission
 * statement pushing the river level below the fold is the wrong trade on a phone.
 *
 * What stays is the one-paragraph framing, the four things the platform actually
 * does, and the Ondoy high-water mark — the figure that makes the case for the
 * rest of the page.
 */
export function AboutBandSection() {
  return (
    <Section id="about" tone="tint">
      <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="flex flex-col gap-6">
          <Reveal>
            <SectionHeader
              icon={Info}
              eyebrow="About the platform"
              title="Built for"
              titleAccent="Barangay San Jose"
              description={WHAT_IT_IS.split("\n\n")[0]}
            />
          </Reveal>

          <ul className="grid gap-3 sm:grid-cols-2">
            {WHY_PREPAREDNESS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CircleCheck
                  aria-hidden
                  className="text-primary-600 mt-0.5 size-5 shrink-0"
                  strokeWidth={2}
                />
                <span className="text-body text-neutral-700">{item}</span>
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" pill size="lg" className="self-start max-sm:w-full">
            <Link href="/about">
              About the platform &amp; our goals
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>

        <Reveal delay={1}>
          <div className="from-primary-800 to-primary-950 rounded-[20px] bg-gradient-to-br p-6 text-center md:p-8">
            <p className="text-display-lg tabular text-white">{HISTORY_BADGE.value}</p>
            <p className="text-overline text-primary-300 mt-1">{HISTORY_BADGE.label}</p>
            <p className="text-body-sm text-primary-100/80 mx-auto mt-3 max-w-xs">
              {HISTORY_BADGE.caption}
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
