import * as React from "react";

import { SectionBoundary } from "@/components/common/section-boundary";
import {
  CardGridSectionSkeleton,
  DonationDrivesSectionSkeleton,
  FaqSectionSkeleton,
  HazardMapSectionSkeleton,
  HeroSectionSkeleton,
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
import { PreparednessSection } from "@/components/features/public/sections/preparedness-section";
import { StatBandSection } from "@/components/features/public/sections/stat-band-section";
import { WeatherSection } from "@/components/features/public/sections/weather-section";

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

      <SectionBoundary sectionName="Hazard map">
        <React.Suspense fallback={<HazardMapSectionSkeleton />}>
          <HazardMapSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Preparedness">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading preparedness guidelines" />}
        >
          <PreparednessSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Evacuation centers">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading evacuation centers" />}
        >
          <EvacCentersSection />
        </React.Suspense>
      </SectionBoundary>

      <SectionBoundary sectionName="Activities">
        <React.Suspense
          fallback={<CardGridSectionSkeleton label="Loading activities" tone="tint" />}
        >
          <ActivitiesSection />
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
