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
    <Card radius="xl" topAccent interactive className={cn("group h-full", className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary-100 text-primary-700 grid size-10 shrink-0 place-items-center rounded-md">
            <Icon aria-hidden className="size-5" strokeWidth={2} />
          </span>
          <span className="text-overline text-primary-700">
            {HAZARD_LABEL[guide.hazard_type]}
          </span>
        </div>

        <h3 className="text-h3 text-neutral-900">
          {pick(lang, guide.title_fil, guide.title_en)}
        </h3>

        <p className="text-body text-neutral-600">
          {pick(lang, guide.excerpt_fil, guide.excerpt_en)}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-3">
          <span aria-hidden className="block border-t border-neutral-200" />
          <Link
            href={`/guides/${guide.slug}`}
            className="text-overline text-primary-700 hover:text-primary-800 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Learn more
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
