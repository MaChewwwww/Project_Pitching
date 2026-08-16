"use client";

import Link from "next/link";
import { BookMarked, CalendarCheck, ChevronRight, ShieldCheck } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { PageHeader } from "@/components/common/page-header";
import { formatPhtDate } from "@/lib/format";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import type { PublicGuide, PublicGuideSummary } from "@/lib/api/public-types";

const phaseLabel: Record<PublicGuide["phase"], string> = {
  before: "Before The Hazard",
  during: "During The Hazard",
  after: "After The Hazard",
  "n/a": "Preparedness Essential",
};

function titleCase(value: string) {
  return value === "n/a"
    ? "Preparedness Essential"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function GuideDetailView({
  guide,
  related,
}: {
  guide: PublicGuide;
  related: PublicGuideSummary[];
}) {
  const lang = useLanguage((state) => state.lang);
  const title = pick(lang, guide.title_fil, guide.title_en);
  const body = pick(lang, guide.body_fil, guide.body_en);
  const blocks = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Preparedness Guide"
        title={title}
        description={pick(lang, guide.excerpt_fil, guide.excerpt_en)}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Preparedness Guidelines", href: "/guides" },
          { label: title },
        ]}
        action={
          <span className="border-primary-200 bg-primary-50 text-primary-800 rounded-full border px-3.5 py-2 text-xs font-bold tracking-wide uppercase">
            {titleCase(guide.hazard_type)} · {titleCase(guide.phase)}
          </span>
        }
      />

      <div className="mx-auto max-w-[1240px] px-4 py-7 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="lg:col-span-8">
            <div className="border-primary-600 mb-7 border-l-4 pl-4">
              <p className="text-overline text-primary-700">{phaseLabel[guide.phase]}</p>
              <p className="text-body-lg mt-2 leading-8 text-neutral-700">
                Use this guide with official barangay instructions during an emergency.
              </p>
            </div>
            <div className="space-y-5">
              {blocks.map((line, index) =>
                line.startsWith("## ") ? (
                  <h2 key={index} className="text-h2 pt-4 text-neutral-900">
                    {line.slice(3)}
                  </h2>
                ) : (
                  <p key={index} className="text-body-lg leading-8 text-neutral-700">
                    {line}
                  </p>
                ),
              )}
            </div>
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              <section className="border-primary-100 bg-primary-50/65 rounded-2xl border p-5">
                <h2 className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900">
                  <ShieldCheck className="text-primary-700 size-4" /> Guide Record
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                      Hazard
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-900">
                      {titleCase(guide.hazard_type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                      When To Use
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-900">
                      {phaseLabel[guide.phase]}
                    </dd>
                  </div>
                  {guide.source_attribution ? (
                    <div>
                      <dt className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                        <BookMarked className="size-3" /> Source
                      </dt>
                      <dd className="mt-1 leading-relaxed text-neutral-700">
                        {guide.source_attribution}
                      </dd>
                    </div>
                  ) : null}
                  {guide.last_reviewed_at ? (
                    <div>
                      <dt className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                        <CalendarCheck className="size-3" /> Last Reviewed
                      </dt>
                      <dd className="mt-1 font-semibold text-neutral-900">
                        {formatPhtDate(guide.last_reviewed_at)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {related.length ? (
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-neutral-900">Other Guides</h2>
                  <div className="mt-3 divide-y divide-neutral-100">
                    {related.map((item) => (
                      <Link
                        key={item.id}
                        href={`/guides/${item.slug}`}
                        className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span>
                          <span className="text-primary-700 block text-[10px] font-bold tracking-wider uppercase">
                            {titleCase(item.hazard_type)}
                          </span>
                          <span className="group-hover:text-primary-800 mt-1 block text-sm font-semibold text-neutral-900">
                            {pick(lang, item.title_fil, item.title_en)}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-neutral-400" />
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/guides"
                    className="text-primary-700 hover:text-primary-800 mt-4 inline-flex text-sm font-bold"
                  >
                    All Preparedness Guides
                  </Link>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
        <div className="mt-10">
          <Attribution disclaimer="warning-authority" />
        </div>
      </div>
    </>
  );
}
