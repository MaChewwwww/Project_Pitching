import { SectionBoundary } from "@/components/common/section-boundary";
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
 * Section order follows the BRD. The hotlines sit seventh there, which during a
 * flood would be far too low — BR-0.15 is satisfied instead by the floating
 * action button and the utility bar, both always on screen.
 */
export default function LandingPage() {
  return (
    <>
      <SectionBoundary sectionName="Hero">
        <HeroSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Barangay statistics">
        <StatBandSection />
      </SectionBoundary>

      <SectionBoundary sectionName="About">
        <AboutBandSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Announcements">
        <AnnouncementsSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Weather">
        <WeatherSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Preparedness">
        <PreparednessSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Activities">
        <ActivitiesSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Hotlines">
        <HotlinesSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Evacuation centres">
        <EvacCentersSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Hazard map">
        <HazardMapSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Donation drives">
        <DonationDrivesSection />
      </SectionBoundary>

      <SectionBoundary sectionName="FAQs">
        <FaqSection />
      </SectionBoundary>
    </>
  );
}
