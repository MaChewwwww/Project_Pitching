import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { FaqAccordion } from "@/components/features/preparedness/faq-accordion";
import { Section } from "./section";
import { getFaqs } from "@/lib/api/public";

/** FAQs (FR-PUB-011, BR-0.11). The full set lives on `/help`. */
export async function FaqSection() {
  const faqs = await getFaqs();

  if (faqs.length === 0) return null;

  return (
    <Section id="faqs" tone="tint">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
        <Reveal className="flex flex-col gap-6">
          <SectionHeader
            icon={CircleHelp}
            title="Frequently Asked"
            titleAccent="Questions"
            description="How to register, where to go, and what the alert levels mean."
          />
          <Button
            asChild
            variant="outline"
            pill
            size="md"
            className="self-start shrink-0 max-sm:px-3"
          >
            <Link href="/help" aria-label="View All">
              <span className="hidden sm:inline">View All</span>
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </Reveal>

        <Reveal delay={1}>
          <FaqAccordion faqs={faqs.slice(0, 5)} compact />
        </Reveal>
      </div>
    </Section>
  );
}
