import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/common/page-header";
import { GuideArticle } from "@/components/features/preparedness/guide-article";
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
  const guide = await getGuide(slug);

  if (!guide) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Preparedness guide"
        title={guide.title_en}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Preparedness guidelines", href: "/guides" },
          { label: guide.title_en },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <GuideArticle guide={guide} />

        <div className="mt-10">
          <Button asChild variant="outline" pill size="md" className="max-sm:w-full">
            <Link href="/guides">
              <ArrowLeft aria-hidden className="size-4" />
              All guides
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
