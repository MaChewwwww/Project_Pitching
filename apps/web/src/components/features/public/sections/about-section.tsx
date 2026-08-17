import * as React from "react";
import Image from "next/image";
import {
  Award,
  CheckCircle2,
  Compass,
  Database,
  Eye,
  GraduationCap,
  Info,
  Layers,
  LucideIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { LogoLockup } from "@/components/common/logo";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import {
  MISSION,
  MISSION_PILLARS,
  SDG_ENTRIES,
  TEAM_MEMBERS,
  TeamMember,
  VISION,
  VISION_PILLARS,
  WHAT_IT_IS,
} from "@/lib/content/about";
import { Section } from "./section";

/**
 * Reusable Team Member Portrait Avatar Placeholder Component.
 * Supports a custom uploaded photo via avatarUrl, or renders a modern
 * stylized portrait placeholder frame with silhouette and initial badge.
 */
function TeamAvatarPlaceholder({
  member,
  size = "lg",
}: {
  member: TeamMember;
  size?: "sm" | "lg";
}) {
  if (member.avatarUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-primary-200 shadow-sm-card ${
          size === "lg" ? "size-28 md:size-32" : "size-12"
        }`}
      >
        <Image
          src={member.avatarUrl}
          alt={member.name}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  // Modern stylized portrait frame with silhouette placeholder & initial badge
  return (
    <div
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary-200/80 bg-gradient-to-b from-primary-50 via-primary-100/50 to-neutral-100 shadow-2xs ${
        size === "lg" ? "size-28 md:size-32" : "size-12"
      }`}
    >
      {/* Decorative ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary-600/10 via-transparent to-emerald-500/10 opacity-70 transition group-hover:opacity-100"
      />

      {/* Styled face silhouette */}
      <div className="flex flex-col items-center justify-center text-primary-800/60 transition duration-300 group-hover:scale-105 group-hover:text-primary-900">
        <User
          aria-hidden
          className={size === "lg" ? "size-14 md:size-16" : "size-6"}
          strokeWidth={1.5}
        />
      </div>

      {/* Initials badge overlay */}
      <div className="absolute bottom-1.5 right-1.5 rounded-md border border-white bg-primary-800 px-1.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
        {member.initials}
      </div>
    </div>
  );
}

/**
 * Dedicated About Section (FR-PUB-002, BR-0.2) for the `/about` route.
 *
 * Full-scale presentation featuring:
 * 1. Platform Identity & Logo Hero Lockup
 * 2. Mission & Vision Architecture with core operational pillars
 * 3. 3 UN Sustainable Development Goals (SDG 13, 11, 3) with official color schemes
 * 4. 5-Member Interdisciplinary Team with full academic degree titles and portrait slots
 * 5. Platform Tenets & Open Data Attributions
 */
export function AboutSection() {
  return (
    <Section id="about" tone="tint" className="relative">
      <div className="flex flex-col gap-12 md:gap-16">
        {/* ===================================================================
            1. PLATFORM IDENTITY & LOGO HERO
           =================================================================== */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary-200/80 bg-gradient-to-br from-white via-primary-50/40 to-emerald-50/30 p-6 shadow-sm-card md:p-10">
            {/* Ambient decorative glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-primary-200/40 blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
              <div className="flex flex-col gap-5">
                {/* Brand eyebrow with Logo */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2.5 rounded-full border border-primary-200 bg-white px-3.5 py-1.5 shadow-2xs">
                    <LogoLockup size={32} variant="mark" />
                    <span className="text-caption font-extrabold tracking-tight text-primary-900">
                      SAGIP-SJ
                    </span>
                  </div>
                  <Badge tone="primary" icon={Sparkles}>
                    SK Project Pitching Competition
                  </Badge>
                  <Badge tone="neutral" icon={Users}>
                    5-Person Interdisciplinary Cohort
                  </Badge>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
                  System for Alert, Guidance, Incident Reporting &{" "}
                  <span className="bg-gradient-to-r from-primary-700 via-primary-600 to-emerald-600 bg-clip-text text-transparent">
                    Preparedness
                  </span>
                </h1>

                {/* Comprehensive narrative */}
                <p className="text-body-lg text-neutral-700 leading-relaxed max-w-2xl">
                  {WHAT_IT_IS}
                </p>

                {/* Key architectural highlights */}
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  {[
                    {
                      icon: Smartphone,
                      title: "Universal 3G Access",
                      desc: "Zero-download web platform optimized for any low-cost mobile phone.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Human-in-the-Loop",
                      desc: "Officer-validated announcements to eliminate false emergency alarms.",
                    },
                    {
                      icon: Database,
                      title: "Persistent Registry",
                      desc: "A living household database that survives recurring flood seasons.",
                    },
                  ].map((feat) => (
                    <div
                      key={feat.title}
                      className="flex flex-col gap-1.5 rounded-xl border border-primary-100 bg-white/80 p-3.5 shadow-2xs"
                    >
                      <feat.icon className="size-4 text-primary-700" />
                      <p className="text-caption font-bold text-neutral-900">
                        {feat.title}
                      </p>
                      <p className="text-[12px] text-neutral-600 leading-normal">
                        {feat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Architectural Brand Emblem Box */}
              <div className="flex flex-col gap-4 rounded-2xl border border-primary-200/90 bg-white/90 p-6 shadow-sm-card backdrop-blur-sm md:p-8">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-primary-600 text-white shadow-2xs">
                    <Layers className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-body font-extrabold text-neutral-900">
                      Barangay San Jose Platform
                    </h3>
                    <p className="text-caption text-neutral-500">
                      Rodriguez (Montalban), Rizal
                    </p>
                  </div>
                </div>

                <p className="text-body-sm text-neutral-600 leading-relaxed">
                  SAGIP-SJ bridges the critical gap between macro-level disaster warnings
                  and localized sitio action. Built specifically around the river topography,
                  flood markers, and community demographics of Barangay San Jose.
                </p>

                <div className="rounded-xl bg-primary-50 p-4 border border-primary-200/70">
                  <div className="flex items-start gap-2.5">
                    <Award className="size-4 text-primary-700 shrink-0 mt-0.5" />
                    <div className="text-caption text-primary-900">
                      <span className="font-bold">Interdisciplinary Design:</span>{" "}
                      Engineered through cross-domain synergy across Information Technology,
                      Political Science, Public Administration, and Nutrition & Dietetics.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ===================================================================
            2. MISSION & VISION DUAL ARCHITECTURE
           =================================================================== */}
        <div className="flex flex-col gap-6">
          <SectionHeader
            align="center"
            rule
            icon={Compass}
            eyebrow="Strategic Directives"
            title="Our Mission &"
            titleAccent="Vision"
            description="Clear institutional mandates driving every system feature, alert threshold, and community workflow."
            className="mx-auto max-w-3xl"
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Mission Card */}
            <Reveal delay={1}>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-primary-200/90 bg-white p-6 shadow-sm-card transition hover:border-primary-300 md:p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary-100 text-primary-800 border border-primary-200">
                      <Compass aria-hidden className="size-5" />
                    </span>
                    <div>
                      <span className="text-overline font-extrabold uppercase tracking-wider text-primary-700">
                        Institutional Directive
                      </span>
                      <h3 className="text-h3 font-bold text-neutral-900">
                        Our Mission
                      </h3>
                    </div>
                  </div>

                  <p className="text-body text-neutral-700 leading-relaxed border-l-2 border-primary-500 pl-3.5 my-1 font-medium italic">
                    &ldquo;{MISSION}&rdquo;
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-caption font-bold uppercase tracking-wider text-neutral-500">
                      Core Mission Pillars
                    </p>
                    {MISSION_PILLARS.map((pillar) => (
                      <div key={pillar.title} className="flex items-start gap-2.5">
                        <CheckCircle2 className="size-4 text-primary-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-caption font-bold text-neutral-900">
                            {pillar.title}
                          </p>
                          <p className="text-[12px] text-neutral-600">
                            {pillar.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Vision Card */}
            <Reveal delay={2}>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-emerald-200/90 bg-white p-6 shadow-sm-card transition hover:border-emerald-300 md:p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Eye aria-hidden className="size-5" />
                    </span>
                    <div>
                      <span className="text-overline font-extrabold uppercase tracking-wider text-emerald-700">
                        Future Horizon
                      </span>
                      <h3 className="text-h3 font-bold text-neutral-900">
                        Our Vision
                      </h3>
                    </div>
                  </div>

                  <p className="text-body text-neutral-700 leading-relaxed border-l-2 border-emerald-500 pl-3.5 my-1 font-medium italic">
                    &ldquo;{VISION}&rdquo;
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-caption font-bold uppercase tracking-wider text-neutral-500">
                      Key Vision Outcomes
                    </p>
                    {VISION_PILLARS.map((pillar) => (
                      <div key={pillar.title} className="flex items-start gap-2.5">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-caption font-bold text-neutral-900">
                            {pillar.title}
                          </p>
                          <p className="text-[12px] text-neutral-600">
                            {pillar.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ===================================================================
            3. UN SUSTAINABLE DEVELOPMENT GOALS (SDGS)
           =================================================================== */}
        <div className="flex flex-col gap-6">
          <SectionHeader
            align="center"
            rule
            icon={Info}
            eyebrow="Global Framework · Local Execution"
            title="Sustainable Development"
            titleAccent="Goals"
            description="How SAGIP-SJ directly advances United Nations SDG commitments within Barangay San Jose's local disaster governance."
            className="mx-auto max-w-3xl"
          />

          <div className="grid gap-6 md:grid-cols-3">
            {SDG_ENTRIES.map((sdg, i) => (
              <Reveal key={sdg.number} delay={(i as 0 | 1 | 2)}>
                <Card
                  radius="xl"
                  className="h-full border border-neutral-200/90 shadow-sm-card transition hover:shadow-md-card flex flex-col justify-between"
                >
                  <CardContent className="flex flex-col gap-4 p-6">
                    {/* SDG Header Row */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid size-12 place-items-center rounded-xl ${sdg.colorScheme.badgeBg} ${sdg.colorScheme.badgeText} text-base font-black shadow-2xs`}
                      >
                        SDG {sdg.number}
                      </span>
                      <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-bold text-neutral-700">
                        {sdg.tag}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-h4 font-bold text-neutral-900">
                        {sdg.title}
                      </h3>
                      <p className="mt-2 text-body-sm text-neutral-600 leading-relaxed">
                        {sdg.description}
                      </p>
                    </div>

                    {/* Actionable local highlights */}
                    <div className="mt-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
                      <p className="text-caption font-bold text-neutral-800 mb-2">
                        Local Implementation in San Jose:
                      </p>
                      <ul className="flex flex-col gap-2">
                        {sdg.highlights.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-2 text-[12px] text-neutral-600"
                          >
                            <div className="size-1.5 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ===================================================================
            4. THE PROJECT TEAM (5 INTERDISCIPLINARY MEMBERS)
           =================================================================== */}
        <div className="flex flex-col gap-6">
          <SectionHeader
            align="center"
            rule
            icon={Users}
            eyebrow="The Minds Behind SAGIP-SJ"
            title="Interdisciplinary"
            titleAccent="Project Team"
            description="A 5-person cohort combining software development, public administration, disaster policy, and community nutrition for the SK Project Pitching Competition."
            className="mx-auto max-w-3xl"
          />

          {/* 5 Members Grid (3 on top row, 2 centered on bottom row) */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {TEAM_MEMBERS.map((member, i) => (
              <Reveal
                key={member.id}
                delay={((i % 3) as 0 | 1 | 2)}
                className={i >= 3 ? "lg:col-span-1" : ""}
              >
                <div className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm-card transition duration-300 hover:border-primary-300 hover:shadow-md-card">
                  <div className="flex flex-col gap-4">
                    {/* Top row: Avatar & Program Tag */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Portrait Face Placeholder with Initial Badge */}
                      <TeamAvatarPlaceholder member={member} size="lg" />

                      <div className="flex flex-col items-end gap-1.5">
                        {/* Program Acronym Pill */}
                        <span className="rounded-full border border-primary-200 bg-primary-100 px-3 py-1 text-caption font-extrabold text-primary-900 shadow-2xs">
                          {member.programShort}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-500">
                          {member.discipline}
                        </span>
                      </div>
                    </div>

                    {/* Member Details */}
                    <div>
                      <h3 className="text-h4 font-extrabold text-neutral-900">
                        {member.name}
                      </h3>
                      <p className="text-body-sm font-bold text-primary-700 mt-0.5">
                        {member.role}
                      </p>

                      {/* Full Academic Degree Title */}
                      <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-neutral-50 p-2 border border-neutral-100">
                        <GraduationCap className="size-4 text-primary-600 shrink-0 mt-0.5" />
                        <p className="text-caption font-semibold text-neutral-800 leading-snug">
                          {member.program}
                        </p>
                      </div>

                      {/* Discipline Contribution Narrative */}
                      <p className="mt-3 text-body-sm text-neutral-600 leading-relaxed">
                        {member.focus}
                      </p>
                    </div>
                  </div>

                  {/* Skills / Key Tags */}
                  <div className="mt-5 border-t border-neutral-100 pt-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {member.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

