import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  MapPin,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import {
  BarangayIsometric,
  BarangayIsometricCompact,
} from "../illustrations/barangay-isometric";
import { HeroVisual } from "../illustrations/hero-visual";
import { HERO } from "@/lib/content/site";
import { BARANGAY } from "@/lib/brand";
import { formatNumber } from "@/lib/format";
import { getAreaStats, getRiverLevel } from "@/lib/api/public";

/**
 * The hero (FR-PUB-001, BR-0.1).
 *
 * Follows the reference composition: eyebrow with a location chip, two-tone
 * headline where the second line is green with an underline accent, lead
 * paragraph, a filled pill primary action beside an outline secondary, and a row
 * of trust chips — over a green gradient panel carrying the 3D scene.
 *
 * Two departures from the reference, both deliberate:
 *
 * - **The floating card shows the live river level**, not a marketing line. It is
 *   the number a resident opens this page for, and putting it above the fold with
 *   its timestamp satisfies FR-WX-010 in the place people actually look.
 * - **The prev/next arrows are anchors**, not carousel controls. They scroll to
 *   the hazard map and the evacuation centres. Same shape, zero JavaScript, and
 *   they do something.
 *
 * `APP_NAME` is not in the headline. The name is still an open item (BRD OI-1),
 * and a hero built around a placeholder would have to be rewritten when it
 * resolves; this copy stands on its own either way.
 */

export async function HeroSection() {
  const [river, stats] = await Promise.all([getRiverLevel(), getAreaStats()]);

  const chips = [
    { icon: ShieldCheck, value: "6", label: "Barangay areas" },
    {
      icon: BedDouble,
      value: formatNumber(stats.evac_center_count),
      label: "Evac centres",
    },
    { icon: Waves, value: "5-year", label: "Hazard map" },
  ];

  return (
    <section className="border-b border-neutral-200">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">
        {/* --- copy ---------------------------------------------------------- */}
        <div className="flex flex-col justify-center gap-6 px-4 py-10 md:px-6 md:py-16 lg:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-overline text-primary-700 inline-flex items-center gap-1.5">
              <Sparkles aria-hidden className="size-3.5" />
              {HERO.eyebrow}
            </span>
            <span className="text-caption inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-neutral-600">
              <MapPin aria-hidden className="size-3" />
              {BARANGAY}
            </span>
          </div>

          <h1 className="text-display-xl text-neutral-900">
            {HERO.titleLine1}
            <br />
            <span className="text-primary-600 relative whitespace-nowrap">
              {HERO.titleLine2}
              <span
                aria-hidden
                className="bg-primary-600/40 absolute inset-x-0 -bottom-1.5 block h-1 rounded-full md:-bottom-2 md:h-1.5"
              />
            </span>
          </h1>

          <p className="text-body-lg max-w-xl text-neutral-600">{HERO.lead}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild pill size="lg" className="max-sm:w-full">
              <Link href={HERO.primaryCta.href}>
                {HERO.primaryCta.label}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" pill size="lg" className="max-sm:w-full">
              <Link href={HERO.secondaryCta.href}>{HERO.secondaryCta.label}</Link>
            </Button>
          </div>

          <ul className="flex flex-wrap gap-2.5">
            {chips.map((chip) => (
              <li
                key={chip.label}
                className="inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white py-2 pr-4 pl-2"
              >
                <span className="bg-primary-100 text-primary-700 grid size-8 shrink-0 place-items-center rounded-full">
                  <chip.icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-label tabular text-neutral-900">
                    {chip.value}
                  </span>
                  <span className="text-overline text-neutral-500">{chip.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- visual --------------------------------------------------------- */}
        <div className="from-primary-700 via-primary-800 to-primary-950 relative min-h-[340px] overflow-hidden bg-gradient-to-br md:min-h-[460px] lg:min-h-[560px]">
          {/* Two SVGs, one CSS choice — no JavaScript decides which renders, and
              both are server-rendered markup. */}
          <HeroVisual
            fallbackNode={
              <div className="absolute inset-0 grid place-items-center p-6">
                <BarangayIsometricCompact className="h-auto w-full max-w-md md:hidden" />
                <BarangayIsometric className="hidden h-auto w-full max-w-xl md:block" />
              </div>
            }
          />

          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-end md:inset-x-6 md:bottom-6">
            <div className="pointer-events-auto w-full max-w-xs">
              <RiverLevelPanel river={river} onDark />
            </div>
          </div>

          {/* Anchors, shaped like the reference's carousel controls. */}
          <div className="absolute bottom-4 left-4 flex gap-2 md:bottom-6 md:left-6">
            <a
              href="#hazard-map"
              aria-label="Jump to the hazard map"
              className="grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
            >
              <MapPin aria-hidden className="size-4" />
            </a>
            <a
              href="#evacuation-centers"
              aria-label="Jump to the evacuation centres"
              className="grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
            >
              <BedDouble aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
