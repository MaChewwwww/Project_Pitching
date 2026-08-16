import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideDetailView } from "@/components/features/preparedness/guide-detail-view";
import { getGuide, getGuides } from "@/lib/api/public";

export const dynamic = "force-dynamic";

/**
 * A single preparedness guide.
 *
 * `generateStaticParams` prerenders every slug — there are five guides and they
 * change rarely, so there is no reason for a resident to wait on a render.
 *
 * Note that `params` is a Promise in this version of Next and must be awaited.
 */
export async function generateStaticParams() {
  const guides = await getGuides({ size: 100 });
  return guides.items.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);

  if (!guide) return { title: "Guide not found" };

  return {
    title: guide.title_en,
    description: guide.excerpt_en,
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const [guide, guides] = await Promise.all([getGuide(slug), getGuides({ size: 50 })]);

  if (!guide) notFound();

  return (
    <GuideDetailView
      guide={guide}
      related={guides.items.filter((item) => item.id !== guide.id).slice(0, 4)}
    />
  );
}
