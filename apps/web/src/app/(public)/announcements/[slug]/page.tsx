import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { AnnouncementDetailView } from "@/components/features/public/announcement-detail-view";
import { getAnnouncement, getAnnouncements } from "@/lib/api/public";

export default async function AnnouncementArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;

  const [article, recentResponse] = await Promise.all([
    getAnnouncement(slug),
    getAnnouncements({ size: 6 }),
  ]);

  if (!article) notFound();

  const recentArticles = (recentResponse?.items || [])
    .filter((item) => item.id !== article.id)
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title={article.title}
        description={article.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Announcements", href: "/announcements" },
          { label: article.title },
        ]}
      />
      <AnnouncementDetailView
        article={article}
        recentArticles={recentArticles}
      />
    </>
  );
}
