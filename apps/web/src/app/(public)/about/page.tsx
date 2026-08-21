import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SectionBoundary } from "@/components/common/section-boundary";
import { AboutSection } from "@/components/features/public/sections/about-section";

export const metadata: Metadata = {
  title: "About the Platform",
  description:
    "Learn how SAGIP-SJ connects Barangay San Jose residents and local officials through timely disaster information, emergency support, hazard data, and preparedness guidance.",
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
        description="A community-focused digital platform connecting Barangay San Jose residents with timely disaster information, emergency support, and the knowledge to protect lives and communities."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <SectionBoundary sectionName="About">
        <AboutSection />
      </SectionBoundary>
    </>
  );
}
