"use client";

import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  BookMarked,
  CalendarCheck,
  ChevronRight,
  Flame,
  Mountain,
  PhoneCall,
  ShieldCheck,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { PageHeader } from "@/components/common/page-header";
import { NATIONAL_EMERGENCY_HOTLINE } from "@/lib/fixtures/hotlines";
import { formatPhtDate, toTelHref } from "@/lib/format";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import type { HazardType, PublicGuide, PublicGuideSummary } from "@/lib/api/public-types";

const phaseLabel: Record<PublicGuide["phase"], string> = {
  before: "Before The Hazard",
  during: "During The Hazard",
  after: "After The Hazard",
  "n/a": "Preparedness Essential",
};

const ICONS: Record<HazardType, LucideIcon> = {
  flood: Waves,
  earthquake: Mountain,
  typhoon: Wind,
  fire: Flame,
  landslide: Mountain,
  general: Backpack,
  food: Backpack,
};

function titleCase(value: string) {
  return value === "n/a"
    ? "Preparedness Essential"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function GuideBodyRenderer({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-neutral-800">
      {lines.map((line, index) => {
        if (line.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="font-display mb-3 pt-5 text-xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="font-display mb-2 pt-3 text-lg font-bold text-neutral-900">
              {line.slice(4)}
            </h3>
          );
        }
        // Numbered step (e.g., "1. Duck...", "2. Cover...")
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const [, num, text] = numMatch;
          return (
            <div
              key={index}
              className="my-3 flex items-start gap-3.5 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs"
            >
              <span className="bg-primary-700 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs">
                {num}
              </span>
              <p className="text-body-lg leading-relaxed text-neutral-800 pt-0.5">
                {text}
              </p>
            </div>
          );
        }
        // Bullet item (e.g., "- ...", "* ...")
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={index} className="my-2 flex items-start gap-3 pl-1">
              <span className="bg-primary-600 mt-2 size-2 shrink-0 rounded-full" />
              <p className="text-body-lg leading-relaxed text-neutral-700">
                {line.slice(2)}
              </p>
            </div>
          );
        }
        return (
          <p key={index} className="text-body-lg leading-relaxed text-neutral-700">
            {line}
          </p>
        );
      })}
    </div>
  );
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
  const excerpt = pick(lang, guide.excerpt_fil, guide.excerpt_en);
  const body = pick(lang, guide.body_fil, guide.body_en);
  const HazardIcon = ICONS[guide.hazard_type] ?? Backpack;

  return (
    <>
      <PageHeader
        eyebrow="Preparedness Guide"
        title={title}
        description={excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Preparedness Guidelines", href: "/guides" },
          { label: title },
        ]}
        action={
          <div className="flex flex-col items-start justify-center gap-2 shrink-0 sm:items-end sm:self-center">
            <span className="bg-primary-700 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs tracking-wide">
              <HazardIcon className="size-3.5 shrink-0" />
              {titleCase(guide.hazard_type)}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md">
              {phaseLabel[guide.phase]}
            </span>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="lg:col-span-8">
            {/* Phase Callout Box */}
            <div className="mb-7 rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/80 via-surface-tint to-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-800">
                <ShieldCheck className="text-primary-700 size-4 shrink-0" />
                <span>{phaseLabel[guide.phase]}</span>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700">
                Follow these official barangay preparedness instructions for safety before, during, and after an emergency.
              </p>
            </div>

            <GuideBodyRenderer content={body} />
          </article>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs">
                <h3 className="font-display inline-flex items-center gap-2 text-base font-bold text-neutral-900">
                  <ShieldCheck className="text-primary-600 size-4" /> Guide Record
                </h3>
                <dl className="mt-4 space-y-3.5 text-sm">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                    <dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                      Hazard
                    </dt>
                    <dd className="bg-primary-50 text-primary-800 rounded-full px-2.5 py-0.5 text-xs font-bold">
                      {titleCase(guide.hazard_type)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                    <dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                      When To Use
                    </dt>
                    <dd className="font-semibold text-neutral-900 text-xs">
                      {phaseLabel[guide.phase]}
                    </dd>
                  </div>
                  {guide.source_attribution ? (
                    <div className="border-b border-neutral-100 pb-2.5">
                      <dt className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                        <BookMarked className="size-3 text-primary-600" /> Source
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-neutral-700">
                        {guide.source_attribution}
                      </dd>
                    </div>
                  ) : null}
                  {guide.last_reviewed_at ? (
                    <div>
                      <dt className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                        <CalendarCheck className="size-3 text-primary-600" /> Last Reviewed
                      </dt>
                      <dd className="mt-1 text-xs font-semibold text-neutral-900">
                        {formatPhtDate(guide.last_reviewed_at)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {related.length ? (
                <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3">
                    <h3 className="font-display text-base font-bold text-neutral-900">
                      Other Guides
                    </h3>
                    <Link
                      href="/guides"
                      className="text-primary-700 hover:text-primary-800 inline-flex items-center gap-1 text-xs font-bold transition-colors"
                    >
                      All Guides <ArrowRight className="size-3" />
                    </Link>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {related.map((item) => {
                      const ItemIcon = ICONS[item.hazard_type] ?? Backpack;
                      return (
                        <Link
                          key={item.id}
                          href={`/guides/${item.slug}`}
                          className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="bg-primary-50 text-primary-700 grid size-8 shrink-0 place-items-center rounded-lg">
                              <ItemIcon className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="text-primary-700 block text-[10px] font-bold tracking-wider uppercase">
                                {titleCase(item.hazard_type)}
                              </span>
                              <span className="group-hover:text-primary-700 block text-xs font-bold text-neutral-900 truncate">
                                {pick(lang, item.title_fil, item.title_en)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-neutral-400 group-hover:text-primary-700 transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {/* National emergency assistance hotline box */}
              <div className="rounded-2xl bg-gradient-to-br from-primary-950 via-primary-900 to-neutral-900 p-4 text-white shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300">
                  <PhoneCall className="size-3.5 shrink-0" />
                  <span>Emergency Assistance</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                  For immediate rescue or emergency medical assistance, call 911.
                </p>
                <a
                  href={toTelHref(NATIONAL_EMERGENCY_HOTLINE.number)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-500"
                >
                  Call {NATIONAL_EMERGENCY_HOTLINE.number}
                </a>
              </div>
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

