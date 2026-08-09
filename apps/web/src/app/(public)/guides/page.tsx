import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { GuideCard } from "@/components/features/preparedness/guide-card";
import { getGuides } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Preparedness guidelines",
  description:
    "Flood, earthquake, fire and typhoon preparedness for Barangay San Jose, plus the San Jose Go Bag list.",
};

/** The guide index (FR-PUB-005, FR-PRP-001/003/004). */
export default async function GuidesPage() {
  const guides = await getGuides({ size: 50 });

  return (
    <>
      <PageHeader
        eyebrow="Preparedness"
        title="Know what to do"
        titleAccent="before it happens"
        description="Practical guides for the hazards San Jose actually faces. Each one cites its source and shows when it was last reviewed."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Preparedness guidelines" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12">
        {guides.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {guides.items.map((guide, i) => (
              <Reveal key={guide.id} delay={(i % 3) as 0 | 1 | 2}>
                <GuideCard guide={guide} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No guidelines published yet"
            description="Preparedness guidelines will appear here once the barangay publishes them."
          />
        )}
      </div>
    </>
  );
}
