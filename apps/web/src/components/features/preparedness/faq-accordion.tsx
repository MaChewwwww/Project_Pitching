"use client";

import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type { PublicFaq } from "@/lib/api/public-types";

/**
 * FAQs, grouped by category (FR-PUB-011, FR-PRP-005).
 *
 * `type="single" collapsible` rather than `multiple`: on a 360px screen several
 * open answers push everything else off-screen, and this list is meant to be
 * scanned.
 *
 * Each item carries an `id` so `/help#registration` can link straight to it —
 * which the navbar's Login and Register buttons rely on, since accounts do not
 * exist until the registry module ships.
 */

export function FaqAccordion({
  faqs,
  className,
}: {
  faqs: PublicFaq[];
  className?: string;
}) {
  const lang = useLanguage((s) => s.lang);

  const categories = React.useMemo(() => {
    const map = new Map<string, PublicFaq[]>();
    for (const faq of faqs) {
      const existing = map.get(faq.category);
      if (existing) existing.push(faq);
      else map.set(faq.category, [faq]);
    }
    return [...map.entries()];
  }, [faqs]);

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {categories.map(([category, items]) => (
        <section key={category} id={category.toLowerCase()}>
          <h3 className="text-overline text-primary-700 mb-3">{category}</h3>
          <Accordion type="single" collapsible className="w-full">
            {items.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border-b border-neutral-200"
              >
                <AccordionTrigger className="text-h4 min-h-12 text-left text-neutral-900 hover:no-underline">
                  {pick(lang, faq.question_fil, faq.question_en)}
                </AccordionTrigger>
                <AccordionContent className="text-body text-neutral-600">
                  {pick(lang, faq.answer_fil, faq.answer_en)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
