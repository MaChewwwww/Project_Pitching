"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  Flame,
  Mountain,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
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
    <Card
      radius="xl"
      topAccent
      interactive
      className={cn(
        "group card-hover-lift h-full overflow-hidden bg-white transition-all duration-200",
        className,
      )}
    >
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
        </div>

        <h3 className="text-h3 group-hover:text-primary-800 leading-snug font-bold text-neutral-900 transition-colors">
          {pick(lang, guide.title_fil, guide.title_en)}
        </h3>

        <p className="text-body leading-relaxed text-neutral-600">
          {pick(lang, guide.excerpt_fil, guide.excerpt_en)}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-3">
          <span aria-hidden className="block border-t border-neutral-100" />
          <Link
            href={`/guides/${guide.slug}`}
            className="text-overline text-primary-700 group-hover:text-primary-800 focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm font-bold tracking-wider transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Learn more
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-1.5"
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
