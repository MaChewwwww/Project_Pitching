import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SectionBoundary } from "@/components/common/section-boundary";
import { AboutSection } from "@/components/features/public/sections/about-section";
import { WhyPreparednessSection } from "@/components/features/public/sections/why-preparedness-section";

export const metadata: Metadata = {
  title: "About the platform",
  description:
    "What this platform is for, who maintains it, and the Sustainable Development Goals it supports.",
};

/**
 * About the platform (FR-PUB-002, BR-0.2).
 *
 * This is the one route that reuses landing sections verbatim rather than
 * recomposing from cards. It can, because both are static-content sections: they
 * never return `null` on empty data, and their `SectionHeader` renders an `h2`
 * that sits correctly beneath this page's `PageHeader` `h1`. The card-composition
 * rule elsewhere exists to avoid a `variant` prop on sections that *do* have
 * empty and heading conflicts — there is nothing to avoid here.
 *
 * `WhyPreparednessSection` reads flood events, so it keeps its boundary.
 */
export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Built For"
        titleAccent="Barangay San Jose"
        description="One place the barangay maintains, readable on whatever phone a resident already owns."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <SectionBoundary sectionName="About">
        <AboutSection />
      </SectionBoundary>

      <SectionBoundary sectionName="Why preparedness matters">
        <WhyPreparednessSection />
      </SectionBoundary>
    </>
  );
}
