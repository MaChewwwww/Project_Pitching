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

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import {
  MISSION,
  SDG_ENTRIES,
  TEAM_MEMBERS,
  VISION,
} from "@/lib/content/about";
import { Section } from "./section";

/**
 * Redesigned About Band Section (FR-PUB-002, BR-0.2) for the landing page.
 *
 * Space-maximizing, cohesive layout following public page design patterns:
 * - Standard SectionHeader with title, titleAccent, eyebrow, and view action.
 * - Left column: Integrated Mission, Vision, and UN SDG alignments.
 * - Right column: 5-Member Interdisciplinary Team showcase with discipline tags.
 */
export function AboutBandSection() {
  return (
    <Section id="about" tone="tint" className="relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-primary-200/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-0 size-96 rounded-full bg-emerald-200/20 blur-3xl"
      />

      <div className="relative flex flex-col">
        {/* --- Standard Public Section Header --- */}
        <Reveal>
          <SectionHeader
            icon={Sparkles}
            eyebrow="Platform & Student Team"
            title="About the"
            titleAccent="SAGIP Platform"
            description="A centralized disaster readiness and community health platform for Barangay San Jose — engineered for low-bandwidth mobile devices and grounded in proactive DRRM governance."
            action={
              <Button
                asChild
                variant="outline"
                pill
                size="md"
                className="shrink-0 max-sm:px-3"
              >
                <Link href="/about" aria-label="Explore Full Story & Team">
                  <span className="hidden sm:inline">Explore Full Story & Team</span>
                  <span className="sm:hidden">Full Story</span>
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            }
          />
        </Reveal>

        {/* --- Bento Grid Layout --- */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
          {/* Left Column: Mission, Vision, & UN SDGs (5 cols on lg) */}
          <div className="flex flex-col lg:col-span-5">
            <Reveal delay={1} className="h-full">
              <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm-card h-full">
                <div className="flex flex-col gap-4">
                  {/* Mission */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-primary-100 text-primary-800 border border-primary-200/80">
                        <Compass aria-hidden className="size-4" />
                      </span>
                      <span className="text-overline font-extrabold uppercase tracking-wider text-primary-700">
                        Our Mission
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                      Proactive Disaster Management
                    </h3>
                    <p className="text-body-sm text-neutral-600 leading-relaxed">
                      {MISSION}
                    </p>
                  </div>

                  {/* Subtle Divider */}
                  <hr className="border-neutral-100" />

                  {/* Vision */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                        <Eye aria-hidden className="size-4" />
                      </span>
                      <span className="text-overline font-extrabold uppercase tracking-wider text-emerald-700">
                        Our Vision
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                      Zero-Overlooked Community Resilience
                    </h3>
                    <p className="text-body-sm text-neutral-600 leading-relaxed">
                      {VISION}
                    </p>
                  </div>
                </div>

                {/* 3 UN SDGs Alignment Strip */}
                <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold tracking-wider text-neutral-500 uppercase">
                      UN SDG Alignments
                    </span>
                    <span className="text-[11px] font-bold text-primary-700">
                      3 Key Targets
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {SDG_ENTRIES.map((sdg) => (
                      <div
                        key={sdg.number}
                        className="flex flex-col items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-2 text-center transition hover:bg-white hover:border-primary-300"
                      >
                        <span
                          className={`grid size-6 place-items-center rounded-md ${sdg.colorScheme.badgeBg} ${sdg.colorScheme.badgeText} text-[10px] font-black shadow-2xs mb-1`}
                        >
                          {sdg.number}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-900 line-clamp-1 leading-tight">
                          {sdg.title.split(" ")[0]}
                        </span>
                        <span className="text-[9px] text-neutral-500 line-clamp-1 leading-tight">
                          {sdg.number === 13 ? "Climate" : sdg.number === 11 ? "Cities" : "Health"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interdisciplinary Project Team (7 cols on lg) */}
          <div className="flex flex-col lg:col-span-7">
            <Reveal delay={2} className="h-full">
              <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm-card h-full">
                <div className="flex flex-col gap-4">
                  {/* Header with Title & Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-primary-100 text-primary-800 border border-primary-200/80">
                        <Users aria-hidden className="size-4" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                          Interdisciplinary Project Team
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          SK Project Pitching Prototype
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-primary-200 bg-primary-100/90 px-2 py-0.5 text-[11px] font-extrabold text-primary-900">
                      5 Members
                    </span>
                  </div>

                  {/* 5 Members Grid */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {TEAM_MEMBERS.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2.5 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-2.5 transition hover:bg-primary-50/40 hover:border-primary-300"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Stylized Initials Badge */}
                          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary-200/80 bg-gradient-to-b from-primary-100 to-neutral-100 text-primary-900 shadow-2xs font-extrabold text-xs">
                            {member.initials}
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

                        {/* Program Tag */}
                        <span
                          title={member.program}
                          className="shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-extrabold text-neutral-700 shadow-2xs"
                        >
                          {member.programShort}
                        </span>
                      </div>
                    ))}

                    {/* 6th Slot: Discipline Integration Banner */}
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 bg-primary-50/30 p-2.5 text-center">
                      <GraduationCap aria-hidden className="size-4 text-primary-700 shrink-0" />
                      <span className="text-[11px] font-bold text-primary-900 leading-tight">
                        PolSci · PubAd · Nutrition · IT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-caption text-neutral-500">
                  <span className="font-medium text-xs">
                    Combining policy, public health, nutrition & resilient tech
                  </span>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-1 font-bold text-primary-700 hover:text-primary-800 hover:underline text-xs shrink-0"
                  >
                    <span>Full Bios & Methodology</span>
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}

