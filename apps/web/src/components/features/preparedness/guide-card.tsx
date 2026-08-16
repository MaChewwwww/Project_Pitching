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

import { formatPhtDate } from "@/lib/format";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type { HazardType, PublicGuideSummary } from "@/lib/api/public-types";

/**
 * A preparedness guide card (FR-PUB-005).
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
  food: "Emergency Food",
};

const ICON_GRADIENT: Record<HazardType, string> = {
  flood: "from-cyan-600 to-blue-700",
  earthquake: "from-amber-600 to-amber-800",
  fire: "from-orange-500 to-red-700",
  typhoon: "from-emerald-600 to-teal-800",
  landslide: "from-stone-600 to-amber-900",
  general: "from-emerald-600 to-emerald-800",
  food: "from-emerald-600 to-teal-700",
};

const PHASE_STYLE: Record<string, string> = {
  before: "bg-blue-50 text-blue-800 border-blue-200",
  during: "bg-amber-50 text-amber-900 border-amber-200",
  after: "bg-purple-50 text-purple-800 border-purple-200",
  "n/a": "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function titleCase(value: string) {
  return value === "n/a"
    ? "Ready"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function GuideCard({
  guide,
  className,
}: {
  guide: PublicGuideSummary;
  className?: string;
}) {
  const lang = useLanguage((s) => s.lang);
  const Icon = ICONS[guide.hazard_type];
  const iconGradient = ICON_GRADIENT[guide.hazard_type] ?? "from-primary-600 to-primary-800";
  const phaseStyle = PHASE_STYLE[guide.phase] ?? "bg-neutral-50 text-neutral-700 border-neutral-200";

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={cn(
        "group focus-visible:ring-primary-600 block h-full rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label={`Read Preparedness Guide: ${pick(lang, guide.title_fil, guide.title_en)}`}
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-primary-600 hover:shadow-xl hover:shadow-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-xs transition-transform duration-300 group-hover:scale-105",
                iconGradient,
              )}
            >
              <Icon aria-hidden className="size-5.5" strokeWidth={2} />
            </span>
            <span className="bg-primary-50/80 border-primary-100/90 text-primary-800 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase">
              {HAZARD_LABEL[guide.hazard_type]}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              phaseStyle,
            )}
          >
            {titleCase(guide.phase)}
          </span>
        </div>

        <h3 className="font-display group-hover:text-primary-800 mt-4 text-lg font-bold leading-snug tracking-tight text-neutral-900 transition-colors">
          {pick(lang, guide.title_fil, guide.title_en)}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {pick(lang, guide.excerpt_fil, guide.excerpt_en)}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-5">
          <span aria-hidden className="block border-t border-neutral-100" />
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-neutral-500">
            {guide.last_reviewed_at ? (
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <CalendarCheck aria-hidden className="text-primary-600 size-3.5" />
                Reviewed {formatPhtDate(guide.last_reviewed_at)}
              </span>
            ) : (
              <span />
            )}
            <span className="text-primary-700 group-hover:text-primary-800 inline-flex items-center gap-1.5 font-bold">
              Read Guide{" "}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}

