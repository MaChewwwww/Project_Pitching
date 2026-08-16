import { notFound } from "next/navigation";
import { ActivityDetailView } from "@/components/features/activities/activity-detail-view";
import { getActivities, getActivity } from "@/lib/api/public";

export default async function ActivityArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [article, upcoming] = await Promise.all([
    getActivity(slug),
    getActivities({ size: 5 }),
  ]);
  if (!article) notFound();
  return (
    <ActivityDetailView
      activity={article}
      related={upcoming.items.filter((item) => item.id !== article.id).slice(0, 4)}
    />
  );
}
