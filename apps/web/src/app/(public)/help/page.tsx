import type { Metadata } from "next";
import { Clock, MapPin, Phone } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { HotlineList } from "@/components/common/hotline-list";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { FaqAccordion } from "@/components/features/preparedness/faq-accordion";
import { getFaqs, getHotlines } from "@/lib/api/public";
import { UTILITY_BAR } from "@/lib/content/site";
import { BARANGAY } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Help & FAQs",
  description:
    "How to register, where to go in an emergency, and how to contact Barangay San Jose.",
};

/**
 * Help, FAQs and contact (FR-PUB-011, FR-PUB-007, FR-PRP-005).
 *
 * The navbar's Login and Register buttons both point at `#registration` on this
 * page. Accounts arrive with the registry module; until then the honest answer is
 * the FAQ explaining how to register in person, which is what those buttons now
 * lead to.
 */
export default async function HelpPage() {
  const [faqs, hotlines] = await Promise.all([getFaqs(), getHotlines()]);

  return (
    <>
      <PageHeader
        title="Frequently Asked"
        titleAccent="Questions"
        description="If you cannot find an answer here, call the barangay office or visit during working hours."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Help & FAQs" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-12">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          <div>
            <FaqAccordion faqs={faqs} />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <SectionHeader
                as="h3"
                icon={Phone}
                eyebrow="In an emergency"
                title="Hotlines"
              />
              <HotlineList hotlines={hotlines} layout="stack" className="mt-4" />
              <Attribution className="mt-4" disclaimer="no-rescue-promise" />
            </div>

            <Card radius="xl" variant="tint">
              <CardContent className="flex flex-col gap-3">
                <p className="text-overline text-primary-700">Barangay office</p>
                <address className="flex flex-col gap-2 not-italic">
                  <span className="text-body-sm inline-flex items-start gap-2 text-neutral-700">
                    <MapPin
                      aria-hidden
                      className="text-primary-700 mt-0.5 size-4 shrink-0"
                    />
                    {UTILITY_BAR.address}
                  </span>
                  <span className="text-body-sm inline-flex items-start gap-2 text-neutral-700">
                    <Clock
                      aria-hidden
                      className="text-primary-700 mt-0.5 size-4 shrink-0"
                    />
                    {UTILITY_BAR.officeHours}
                  </span>
                </address>
                <p className="text-caption text-neutral-600">
                  Household registration is done in person at {BARANGAY}, or with a
                  Barangay Health Worker at your home.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
