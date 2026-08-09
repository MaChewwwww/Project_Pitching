import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { GuideCard } from "@/components/features/preparedness/guide-card";
import { Section } from "./section";
import { getGuides } from "@/lib/api/public";

/** Preparedness tips (FR-PUB-005, BR-0.5). Each card opens the full guide. */
export async function PreparednessSection() {
  const { items: guides } = await getGuides();

  if (guides.length === 0) return null;

  return (
    <Section id="preparedness">
      <SectionHeader
        icon={BookOpen}
        title="Preparedness"
        titleAccent="Guidelines"
        description="Short, practical guides for the hazards San Jose actually faces — written for this barangay, not adapted from national leaflets."
        action={
          <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
            <Link href="/guides">
              View all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {guides.slice(0, 3).map((guide, i) => (
          <Reveal key={guide.id} delay={(i % 3) as 0 | 1 | 2}>
            <GuideCard guide={guide} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
