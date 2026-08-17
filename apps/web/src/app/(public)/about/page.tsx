import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SectionBoundary } from "@/components/common/section-boundary";
import { AboutSection } from "@/components/features/public/sections/about-section";

export const metadata: Metadata = {
  title: "About the Platform",
  description:
    "What this platform is for, who maintains it, and the Sustainable Development Goals it supports.",
};

/**
 * About the platform (FR-PUB-002, BR-0.2).
 */
export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the"
        titleAccent="SAGIP Platform"
        description="A unified disaster readiness, community health, and early warning platform engineered for Barangay San Jose."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <SectionBoundary sectionName="About">
        <AboutSection />
      </SectionBoundary>
    </>
  );
}
