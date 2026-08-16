import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp, HeartHandshake, Home, LifeBuoy, ShieldAlert } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
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
      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-12 items-start">
        <Reveal className="flex flex-col gap-6">
          <SectionHeader
            eyebrow="Help & Support"
            icon={CircleHelp}
            title="Frequently Asked"
            titleAccent="Questions"
            description="Clear guidance on household registration, emergency alerts, evacuation procedures, and community services in Barangay San Jose."
          />

          <Card radius="xl" className="bg-white/80 backdrop-blur-xs border-primary-100/90 shadow-2xs">
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <span className="text-overline text-primary-700">Top Topics Covered</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Registration", icon: Home },
                  { label: "Evacuation", icon: LifeBuoy },
                  { label: "River Alerts", icon: ShieldAlert },
                  { label: "Community", icon: HeartHandshake },
                ].map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <div
                      key={topic.label}
                      className="flex items-center gap-2 rounded-xl bg-primary-50/70 border border-primary-100/60 px-3 py-2 text-xs font-bold text-primary-900"
                    >
                      <span className="grid size-6 place-items-center rounded-lg bg-primary-100 text-primary-800 shrink-0">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate">{topic.label}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-caption text-neutral-600 leading-relaxed mt-1">
                Need more details or localized guidance? Visit our dedicated help portal for complete guides and barangay hotlines.
              </p>

              <Button
                asChild
                pill
                size="md"
                className="self-start mt-1 shrink-0"
              >
                <Link href="/help" aria-label="Explore All FAQs">
                  <span>Explore All FAQs</span>
                  <ArrowRight aria-hidden className="size-4 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={1}>
          <FaqAccordion faqs={faqs.slice(0, 5)} compact />
        </Reveal>
      </div>
    </Section>
  );
}

