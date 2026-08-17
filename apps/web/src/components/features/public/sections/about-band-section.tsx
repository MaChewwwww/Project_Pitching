import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Eye,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { LogoLockup } from "@/components/common/logo";
import { Reveal } from "@/components/common/reveal";
import {
  HISTORY_BADGE,
  MISSION,
  SDG_ENTRIES,
  TEAM_MEMBERS,
  VISION,
  WHAT_IT_IS,
} from "@/lib/content/about";
import { Section } from "./section";

/**
 * Redesigned About Band Section (FR-PUB-002, BR-0.2) for the landing page.
 *
 * Space-efficient, high-impact presentation featuring:
 * - Brand Logo & Identity Anchor
 * - Platform Overview & Problem Statement
 * - Mission & Vision Highlights
 * - 3 UN Sustainable Development Goals (SDG 13, 11, 3)
 * - 5-Member Interdisciplinary Team Strip with abbreviated program tags (BSIT, BPA, BA PolSci, BSND)
 * - Historical Benchmark Context (Ondoy 2009)
 */
export function AboutBandSection() {
  return (
    <Section id="about" tone="tint" className="relative overflow-hidden">
      {/* Subtle ambient decorative gradient behind section */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-primary-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-0 size-96 rounded-full bg-emerald-200/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-8 md:gap-10">
        {/* --- Top Row: Brand & Main Overview + Ondoy Stat Card --- */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8 items-stretch">
          <Reveal>
            <div className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-sm-card backdrop-blur-sm md:p-8">
              <div className="flex flex-col gap-4">
                {/* Brand pill & Eyebrow */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 shadow-2xs">
                    <LogoLockup size={32} variant="mark" />
                    <span className="text-caption font-bold tracking-tight text-primary-900">
                      SAGIP-SJ Initiative
                    </span>
                  </div>
                  <Badge tone="primary" icon={Sparkles}>
                    SK Pitching Prototype
                  </Badge>
                </div>

                {/* Headline */}
                <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
                  Engineering Resilience for{" "}
                  <span className="relative inline-block bg-gradient-to-r from-primary-700 via-primary-600 to-emerald-600 bg-clip-text text-transparent">
                    Barangay San Jose
                    <span
                      aria-hidden
                      className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-primary-500/30"
                    />
                  </span>
                </h2>

                {/* Description */}
                <p className="text-body-lg text-neutral-600 leading-relaxed">
                  {WHAT_IT_IS.split("\n\n")[0]}
                </p>
              </div>

              {/* Bottom CTA to dedicated about */}
              <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-neutral-100">
                <Button asChild pill size="md" className="gap-2">
                  <Link href="/about">
                    <span>Explore Full Story & Team</span>
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </Button>
                <span className="text-caption text-neutral-500 font-medium">
                  5 disciplines · 3 SDGs · 1 unified platform
                </span>
              </div>
            </div>
          </Reveal>

          {/* Right: Ondoy High-Water Mark Benchmark Card */}
          <Reveal delay={1}>
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 via-primary-950 to-neutral-950 p-6 text-white shadow-md-card md:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 size-44 rounded-full bg-primary-500/10 blur-2xl"
              />

              <div>
                <div className="flex items-center justify-between gap-2 border-b border-primary-800/60 pb-3">
                  <span className="text-overline tracking-wider text-primary-300">
                    HISTORICAL BENCHMARK
                  </span>
                  <span className="inline-flex items-center rounded-md bg-primary-900/90 px-2 py-0.5 text-[11px] font-semibold text-primary-200 border border-primary-700/60">
                    San Jose Flood Datum
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-display-lg font-black tracking-tight text-white tabular">
                      {HISTORY_BADGE.value}
                    </span>
                    <span className="text-xl font-bold text-amber-400">
                      Ondoy Peak
                    </span>
                  </div>
                  <p className="text-caption font-semibold uppercase tracking-wider text-primary-300 mt-1">
                    {HISTORY_BADGE.label}
                  </p>
                  <p className="mt-3 text-body-sm text-primary-100/85 leading-relaxed">
                    {HISTORY_BADGE.caption}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-primary-800/80 bg-primary-900/50 p-3.5 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <p className="text-caption text-primary-200 leading-snug">
                    Real-time PAGASA water telemetry & Project NOAH 5-yr hazard integration.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* --- Middle Row: Mission & Vision Cards --- */}
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
          <Reveal delay={1}>
            <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-primary-200/70 bg-white p-5 shadow-sm-card transition-all hover:border-primary-300 hover:shadow-md-card md:p-6">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-100 text-primary-800 border border-primary-200/80">
                    <Compass aria-hidden className="size-5" />
                  </span>
                  <span className="text-overline font-extrabold uppercase tracking-wider text-primary-700">
                    Our Mission
                  </span>
                </div>
                <h3 className="text-h4 font-bold text-neutral-900">
                  Proactive Disaster Management
                </h3>
                <p className="text-body-sm text-neutral-600 leading-relaxed">
                  {MISSION}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-emerald-200/70 bg-white p-5 shadow-sm-card transition-all hover:border-emerald-300 hover:shadow-md-card md:p-6">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                    <Eye aria-hidden className="size-5" />
                  </span>
                  <span className="text-overline font-extrabold uppercase tracking-wider text-emerald-700">
                    Our Vision
                  </span>
                </div>
                <h3 className="text-h4 font-bold text-neutral-900">
                  Zero-Overlooked Community Resilience
                </h3>
                <p className="text-body-sm text-neutral-600 leading-relaxed">
                  {VISION}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* --- Bottom Row: 3 SDGs + Compact 5-Member Team Strip --- */}
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          {/* 3 SDGs (5 cols on lg) */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-overline font-bold tracking-wider text-neutral-500 uppercase">
                UN Sustainable Development Goals
              </span>
              <span className="text-caption font-semibold text-primary-700">
                3 Key Alignments
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {SDG_ENTRIES.map((sdg, i) => (
                <Reveal key={sdg.number} delay={(i as 0 | 1 | 2)}>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-primary-300">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${sdg.colorScheme.badgeBg} ${sdg.colorScheme.badgeText} text-xs font-black shadow-2xs`}
                      >
                        {sdg.number}
                      </span>
                      <div className="truncate">
                        <p className="text-body-sm font-bold text-neutral-900 truncate">
                          {sdg.title}
                        </p>
                        <p className="text-caption text-neutral-500 truncate">
                          {sdg.tag.split("·")[1]?.trim() ?? sdg.tag}
                        </p>
                      </div>
                    </div>
                    <sdg.icon aria-hidden className="size-4 shrink-0 text-neutral-400" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Space-Conserving 5-Member Team Showcase (7 cols on lg) */}
          <div className="flex flex-col gap-3 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users aria-hidden className="size-4 text-primary-700" />
                <span className="text-overline font-bold tracking-wider text-neutral-500 uppercase">
                  Interdisciplinary Project Team
                </span>
              </div>
              <span className="text-caption font-bold text-primary-800 bg-primary-100/80 px-2 py-0.5 rounded-md border border-primary-200">
                5 Members
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm-card">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {TEAM_MEMBERS.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 transition hover:bg-primary-50/50 hover:border-primary-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Face Avatar Silhouette Placeholder */}
                      <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary-200/80 bg-gradient-to-b from-primary-100 to-neutral-200 text-primary-900 shadow-2xs">
                        <Users aria-hidden className="size-4.5 opacity-60" />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-primary-800 px-1 py-0.2 text-[8px] font-black text-white leading-none">
                          {member.initials}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-caption font-bold text-neutral-900 truncate leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate leading-tight mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    {/* Space-conserved program abbreviation badge */}
                    <span
                      title={member.program}
                      className="shrink-0 rounded-md border border-primary-200 bg-primary-100/90 px-2 py-0.5 text-[11px] font-extrabold text-primary-900 shadow-2xs"
                    >
                      {member.programShort}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer row inside team box */}
              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-caption text-neutral-500">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <GraduationCap aria-hidden className="size-3.5 text-primary-600" />
                  PolSci · PubAd · Nutrition & Dietetics · IT
                </span>
                <Link
                  href="/about"
                  className="font-bold text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1"
                >
                  <span>Full Bios</span>
                  <ArrowRight aria-hidden className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

