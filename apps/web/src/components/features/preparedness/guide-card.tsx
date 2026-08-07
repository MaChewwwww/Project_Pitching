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
    <Card radius="xl" topAccent interactive className={cn("group h-full transition-all duration-200 card-hover-lift bg-white overflow-hidden", className)}>
      <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-br from-primary-500 to-primary-700 text-white grid size-11 shrink-0 place-items-center rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Icon aria-hidden className="size-5" strokeWidth={2} />
            </span>
            <span className="text-caption font-bold uppercase tracking-wider text-primary-700 bg-primary-50/80 px-2.5 py-1 rounded-full border border-primary-100">
              {HAZARD_LABEL[guide.hazard_type]}
            </span>
          </div>
        </div>

        <h3 className="text-h3 font-bold text-neutral-900 group-hover:text-primary-800 transition-colors leading-snug">
          {pick(lang, guide.title_fil, guide.title_en)}
        </h3>

        <p className="text-body text-neutral-600 leading-relaxed">
          {pick(lang, guide.excerpt_fil, guide.excerpt_en)}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-3">
          <span aria-hidden className="block border-t border-neutral-100" />
          <Link
            href={`/guides/${guide.slug}`}
            className="text-overline font-bold tracking-wider text-primary-700 group-hover:text-primary-800 focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
