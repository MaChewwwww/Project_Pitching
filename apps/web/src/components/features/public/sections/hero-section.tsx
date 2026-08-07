import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  MapPin,
  ShieldCheck,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Logo3DPlaceholder } from "../illustrations/logo-3d-placeholder";
import { Hero3DTitleCanvas } from "../illustrations/hero-3d-title-canvas";
import { HeroRainOverlay } from "../illustrations/hero-rain-overlay";
import { HERO } from "@/lib/content/site";
import { formatNumber } from "@/lib/format";
import { getAreaStats } from "@/lib/api/public";

export async function HeroSection() {
  const stats = await getAreaStats();

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
    <section className="bg-white relative overflow-hidden">
      {/* Full Left-Half Atmospheric Rain Overlay (Screen Edge to Center Grid) */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 overflow-hidden pointer-events-none z-0">
        <HeroRainOverlay />
      </div>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2 relative z-10">
        {/* --- copy ---------------------------------------------------------- */}
        <div className="flex flex-col justify-center max-lg:items-center max-lg:text-center gap-3.5 sm:gap-4.5 lg:gap-3.5 xl:gap-5 px-4 py-6 md:px-6 md:py-8 lg:py-4 lg:pr-8 xl:py-8 xl:pr-12 relative z-10">
          <div
            className="hero-sleek-cascade flex items-center justify-center lg:justify-start gap-2 relative z-10"
            style={{ "--hi-delay": "0ms" } as React.CSSProperties}
          >
            <ShieldCheck aria-hidden className="size-4.5 shrink-0 text-primary-600 fill-primary-100/80" strokeWidth={2.2} />
            <span className="text-xs sm:text-body-sm font-semibold text-primary-700 text-center lg:text-left max-w-2xl">
              {HERO.eyebrow}
            </span>
          </div>

          {/* Hidden Accessible H1 for SEO & Screen Readers */}
          <h1 className="sr-only">
            {HERO.titleLine1} {HERO.titleLine2}
          </h1>

          {/* Interactive 3D Title Canvas */}
          <div
            className="hero-sleek-cascade my-[-10px] relative z-10"
            style={{ "--hi-delay": "90ms" } as React.CSSProperties}
          >
            <Hero3DTitleCanvas />
          </div>

          <p
            className="hero-sleek-cascade text-body-lg sm:text-xl lg:text-body-lg xl:text-xl max-w-xl text-neutral-600 leading-relaxed font-normal relative z-10"
            style={{ "--hi-delay": "180ms" } as React.CSSProperties}
          >
            {HERO.lead}
          </p>

          <div
            className="hero-sleek-cascade flex flex-col gap-3.5 sm:flex-row justify-center lg:justify-start pt-1 relative z-10 max-lg:w-full max-lg:items-center"
            style={{ "--hi-delay": "270ms" } as React.CSSProperties}
          >
            <Button asChild pill size="lg" className="max-sm:w-full shadow-glow-primary text-base h-12 px-7 font-bold">
              <Link href={HERO.primaryCta.href}>
                {HERO.primaryCta.label}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" pill size="lg" className="max-sm:w-full text-base h-12 px-7 font-semibold">
              <Link href={HERO.secondaryCta.href}>{HERO.secondaryCta.label}</Link>
            </Button>
          </div>

          <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-1 relative z-10">
            {chips.map((chip, idx) => (
              <li
                key={chip.label}
                className="chip-pop hero-chip inline-flex items-center gap-2.5 sm:gap-3 rounded-full border border-neutral-200/90 bg-white py-2 sm:py-2.5 pr-4 sm:pr-5 pl-2 sm:pl-2.5 shadow-sm-card cursor-pointer"
                style={{ "--chip-delay": `${360 + idx * 90}ms` } as React.CSSProperties}
              >
                <span className="hero-chip-icon bg-primary-100 text-primary-700 grid size-8 sm:size-9 shrink-0 place-items-center rounded-full">
                  <chip.icon aria-hidden className="size-4 sm:size-4.5" strokeWidth={2} />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-body-sm sm:text-label tabular font-bold text-neutral-900">
                    {chip.value}
                  </span>
                  <span className="text-overline text-neutral-500 font-semibold">{chip.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- visual --------------------------------------------------------- */}
        <div
          className="hero-in from-primary-700 via-primary-800 to-primary-950 relative flex h-full min-h-[300px] md:min-h-[360px] lg:min-h-0 flex-col justify-center overflow-hidden bg-gradient-to-br"
          style={{ "--hi-delay": "100ms" } as React.CSSProperties}
        >
          {/* 3D Logo Animation Placeholder */}
          <div className="absolute inset-0 grid place-items-center p-4 md:p-6">
            <Logo3DPlaceholder />
          </div>

          {/* Quick links to the two routes a resident needs during a flood. */}
          <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-center gap-2.5 md:bottom-6 md:inset-x-6 z-10">
            {HERO.quickLinks.map((link) => {
              const Icon = link.icon === "map" ? MapPin : BedDouble;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/30 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none shadow-lg text-caption font-semibold"
                >
                  <Icon aria-hidden className="size-4 text-primary-300" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
