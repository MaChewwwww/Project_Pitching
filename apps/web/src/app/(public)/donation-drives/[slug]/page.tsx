import { notFound } from "next/navigation";
import { ArticleDetail } from "@/components/features/public/article-detail";
import { PageHeader } from "@/components/common/page-header";
import { getDonationDrive } from "@/lib/api/public";

export default async function DonationDriveArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getDonationDrive((await params).slug);
  if (!article) notFound();
  return (
    <>
      <PageHeader
        title={article.title}
        description={article.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Donation Drives", href: "/donation-drives" },
          { label: article.title },
        ]}
      />
      <ArticleDetail body={article.body_json} images={article.images} />
    </>
  );
}
