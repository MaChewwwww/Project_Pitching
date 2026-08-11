import { notFound } from "next/navigation";
import { ArticleDetail } from "@/components/features/public/article-detail";
import { PageHeader } from "@/components/common/page-header";
import { getAnnouncement } from "@/lib/api/public";
import { formatPhtDateTime } from "@/lib/format";

export default async function AnnouncementArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getAnnouncement((await params).slug);
  if (!article) notFound();
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
      <ArticleDetail
        body={article.body_json}
        images={article.images}
        cover={article.cover_image}
        eyebrow={article.kind === "alert" ? `Alert level ${article.alert_level ?? ""}` : "Barangay advisory"}
        metadata={[
          article.published_at ? formatPhtDateTime(article.published_at) : "Published notice",
          article.issued_by_name,
          article.area_names.length ? article.area_names.join(", ") : "Barangay-wide",
        ]}
      />
    </>
  );
}
