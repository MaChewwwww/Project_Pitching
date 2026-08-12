import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CloudRain,
  MapPin,
  ShieldCheck,
  Thermometer,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Logo3DPlaceholder } from "../illustrations/logo-3d-placeholder";
import { Hero3DTitleCanvas } from "../illustrations/hero-3d-title-canvas";
import { HeroRainOverlay } from "../illustrations/hero-rain-overlay";
import { HERO } from "@/lib/content/site";
import { formatNumber } from "@/lib/format";
import { getAreaStats, getRiverLevel, getWeatherCurrent } from "@/lib/api/public";

export async function HeroSection() {
  const [stats, weather, river] = await Promise.all([
    getAreaStats(),
    getWeatherCurrent(),
    getRiverLevel(),
  ]);

  const tempReading = weather.readings.find((r) => r.metric === "temperature");
  const heatIndexPeak = weather.peak_readings.find((r) => r.metric === "heat_index");
  const rainReading = weather.readings.find((r) => r.metric === "rainfall");
  const rainChanceForecast = weather.forecast.find(
    (f) => f.metric === "precipitation_probability",
  );
  const rainChanceValue = rainChanceForecast
    ? Math.round(rainChanceForecast.value)
    : undefined;

  const chips = [
    {
      icon: ShieldCheck,
      row1: "Barangay",
      row2: "Areas",
      value: "6",
    },
    {
      icon: BedDouble,
      row1: "Evacuation",
      row2: "Centers",
      value: formatNumber(stats.evac_center_count),
    },
    {
      icon: Waves,
      row1: "Hazard",
      row2: "Map",
      value: "5Y",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Full Left-Half Atmospheric Rain Overlay (Screen Edge to Center Grid) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full overflow-hidden lg:w-1/2">
        <HeroRainOverlay />
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1440px] lg:grid-cols-2">
        {/* --- copy ---------------------------------------------------------- */}
        <div className="relative z-10 flex flex-col justify-center gap-3.5 px-4 py-6 max-lg:items-center max-lg:text-center sm:gap-4.5 md:px-6 md:py-8 lg:gap-3.5 lg:py-4 lg:pr-8 xl:gap-5 xl:py-8 xl:pr-12">
          <div
            className="hero-sleek-cascade relative z-10 flex items-center justify-center gap-2 lg:justify-start"
            style={{ "--hi-delay": "0ms" } as React.CSSProperties}
          >
            <ShieldCheck
              aria-hidden
              className="text-primary-600 fill-primary-100/80 size-4.5 shrink-0"
              strokeWidth={2.2}
            />
            <span className="sm:text-body-sm text-primary-700 max-w-2xl text-center text-xs font-semibold lg:text-left">
              {HERO.eyebrow}
            </span>
          </div>

          {/* Hidden Accessible H1 for SEO & Screen Readers */}
          <h1 className="sr-only">
            {HERO.titleLine1} {HERO.titleLine2}
          </h1>

          {/* Interactive 3D Title Canvas */}
          <div
            className="hero-sleek-cascade relative z-10 my-[-10px]"
            style={{ "--hi-delay": "90ms" } as React.CSSProperties}
          >
            <Hero3DTitleCanvas />
          </div>

          <p
            className="hero-sleek-cascade text-body-lg lg:text-body-lg relative z-10 max-w-xl leading-relaxed font-normal text-neutral-600 sm:text-xl xl:text-xl"
            style={{ "--hi-delay": "180ms" } as React.CSSProperties}
          >
            {HERO.lead}
          </p>

          <div
            className="hero-sleek-cascade relative z-10 flex flex-col justify-center gap-3.5 pt-1 max-lg:w-full max-lg:items-center sm:flex-row lg:justify-start"
            style={{ "--hi-delay": "270ms" } as React.CSSProperties}
          >
            <Button
              asChild
              pill
              size="lg"
              className="shadow-glow-primary h-12 px-7 text-base font-bold max-sm:w-full"
            >
              <Link href={HERO.primaryCta.href}>
                {HERO.primaryCta.label}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              pill
              size="lg"
              className="h-12 px-7 text-base font-semibold max-sm:w-full"
            >
              <Link href={HERO.secondaryCta.href}>{HERO.secondaryCta.label}</Link>
            </Button>
          </div>

          <ul className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 pt-1 sm:gap-3 lg:justify-start">
            {chips.map((chip, idx) => (
              <li
                key={chip.row1}
                className="chip-pop hero-chip shadow-sm-card hover:border-primary-300 inline-flex cursor-pointer items-center justify-between gap-3 rounded-full border border-neutral-200/90 bg-white py-1.5 pr-4 pl-2 transition-all hover:shadow-md sm:py-2 sm:pr-4.5 sm:pl-2.5"
                style={{ "--chip-delay": `${360 + idx * 90}ms` } as React.CSSProperties}
              >
                {/* Left Icon occupying full 2-row height */}
                <span className="hero-chip-icon bg-primary-100 text-primary-700 flex size-8 shrink-0 items-center justify-center rounded-full sm:size-9">
                  <chip.icon
                    aria-hidden
                    className="size-4 sm:size-4.5"
                    strokeWidth={2.2}
                  />
                </span>

                {/* Column 1: Row 1 Text & Row 2 Text */}
                <div className="flex flex-col justify-center leading-none">
                  <span className="text-xs font-bold text-neutral-900">{chip.row1}</span>
                  <span className="mt-0.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    {chip.row2}
                  </span>
                </div>

                {/* Column 2: Number occupies both rows */}
                <div className="flex items-center justify-center border-l border-neutral-200/80 pl-2.5">
                  <span className="tabular text-base font-bold tracking-tight text-neutral-800 sm:text-lg">
                    {chip.value}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* --- visual --------------------------------------------------------- */}
        <div
          className="hero-in from-primary-700 via-primary-800 to-primary-950 relative flex h-full min-h-[300px] flex-col justify-center overflow-hidden bg-gradient-to-br md:min-h-[360px] lg:min-h-0"
          style={{ "--hi-delay": "100ms" } as React.CSSProperties}
        >
          {/* Top-Centered Live Weather Floating Metric Pills */}
          <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-center gap-2 md:inset-x-4 md:top-4">
            {/* Temperature & Heat Index Pill */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/40 px-3.5 py-2 text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-black/55">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/20 text-amber-300">
                <Thermometer className="size-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-extrabold tracking-wider text-amber-200/90 uppercase">
                  Temperature &amp; Heat Index
                </span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="tabular text-sm font-black text-white">
                    {tempReading
                      ? `${tempReading.value}${tempReading.unit || "°C"}`
                      : "27.4°C"}
                  </span>
                  <span className="tabular text-[11px] font-bold text-amber-300/90">
                    Peak heat{" "}
                    {heatIndexPeak
                      ? `${heatIndexPeak.value}${heatIndexPeak.unit || "°C"}`
                      : "31°C"}
                  </span>
                </div>
              </div>
            </div>

            {/* Chance of Rain & Rainfall Pill */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/40 px-3.5 py-2 text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-black/55">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/20 text-sky-300">
                <CloudRain className="size-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-extrabold tracking-wider text-sky-200/90 uppercase">
                  Rain Chance
                </span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="tabular text-sm font-black text-white">
                    {rainChanceValue !== undefined ? `${rainChanceValue}%` : "65%"}
                  </span>
                  <span className="tabular text-[11px] font-bold text-sky-200/90">
                    {rainReading ? `${rainReading.value} ${rainReading.unit}` : "12.6 mm"}
                  </span>
                </div>
              </div>
            </div>

            {/* River Level & Alert Pill */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/40 px-3.5 py-2 text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-black/55">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/20 text-emerald-300">
                <Waves className="size-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-extrabold tracking-wider text-emerald-200/90 uppercase">
                  River Level
                </span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="tabular text-sm font-black text-white">
                    {river.reading
                      ? `${river.reading.value} ${river.reading.unit}`
                      : "23.1 m"}
                  </span>
                  {river.alert_level > 0 ? (
                    <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-black text-white uppercase">
                      Lvl {river.alert_level}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-300">Normal</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3D Logo Animation Placeholder */}
          <div className="absolute inset-0 grid place-items-center p-4 md:p-6">
            <Logo3DPlaceholder />
          </div>

          {/* Quick links to the two routes a resident needs during a flood. */}
          <div className="absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-center justify-center gap-2.5 md:inset-x-6 md:bottom-6">
            {HERO.quickLinks.map((link) => {
              const Icon = link.icon === "map" ? MapPin : BedDouble;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-caption inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none active:scale-95"
                >
                  <Icon aria-hidden className="text-primary-300 size-4" />
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
