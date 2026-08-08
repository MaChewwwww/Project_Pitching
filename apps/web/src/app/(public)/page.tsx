import * as React from "react";

import { SectionBoundary } from "@/components/common/section-boundary";
import {
  CardGridSectionSkeleton,
  DonationDrivesSectionSkeleton,
  FaqSectionSkeleton,
  HazardMapSectionSkeleton,
  HeroSectionSkeleton,
  HotlinesSectionSkeleton,
  StatBandSectionSkeleton,
  WeatherSectionSkeleton,
} from "@/components/common/skeletons";
import { AboutBandSection } from "@/components/features/public/sections/about-band-section";
import { ActivitiesSection } from "@/components/features/public/sections/activities-section";
import { AnnouncementsSection } from "@/components/features/public/sections/announcements-section";
import { DonationDrivesSection } from "@/components/features/public/sections/donation-drives-section";
import { EvacCentersSection } from "@/components/features/public/sections/evac-centers-section";
import { FaqSection } from "@/components/features/public/sections/faq-section";
import { HazardMapSection } from "@/components/features/public/sections/hazard-map-section";
import { HeroSection } from "@/components/features/public/sections/hero-section";
import { HotlinesSection } from "@/components/features/public/sections/hotlines-section";
import { PreparednessSection } from "@/components/features/public/sections/preparedness-section";
import { StatBandSection } from "@/components/features/public/sections/stat-band-section";
import { WeatherSection } from "@/components/features/public/sections/weather-section";

/**
 * The public landing page — M0, sections BR-0.1 through BR-0.12.
 *
 * **An overview, not the whole site.** Every section here is capped and carries a
 * "view all" link to its own route; the full content lives behind those. Before
 * that split this page *was* the site, with the navbar pointing at `#hash`
 * anchors into it, which put a static mission statement above the river level on a
 * 360px screen.
 *
 * Pure composition: this file fetches nothing. **Each section loads its own data**,
 * which is what makes FR-PUB-016 actually hold.
 *
 * That is worth spelling out, because the tidier-looking alternative is a broken
 * one. Fetching everything here in a single `Promise.all` and passing it down as
 * props reads better and keeps the data flow in one place — but it puts every
 * `await` *above* every `SectionBoundary`. One rejected promise then takes the
 * whole page down before a single boundary exists to catch it, which is precisely
 * the failure BR-0.17 describes: "if a dynamic section fails to load — weather
 * feed down, map unavailable — the rest of the page still works."
 *
 * With the fetch inside the section, the throw happens inside the boundary, and a
 * dead weather feed costs exactly one card.
 *
 * **Each section also streams independently.** Every async section sits in its own
 * `<Suspense>`, so the page shell and the already-resolved sections paint while a
 * slow one is still awaiting, instead of the whole body waiting on the slowest
 * fetch. That is the same argument as the boundary, applied to latency rather than
 * failure — and it is what makes the loading states in Definition of Done item 3
 * observable at all: without a Suspense boundary there is no pending state for a
 * Server Component to render, only a longer wait for the first byte.
 *
 * Ordering matters here. `SectionBoundary` is **outside** `Suspense`, so a section
 * that throws after streaming begins is still caught per-section (FR-PUB-016).
 * Inverting them would let the error escape to the route-level `error.tsx`, which
 * replaces the whole page body — the failure BR-0.17 forbids.
 *
 * Sections that return `null` when empty (FR-PUB-018) still get a fallback: it is
 * shown while the fetch is in flight, then replaced by nothing once the section
 * resolves to empty. Reserving that space briefly is the cost of not blocking the
 * rest of the page on it.
 *
 * Section order follows the BRD. The hotlines sit seventh there, which during a
 * flood would be far too low — BR-0.15 is satisfied instead by the floating
 * action button and the utility bar, both always on screen.
 */
export default function LandingPage() {
  return (
    <>
      <SectionBoundary sectionName="Hero">
        <React.Suspense fallback={<HeroSectionSkeleton />}>
          <HeroSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Barangay statistics">
        <React.Suspense fallback={<StatBandSectionSkeleton />}>
          <StatBandSection />
        </React.Suspense>
      </SectionBoundary>

      {/* Static — no fetch, so no Suspense boundary to add. */}
      <SectionBoundary sectionName="About">
        <AboutBandSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Announcements">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading announcements" />}
        >
          <AnnouncementsSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Weather">
        <React.Suspense fallback={<WeatherSectionSkeleton />}>
          <WeatherSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Preparedness">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading preparedness guides" />}
        >
          <PreparednessSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Activities">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading activities" tone="tint" />}
        >
          <ActivitiesSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Hotlines">
        <React.Suspense fallback={<HotlinesSectionSkeleton />}>
          <HotlinesSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Evacuation centres">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading evacuation centres" />}
        >
          <EvacCentersSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Hazard map">
        <React.Suspense fallback={<HazardMapSectionSkeleton />}>
          <HazardMapSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Donation drives">
        <React.Suspense fallback={<DonationDrivesSectionSkeleton />}>
          <DonationDrivesSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="FAQs">
        <React.Suspense fallback={<FaqSectionSkeleton />}>
          <FaqSection />
        </React.Suspense>
      </SectionBoundary>
    </>
  );
}
