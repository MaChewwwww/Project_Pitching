import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { BarangayIsometric } from "../illustrations/barangay-isometric";
import { HISTORY_BADGE, WHY_PREPAREDNESS } from "@/lib/content/about";
import { formatNumber } from "@/lib/format";
import { Section } from "./section";
import { getFloodEvents } from "@/lib/api/public";
import type { PublicFloodEvent } from "@/lib/api/public-types";

/**
 * Why preparedness matters here (BR-0.2, second half).
 *
 * The reference layout's alternating split: image left with an offset dark badge
 * card overlapping it, content right with eyebrow, two-tone headline, paragraph,
 * a checklist, and a pill action.
 *
 * **The badge card is an absolutely-positioned sibling, not a Card child.**
 * shadcn's `Card` sets `overflow-hidden`, which would clip anything overlapping
 * its edge — so the visual sits in a `relative` wrapper and the badge sits beside
 * it, not inside.
 *
 * The badge itself carries the Ondoy high-water mark rather than a founding year.
 * The barangay's founding date is not in any project document, and the 2009 peak
 * is both sourceable and the figure every plan since has been measured against.
 */

export async function WhyPreparednessSection() {
  const { items: floodEvents } = await getFloodEvents();

  const worst = floodEvents.reduce<PublicFloodEvent | null>(
    (max, event) => ((event.peak_level_m ?? 0) > (max?.peak_level_m ?? 0) ? event : max),
    null,
  );

  return (
    <Section id="why-preparedness">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* --- visual with the offset badge -------------------------------- */}
        <div className="relative pb-16 lg:pb-20">
          <div className="from-primary-700 via-primary-800 to-primary-950 overflow-hidden rounded-[20px] bg-gradient-to-br p-6 md:p-8">
            <BarangayIsometric className="mx-auto h-auto w-full max-w-lg" />
          </div>

          {/* Sibling, not a child — see the note above. */}
          <div className="bg-primary-900 shadow-lg-card absolute bottom-0 left-4 rounded-[20px] px-6 py-5 text-center md:left-8 md:px-8">
            <p className="text-display-md tabular text-white">{HISTORY_BADGE.value}</p>
            <p className="text-overline text-primary-300 mt-1">{HISTORY_BADGE.label}</p>
            {worst?.peak_level_m ? (
              <p className="text-caption text-primary-100/70 mt-1.5 max-w-[16rem]">
                {worst.peak_level_m} m peak ·{" "}
                {formatNumber(worst.households_displaced ?? 0)} households displaced
              </p>
            ) : null}
          </div>
        </div>

        {/* --- copy --------------------------------------------------------- */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <SectionHeader
              icon={ShieldCheck}
              eyebrow="Why preparedness matters here"
              title="San Jose floods."
              titleAccent="Preparation is what changes."
              description="The river will rise again. What a household can change is how much warning it acts on, and whether it already knows where to go."
            />
          </Reveal>

          <ul className="flex flex-col gap-3">
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

          <Button asChild pill size="lg" className="self-start max-sm:w-full">
            <Link href="/guides">
              Read the Preparedness Guidelines
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
