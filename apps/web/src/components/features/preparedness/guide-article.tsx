"use client";

import * as React from "react";
import { CalendarCheck, BookMarked } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { formatPhtDate } from "@/lib/format";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import type { PublicGuide } from "@/lib/api/public-types";

/**
 * A guide's body (FR-PRP-001, FR-PRP-007).
 *
 * The body is stored as plain text with `##` sub-headings. This renders exactly
 * that and nothing more — **not** a markdown parser. Guide content is written by
 * the barangay's health and disaster leads through the admin console, and giving
 * that field a full markdown renderer means every future author can inject
 * arbitrary HTML into a public page. Splitting on newlines cannot.
 *
 * The source attribution and last-reviewed date are mandatory, not decorative:
 * FR-PRP-007 requires every guide cite its source and show when it was last
 * checked, because preparedness advice that silently ages is worse than none.
 */

export function GuideArticle({ guide }: { guide: PublicGuide }) {
  const lang = useLanguage((s) => s.lang);
  const body = pick(lang, guide.body_fil, guide.body_en);

  const blocks = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {blocks.map((line, i) =>
          line.startsWith("## ") ? (
            <h2 key={i} className="text-h2 mt-4 text-neutral-900">
              {line.slice(3)}
            </h2>
          ) : (
            <p key={i} className="text-body-lg text-neutral-700">
              {line}
            </p>
          ),
        )}
      </div>

      <div className="bg-surface-tint flex flex-col gap-3 rounded-[14px] border border-neutral-200 p-4 md:p-6">
        {guide.source_attribution ? (
          <p className="text-body-sm inline-flex items-start gap-2 text-neutral-700">
            <BookMarked aria-hidden className="text-primary-700 mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold">Source: </span>
              {guide.source_attribution}
            </span>
          </p>
        ) : null}

        {guide.last_reviewed_at ? (
          <p className="text-body-sm inline-flex items-start gap-2 text-neutral-700">
            <CalendarCheck
              aria-hidden
              className="text-primary-700 mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="font-semibold">Last reviewed: </span>
              <time dateTime={guide.last_reviewed_at}>
                {formatPhtDate(guide.last_reviewed_at)}
              </time>
            </span>
          </p>
        ) : null}

        <Attribution disclaimer="warning-authority" />
      </div>
    </article>
  );
}
