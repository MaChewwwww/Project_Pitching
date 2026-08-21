import * as React from "react";
import Image from "next/image";
import {
  CheckCircle2,
  CloudRain,
  Compass,
  Eye,
  GraduationCap,
  HeartPulse,
  Info,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { APP_NAME } from "@/lib/brand";
import {
  MISSION,
  MISSION_PILLARS,
  SDG_ENTRIES,
  TEAM_MEMBERS,
  TeamMember,
  VISION,
  VISION_PILLARS,
} from "@/lib/content/about";
import { Section } from "./section";

/**
 * Reusable Team Member Portrait Avatar Component.
 * Supports a custom uploaded photo via avatarUrl, or renders a modern
 * stylized portrait placeholder frame with silhouette and discipline badge.
 */
function TeamAvatarPlaceholder({
  member,
  themeClass = "bg-primary-700",
}: {
  member: TeamMember;
  themeClass?: string;
}) {
  if (member.avatarUrl) {
    return (
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-primary-200 shadow-sm-card md:size-28">
        <Image
          src={member.avatarUrl}
          alt={member.name}
          fill
          className={
            member.avatarFit === "contain" ? "object-contain" : "object-cover"
          }
        />
      </div>
    );
  }

  // Modern stylized portrait frame with silhouette placeholder & initial badge
  return (
    <div className="group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-200/70 shadow-2xs md:size-28">
      {/* Decorative ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary-600/10 via-transparent to-emerald-500/10 opacity-70 transition group-hover:opacity-100"
      />

      {/* Styled face silhouette */}
      <div className="flex flex-col items-center justify-center text-neutral-400 transition duration-300 group-hover:scale-105 group-hover:text-primary-800">
        <User aria-hidden className="size-12 md:size-14" strokeWidth={1.5} />
      </div>

      {/* Initials badge overlay */}
      <div
        className={`absolute bottom-1.5 right-1.5 rounded-lg ${themeClass} px-2 py-0.5 text-[11px] font-black text-white shadow-xs tabular`}
      >
        {member.initials}
      </div>
    </div>
  );
}

/**
 * Dedicated About Section (FR-PUB-002, BR-0.2) for the `/about` route.
 *
 * Full-scale presentation featuring:
 * 1. Platform Identity & Architecture Bento Hero
 * 2. Strategic Directives: Dual Mission & Vision Bento Cards
 * 3. 3 UN Sustainable Development Goals (SDG 3, 11, 13) with animated glowing icons
 * 4. 4-Member Interdisciplinary Team with approved portraits + Convergence Rail
 */
export function AboutSection() {
  return (
    <Section id="about" tone="tint" className="relative overflow-hidden">
      {/* Ambient background blur elements */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 size-[500px] rounded-full bg-primary-200/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 size-[500px] rounded-full bg-emerald-200/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-12 md:gap-16">
        {/* ===================================================================
            1. PLATFORM OVERVIEW & COMMUNITY READINESS
           =================================================================== */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-primary-900/80 bg-primary-950 text-white shadow-md-card">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-40 left-1/3 size-[520px] rounded-full bg-primary-700/20 blur-3xl"
            />

            <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
              {/* Left Column: Plain-language promise and resident outcomes */}
              <div className="p-6 sm:p-8 md:p-10 lg:p-12">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="border-primary-400/30 bg-primary-800/70 text-primary-200 rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-[0.16em] uppercase">
                    About {APP_NAME}
                  </span>
                  <span className="text-[11px] font-medium text-primary-300/80">
                    San Jose · Rodriguez Rizal
                  </span>
                </div>

                <h2 className="mt-7 max-w-2xl text-3xl leading-[1.05] font-extrabold tracking-[-0.03em] text-white sm:text-4xl md:text-5xl">
                  See the situation.{" "}
                  <span className="text-primary-300">Know the next step.</span>
                </h2>

                <p className="text-body-lg mt-5 max-w-2xl leading-relaxed text-primary-100/80">
                  SAGIP-SJ brings flood information, official updates, evacuation guidance, and preparedness support into one place—so residents and local officials can act with more confidence.
                </p>

                <div className="mt-9 grid gap-5 border-t border-primary-800/90 pt-5 sm:grid-cols-3 sm:gap-4">
                  {[
                    {
                      icon: CloudRain,
                      title: "Know what's happening",
                      desc: "Check river conditions, flood hazards, and trusted barangay updates.",
                    },
                    {
                      icon: MapPin,
                      title: "Know where to go",
                      desc: "Find evacuation centers, maps, and clear guidance before an emergency.",
                    },
                    {
                      icon: Users,
                      title: "Stay ready together",
                      desc: "Share clear information and coordinate support across the community.",
                    },
                  ].map((benefit) => (
                    <div key={benefit.title} className="group border-t border-primary-800/80 pt-4">
                      <span className="bg-primary-400/15 text-primary-200 ring-primary-300/20 grid size-9 place-items-center rounded-xl ring-1 transition group-hover:bg-primary-400/25">
                        <benefit.icon aria-hidden className="size-4" />
                      </span>
                      <p className="text-caption mt-3 font-extrabold leading-tight text-white">
                        {benefit.title}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-primary-100/65">
                        {benefit.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: A simple resident-facing view of what the platform offers */}
              <div className="border-primary-800/90 bg-[#eef8f1] p-6 text-neutral-900 sm:p-8 lg:border-l lg:p-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-overline font-bold tracking-[0.16em] text-primary-700">
                      One place for readiness
                    </p>
                    <h3 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight text-neutral-900">
                      What residents can find
                    </h3>
                  </div>
                  <span className="bg-primary-700 text-primary-50 grid size-11 shrink-0 place-items-center rounded-2xl shadow-xs">
                    <Layers aria-hidden className="size-5" />
                  </span>
                </div>

                <div className="mt-7 divide-y divide-neutral-200/80 border-y border-neutral-200/80">
                  {[
                    {
                      icon: CloudRain,
                      title: "Current conditions",
                      desc: "River, rain, and flood information at a glance.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Trusted updates",
                      desc: "Verified announcements from local officials.",
                    },
                    {
                      icon: MapPin,
                      title: "Clear next steps",
                      desc: "Evacuation centers, maps, and preparedness guidance.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3.5 py-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary-200 bg-white text-primary-700 shadow-2xs">
                        <item.icon aria-hidden className="size-4" />
                      </span>
                      <div>
                        <p className="text-caption font-extrabold text-neutral-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2.5 rounded-2xl bg-primary-900 px-4 py-3 text-xs font-bold text-primary-50">
                  <span aria-hidden className="size-2 rounded-full bg-primary-300 shadow-[0_0_0_4px_rgba(134,239,172,0.12)]" />
                  <span>Public information, accessible from any phone</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ===================================================================
            2. STRATEGIC DIRECTIVES: MISSION & VISION DUAL BENTO CARDS
           =================================================================== */}
        <div className="flex flex-col gap-6 md:gap-8">
          <Reveal>
            <SectionHeader
              icon={Compass}
              title="Our Mission &"
              titleAccent="Vision"
              description="The purpose and direction behind how SAGIP-SJ supports safer, more prepared, and resilient communities."
            />
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            {/* Mission Card */}
            <Reveal delay={1} className="h-full">
              <div className="flex h-full flex-col justify-between rounded-3xl border border-primary-200/90 bg-gradient-to-br from-primary-50/40 via-white to-white p-6 shadow-sm-card transition hover:border-primary-300 hover:shadow-md-card md:p-8">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-10 shrink-0 items-center justify-center">
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-primary-500/30 blur-[6px] animate-pulse"
                      />
                      <span className="relative grid size-10 place-items-center rounded-xl bg-primary-700 text-white shadow-xs">
                        <Compass aria-hidden className="size-5" />
                      </span>
                    </div>
                    <div>
                      <span className="rounded-md border border-primary-200 bg-primary-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-800">
                        Our Mission
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 mt-1">
                        Safer, more prepared, and resilient communities
                      </h3>
                    </div>
                  </div>

                  <p className="text-body text-neutral-700 leading-relaxed border-l-3 border-primary-500 pl-4 py-1 italic bg-primary-50/30 rounded-r-lg">
                    &ldquo;{MISSION}&rdquo;
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <p className="text-caption font-extrabold uppercase tracking-wider text-neutral-500">
                      Core Mission Pillars
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {MISSION_PILLARS.map((pillar) => (
                        <div
                          key={pillar.title}
                          className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white p-3 shadow-2xs"
                        >
                          <CheckCircle2 className="size-4 text-primary-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-caption font-bold text-neutral-900">
                              {pillar.title}
                            </p>
                            <p className="text-[11px] text-neutral-500 leading-normal mt-0.5">
                              {pillar.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Vision Card */}
            <Reveal delay={2} className="h-full">
              <div className="flex h-full flex-col justify-between rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-white p-6 shadow-sm-card transition hover:border-emerald-300 hover:shadow-md-card md:p-8">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-10 shrink-0 items-center justify-center">
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-emerald-500/30 blur-[6px] animate-pulse"
                      />
                      <span className="relative grid size-10 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs">
                        <Eye aria-hidden className="size-5" />
                      </span>
                    </div>
                    <div>
                      <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Our Vision
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 mt-1">
                        Connected readiness for every resident
                      </h3>
                    </div>
                  </div>

                  <p className="text-body text-neutral-700 leading-relaxed border-l-3 border-emerald-500 pl-4 py-1 italic bg-emerald-50/30 rounded-r-lg">
                    &ldquo;{VISION}&rdquo;
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <p className="text-caption font-extrabold uppercase tracking-wider text-neutral-500">
                      Key Vision Outcomes
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {VISION_PILLARS.map((pillar) => (
                        <div
                          key={pillar.title}
                          className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white p-3 shadow-2xs"
                        >
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-caption font-bold text-neutral-900">
                              {pillar.title}
                            </p>
                            <p className="text-[11px] text-neutral-500 leading-normal mt-0.5">
                              {pillar.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ===================================================================
            3. UN SUSTAINABLE DEVELOPMENT GOALS (SDGS 3, 11, 13)
           =================================================================== */}
        <div className="flex flex-col gap-6 md:gap-8">
          <Reveal>
            <SectionHeader
              icon={Info}
              title="Sustainable Development"
              titleAccent="Goals"
              description="How SAGIP-SJ directly advances United Nations SDG commitments within Barangay San Jose's local disaster governance."
            />
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {SDG_ENTRIES.map((sdg, i) => {
              const is13 = sdg.number === 13;
              const is11 = sdg.number === 11;
              const themeColor = is13
                ? {
                    badgeBg: "bg-[#007DBC]",
                    glowBg: "bg-sky-500/30",
                    ringBorder: "border-sky-200 bg-sky-50",
                    iconColor: "text-sky-600",
                    tagClass: "border-sky-200 bg-sky-50 text-sky-800",
                    bulletColor: "bg-sky-600",
                    cardBorder: "hover:border-sky-300",
                  }
                : is11
                  ? {
                      badgeBg: "bg-[#FD9D24]",
                      glowBg: "bg-amber-500/30",
                      ringBorder: "border-amber-200 bg-amber-50",
                      iconColor: "text-amber-600",
                      tagClass: "border-amber-200 bg-amber-50 text-amber-800",
                      bulletColor: "bg-amber-600",
                      cardBorder: "hover:border-amber-300",
                    }
                  : {
                      badgeBg: "bg-[#4C9F38]",
                      glowBg: "bg-green-500/30",
                      ringBorder: "border-green-200 bg-green-50",
                      iconColor: "text-green-600",
                      tagClass: "border-green-200 bg-green-50 text-green-800",
                      bulletColor: "bg-green-600",
                      cardBorder: "hover:border-green-300",
                    };

              const SdgIcon = is13 ? CloudRain : is11 ? ShieldCheck : HeartPulse;

              return (
                <Reveal key={sdg.number} delay={(i as 0 | 1 | 2)} className="h-full">
                  <Card
                    radius="xl"
                    className={`h-full border border-neutral-200/90 shadow-sm-card transition-all duration-300 hover:-translate-y-1 hover:shadow-md-card flex flex-col justify-between ${themeColor.cardBorder}`}
                  >
                    <CardContent className="flex flex-col gap-4 p-6">
                      {/* Top Header Row with Standardized Number Badge & Glowing Pulsing Icon */}
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`grid size-10 place-items-center rounded-xl ${themeColor.badgeBg} text-white text-base font-black shadow-xs tabular`}
                        >
                          {sdg.number}
                        </span>

                        {/* Animated Glowing & Pulsing Icon */}
                        <div className="relative flex size-9 shrink-0 items-center justify-center">
                          <span
                            aria-hidden
                            className={`absolute inset-0 rounded-full ${themeColor.glowBg} blur-[5px] animate-pulse`}
                          />
                          <span
                            className={`relative grid size-9 place-items-center rounded-full border ${themeColor.ringBorder} shadow-2xs`}
                          >
                            <SdgIcon aria-hidden className={`size-4 ${themeColor.iconColor}`} />
                          </span>
                        </div>
                      </div>

                      {/* Title & Tag */}
                      <div className="flex flex-col gap-1">
                        <span
                          className={`self-start rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${themeColor.tagClass}`}
                        >
                          {sdg.tag}
                        </span>
                        <h3 className="text-lg font-bold text-neutral-900 mt-1 leading-snug">
                          {sdg.title}
                        </h3>
                        <p className="mt-1 text-body-sm text-neutral-600 leading-relaxed">
                          {sdg.description}
                        </p>
                      </div>

                      {/* Actionable local highlights */}
                      <div className="mt-2 rounded-xl border border-neutral-100 bg-neutral-50/80 p-3.5">
                        <p className="text-caption font-bold text-neutral-800 mb-2">
                          San Jose DRRM Implementation:
                        </p>
                        <ul className="flex flex-col gap-2">
                          {sdg.highlights.map((point) => (
                            <li
                              key={point}
                              className="flex items-start gap-2 text-[11px] text-neutral-600 leading-normal"
                            >
                              <div className={`size-1.5 rounded-full ${themeColor.bulletColor} shrink-0 mt-1.5`} />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* ===================================================================
            4. THE INTERDISCIPLINARY PROJECT TEAM
           =================================================================== */}
        <div className="flex flex-col gap-6 md:gap-8">
          <Reveal>
            <SectionHeader
              icon={Users}
              title="Interdisciplinary"
              titleAccent="Project Team"
              description="A four-person student team combining technical development, public administration, political economy, and nutrition and dietetics for the SK Project Pitching Competition."
            />
          </Reveal>

          {/* Four profile cards arranged as a balanced team wall */}
          <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5">
            {TEAM_MEMBERS.map((member, i) => (
              <Reveal key={member.id} delay={((i % 2) as 0 | 1)} className="h-full">
                <article className="group flex h-full flex-col gap-5 overflow-hidden rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-sm-card transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-md-card sm:p-6 md:flex-row md:gap-6">
                  <div className="flex shrink-0 items-start justify-between gap-3 md:w-28 md:flex-col">
                    <TeamAvatarPlaceholder member={member} themeClass="bg-primary-50" />
                    <span className="border-primary-200 bg-primary-50 text-primary-800 rounded-full border px-3 py-1 text-center text-caption font-extrabold shadow-2xs md:w-full">
                      {member.programShort}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div>
                      <p className="text-overline text-primary-700 font-bold tracking-wider">
                        {member.discipline}
                      </p>
                      <h3 className="text-h3 mt-1 font-extrabold tracking-tight text-neutral-900">
                        {member.name}
                      </h3>
                      <p className="text-body-sm mt-1 font-bold text-primary-700">
                        {member.role}
                      </p>
                    </div>

                    <div className="border-primary-100 bg-primary-50/60 mt-4 flex items-start gap-2.5 rounded-2xl border p-3">
                      <GraduationCap className="text-primary-700 mt-0.5 size-4 shrink-0" />
                      <p className="text-caption font-semibold leading-snug text-neutral-800">
                        {member.program}
                      </p>
                    </div>

                    <p className="text-body-sm mt-4 leading-relaxed text-neutral-600">
                      {member.focus}
                    </p>

                    <div className="mt-auto border-t border-neutral-100 pt-4">
                      <p className="text-[10px] font-extrabold tracking-wider text-neutral-500 uppercase">
                        Areas of focus
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-medium text-neutral-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {/* Team convergence spotlight */}
          <Reveal delay={2}>
            <div className="relative overflow-hidden rounded-[28px] border border-primary-800 bg-primary-950 p-6 text-white shadow-md-card md:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-primary-700/20 blur-3xl"
              />
              <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)] md:items-end">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="border-primary-400/30 bg-primary-500/20 text-primary-300 grid size-10 place-items-center rounded-xl border">
                      <Sparkles className="size-5" />
                    </span>
                    <span className="border-primary-400/30 bg-primary-800/60 text-primary-200 rounded-md border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                      Collaborative synergy
                    </span>
                  </div>

                  <h3 className="text-xl leading-tight font-extrabold text-white md:text-2xl">
                    4 Disciplines, 1 Unified Disaster Platform
                  </h3>
                  <p className="text-body-sm text-primary-100/80 mt-3 max-w-2xl leading-relaxed">
                    Designed to bridge technical development, governance research,
                    public information, and nutrition risk work in local disaster
                    preparedness and response.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-primary-800/80 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  {TEAM_MEMBERS.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-0.5 border-b border-primary-800/80 pb-2"
                    >
                      <span className="text-[10px] font-extrabold tracking-wider text-primary-300 uppercase">
                        {member.programShort}
                      </span>
                      <span className="text-[11px] leading-snug text-primary-100/80">
                        {member.discipline}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-7 flex items-center justify-between border-t border-primary-800/80 pt-4 text-xs text-primary-300">
                <span className="font-bold">SK Project Pitching 2026</span>
                <span className="text-primary-400">San Jose, Rodriguez Rizal</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
