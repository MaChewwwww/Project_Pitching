"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  CalendarCheck,
  Flame,
  Mountain,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { formatPhtDate } from "@/lib/format";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type { HazardType, PublicGuideSummary } from "@/lib/api/public-types";

/**
 * A preparedness guide card (FR-PUB-005).
 *
 * Mirrors the reference layout's service card: green top edge, tinted icon chip,
 * uppercase eyebrow, title, body, divider, "LEARN MORE →".
 *
 * A Client Component because it reads the language store — `schema.md` keeps
 * bilingual content in `*_fil` / `*_en` column pairs, so which column renders is
 * a live decision rather than a build-time one.
 */

const ICONS: Record<HazardType, LucideIcon> = {
  flood: Waves,
  earthquake: Mountain,
  typhoon: Wind,
  fire: Flame,
  landslide: Mountain,
  general: Backpack,
  food: Backpack,
};

const HAZARD_LABEL: Record<HazardType, string> = {
  flood: "Flood",
  earthquake: "Earthquake",
  typhoon: "Typhoon",
  fire: "Fire",
  landslide: "Landslide",
  general: "General",
  food: "Emergency food",
};

export function GuideCard({
  guide,
  className,
}: {
  guide: PublicGuideSummary;
  className?: string;
}) {
  const lang = useLanguage((s) => s.lang);
  const Icon = ICONS[guide.hazard_type];

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={cn(
        "group focus-visible:ring-primary-600 block h-full rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label={`Read preparedness guide: ${pick(lang, guide.title_fil, guide.title_en)}`}
    >
      <Card radius="xl" topAccent interactive className="h-full overflow-hidden bg-white">
        <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="from-primary-500 to-primary-700 grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Icon aria-hidden className="size-5" strokeWidth={2} />
              </span>
              <span className="text-caption text-primary-700 bg-primary-50/80 border-primary-100 rounded-full border px-2.5 py-1 font-bold tracking-wider uppercase">
                {HAZARD_LABEL[guide.hazard_type]}
              </span>
            </div>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
              {guide.phase === "n/a" ? "Ready" : guide.phase}
            </span>
          </div>

          <h3 className="text-h3 group-hover:text-primary-800 leading-snug font-bold text-neutral-900 transition-colors">
            {pick(lang, guide.title_fil, guide.title_en)}
          </h3>

          <p className="text-body leading-relaxed text-neutral-600">
            {pick(lang, guide.excerpt_fil, guide.excerpt_en)}
          </p>

          <div className="mt-auto flex flex-col gap-3 pt-3">
            <span aria-hidden className="block border-t border-neutral-100" />
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-neutral-500">
              {guide.last_reviewed_at ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck aria-hidden className="text-primary-600 size-3.5" />
                  Reviewed {formatPhtDate(guide.last_reviewed_at)}
                </span>
              ) : (
                <span />
              )}
              <span className="text-overline text-primary-700 group-hover:text-primary-800 inline-flex items-center gap-2">
                Read guide{" "}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-1.5"
                />
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
