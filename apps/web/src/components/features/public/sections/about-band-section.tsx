import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Eye,
  GraduationCap,
  HeartPulse,
  Smartphone,
  Users,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
import {
  MISSION,
  SDG_ENTRIES,
  TEAM_MEMBERS,
  VISION,
  WHAT_IT_IS,
} from "@/lib/content/about";
import { Section } from "./section";

const TEAM_FOCUS = [
  { label: "Research", detail: "Understand local risk", icon: BookOpen },
  { label: "Community", detail: "Listen to residents", icon: UsersRound },
  { label: "Health", detail: "Protect everyday life", icon: HeartPulse },
  { label: "Digital reach", detail: "Make help easier to find", icon: Smartphone },
] as const;

/**
 * Redesigned About Band Section (FR-PUB-002, BR-0.2) for the landing page.
 *
 * Space-maximizing layout:
 * - Top Row: Preserved signature brand overview title card.
 * - Bottom Row: Balanced 2-column bento grid (Left: Mission, Vision, SDGs; Right: 4-Member Team).
 */
export function AboutBandSection() {
  return (
    <Section id="about" tone="tint" className="relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div
        aria-hidden
        className="bg-primary-200/30 pointer-events-none absolute -top-24 right-0 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-0 size-96 rounded-full bg-emerald-200/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 md:gap-8">
        {/* --- Top Row: Brand & Main Overview + UN SDGs Panel --- */}
        <Reveal>
          <div className="shadow-sm-card rounded-3xl border border-neutral-200/80 bg-white/90 p-6 backdrop-blur-sm md:p-8">
            <div className="grid min-w-0 items-center gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Left Column: Brand Title, Description, & CTA (7 cols on lg) */}
              <div className="flex min-w-0 flex-col justify-between gap-6 lg:col-span-7">
                <div className="flex flex-col gap-3.5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
                    About the{" "}
                    <span className="from-primary-700 via-primary-600 relative inline-block bg-gradient-to-r to-emerald-600 bg-clip-text text-transparent">
                      SAGIP Platform
                      <span
                        aria-hidden
                        className="bg-primary-500/30 absolute -bottom-1 left-0 h-[3px] w-full rounded-full"
                      />
                    </span>
                  </h2>

                  <p className="text-body-lg max-w-2xl leading-relaxed text-neutral-600">
                    {WHAT_IT_IS.split("\n\n")[0]}
                  </p>
                </div>

                <div className="pt-2">
                  <Button asChild pill size="md" className="gap-2">
                    <Link href="/about">
                      <span>Explore Full Story & Team</span>
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Redesigned UN SDGs Panel (5 cols on lg) */}
              <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 lg:col-span-5">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
                  <span className="text-primary-700 min-w-0 text-[11px] font-extrabold tracking-wider uppercase">
                    UN Sustainable Development Goals
                  </span>
                  <span className="shrink-0 text-[11px] font-extrabold text-orange-600">
                    3 Key Alignments
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {SDG_ENTRIES.map((sdg) => {
                    const iconColor =
                      sdg.number === 13
                        ? "text-sky-600"
                        : sdg.number === 11
                          ? "text-amber-600"
                          : "text-green-600";
                    const glowBg =
                      sdg.number === 13
                        ? "bg-sky-500/30"
                        : sdg.number === 11
                          ? "bg-amber-500/30"
                          : "bg-green-500/30";
                    const ringColor =
                      sdg.number === 13
                        ? "border-sky-200 bg-sky-50/80"
                        : sdg.number === 11
                          ? "border-amber-200 bg-amber-50/80"
                          : "border-green-200 bg-green-50/80";

                    return (
                      <div
                        key={sdg.number}
                        className="group hover:border-primary-300 relative flex items-center justify-between gap-3.5 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-3 px-4 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          {/* Standardized SDG Number Badge */}
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-xl ${sdg.colorScheme.badgeBg} tabular text-sm font-black text-white shadow-xs ring-1 ring-black/5`}
                          >
                            {sdg.number}
                          </span>

                          {/* Title */}
                          <p className="group-hover:text-primary-800 truncate text-sm font-bold text-neutral-900 transition sm:text-base">
                            {sdg.title}
                          </p>
                        </div>

                        {/* Animated Glowing & Pulsing Icon */}
                        <div className="relative flex size-8 shrink-0 items-center justify-center">
                          {/* Pulsing ambient glow aura */}
                          <span
                            aria-hidden
                            className={`absolute inset-0 rounded-full ${glowBg} animate-pulse blur-[5px]`}
                          />
                          {/* Icon Container Pill */}
                          <span
                            className={`relative grid size-8 place-items-center rounded-full border ${ringColor} shadow-2xs transition-transform duration-300 group-hover:scale-110`}
                          >
                            <sdg.icon aria-hidden className={`size-4 ${iconColor}`} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* --- Bottom Row: Mission, Vision, & Interdisciplinary Team --- */}
        <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Two Styled Bento Cards for Mission & Vision (5 cols on lg) */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
            {/* Our Mission Card */}
            <Reveal delay={1}>
              <div className="group border-primary-200/90 from-primary-50/50 shadow-sm-card hover:border-primary-300 relative flex flex-col gap-3 rounded-2xl border bg-gradient-to-br via-white to-white p-5 transition-all duration-300 hover:shadow-xs sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Glowing animated icon */}
                    <div className="relative flex size-8 shrink-0 items-center justify-center">
                      <span
                        aria-hidden
                        className="bg-primary-500/30 absolute inset-0 animate-pulse rounded-xl blur-[5px]"
                      />
                      <span className="bg-primary-700 relative grid size-8 place-items-center rounded-xl text-white shadow-xs">
                        <Compass aria-hidden className="size-4" />
                      </span>
                    </div>
                    <span className="border-primary-200 bg-primary-100/90 text-primary-800 rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                      Our Mission
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm leading-snug font-bold text-neutral-900 sm:text-base">
                    Safer, more prepared, and resilient communities
                  </h3>
                  <p className="text-body-sm leading-relaxed text-neutral-600">
                    {MISSION}
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Our Vision Card */}
            <Reveal delay={2}>
              <div className="group shadow-sm-card relative flex flex-col gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 transition-all duration-300 hover:border-emerald-300 hover:shadow-xs sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Glowing animated icon */}
                    <div className="relative flex size-8 shrink-0 items-center justify-center">
                      <span
                        aria-hidden
                        className="absolute inset-0 animate-pulse rounded-xl bg-emerald-500/30 blur-[5px]"
                      />
                      <span className="relative grid size-8 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs">
                        <Eye aria-hidden className="size-4" />
                      </span>
                    </div>
                    <span className="rounded-md border border-emerald-200 bg-emerald-100/90 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase">
                      Our Vision
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm leading-snug font-bold text-neutral-900 sm:text-base">
                    Connected readiness for every resident
                  </h3>
                  <p className="text-body-sm leading-relaxed text-neutral-600">
                    {VISION}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interdisciplinary Project Team (7 cols on lg) */}
          <div className="flex min-w-0 flex-col self-start lg:col-span-7">
            <Reveal delay={2}>
              <div className="shadow-sm-card flex flex-col rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4">
                  {/* Header with Title & Live Pulse Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="bg-primary-100 text-primary-800 border-primary-200/80 grid size-8 place-items-center rounded-xl border shadow-2xs">
                        <Users aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm leading-tight font-bold text-neutral-900 sm:text-base">
                          Interdisciplinary Project Team
                        </h3>
                        <p className="mt-0.5 text-[11px] text-neutral-500">
                          SK Project Pitching Prototype
                        </p>
                      </div>
                    </div>
                    <span className="border-primary-200 bg-primary-50 text-primary-900 inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-bold">
                      4 members
                    </span>
                  </div>

                  {/* 4 Members Grid with portrait thumbnails and discipline badges */}
                  <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
                    {TEAM_MEMBERS.map((member) => {
                      const themeMap: Record<
                        string,
                        { avatarBg: string; tagClass: string }
                      > = {
                        "member-1": {
                          avatarBg: "bg-primary-50",
                          tagClass: "border-primary-200 bg-primary-50/90 text-primary-800",
                        },
                        "member-2": {
                          avatarBg: "bg-primary-50",
                          tagClass: "border-primary-200 bg-primary-50/90 text-primary-800",
                        },
                        "member-3": {
                          avatarBg: "bg-primary-50",
                          tagClass: "border-primary-200 bg-primary-50/90 text-primary-800",
                        },
                        "member-4": {
                          avatarBg: "bg-primary-50",
                          tagClass: "border-primary-200 bg-primary-50/90 text-primary-800",
                        },
                      };

                      const theme = themeMap[member.id] ?? {
                        avatarBg: "bg-primary-50",
                        tagClass: "border-primary-200 bg-primary-50/90 text-primary-800",
                      };

                      return (
                        <div
                          key={member.id}
                          className="group hover:border-primary-300 relative flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-2xs"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary-200/80 ${theme.avatarBg} tabular text-xs font-extrabold text-primary-800 shadow-2xs`}
                            >
                              {member.avatarUrl ? (
                                <Image
                                  src={member.avatarUrl}
                                  alt={`${member.name} profile`}
                                  fill
                                  sizes="40px"
                                  className={
                                    member.avatarFit === "contain"
                                      ? "object-contain"
                                      : "object-cover"
                                  }
                                />
                              ) : (
                                member.initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-caption group-hover:text-primary-800 truncate leading-tight font-bold text-neutral-900 transition">
                                {member.name}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] leading-tight text-neutral-500">
                                {member.role}
                              </p>
                            </div>
                          </div>

                          {/* Program Tag */}
                          <span
                            title={member.program}
                            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold shadow-2xs ${theme.tagClass}`}
                          >
                            {member.programShort}
                          </span>
                        </div>
                      );
                    })}

                    {/* Team synthesis panel: turns the remaining card space into a clear shared purpose. */}
                    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-primary-900/80 bg-gradient-to-br from-primary-950 via-primary-900 to-emerald-950 p-4 text-white shadow-xs sm:col-span-2 sm:p-5">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full border border-emerald-200/15"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-2 -bottom-20 size-44 rounded-full border border-white/10"
                      />

                      <div className="relative">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/15 text-emerald-200">
                              <GraduationCap aria-hidden className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-extrabold tracking-[0.12em] text-emerald-200 uppercase">
                                Shared focus
                              </p>
                              <h4 className="mt-1 text-base leading-tight font-extrabold sm:text-lg">
                                Four perspectives. One safer next step.
                              </h4>
                            </div>
                          </div>
                          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-emerald-100">
                            BAPE · BPA · BSND · BSIT
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {TEAM_FOCUS.map((focus) => {
                            const FocusIcon = focus.icon;

                            return (
                              <div
                                key={focus.label}
                                className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5 transition-colors hover:bg-white/[0.12]"
                              >
                                <FocusIcon
                                  aria-hidden
                                  className="size-4 text-emerald-200"
                                  strokeWidth={2.1}
                                />
                                <p className="mt-2 text-[11px] font-extrabold text-white">
                                  {focus.label}
                                </p>
                                <p className="mt-0.5 text-[10px] leading-snug text-primary-100/65">
                                  {focus.detail}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}
