import { notFound } from "next/navigation";
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
    <AnnouncementDetailView
      article={article}
      recentArticles={recentArticles}
    />
  );
}
