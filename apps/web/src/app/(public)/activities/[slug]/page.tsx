import { notFound } from "next/navigation";
import { ArticleDetail } from "@/components/features/public/article-detail";
import { PageHeader } from "@/components/common/page-header";
import { getActivity } from "@/lib/api/public";

export default async function ActivityArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getActivity((await params).slug);
  if (!article) notFound();
  return (
    <>
      <PageHeader
        title={article.title}
        description={article.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Activities", href: "/activities" },
          { label: article.title },
        ]}
      />
      <ArticleDetail body={article.body_json} images={article.images} />
    </>
  );
}
