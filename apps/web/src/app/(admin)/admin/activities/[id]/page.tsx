"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import { PageHeader } from "@/components/common/page-header";
import {
  ActivityForm,
  type ActivityFormValues,
} from "@/components/features/admin/activity-form";
import { ArticleImageManager } from "@/components/features/admin/article-image-manager";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { ArticleDocument, ArticleImage } from "@/lib/api/public-types";

interface ActivityEditor {
  id: string;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
  type: ActivityFormValues["type"];
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  area_id: string | null;
  published_at: string | null;
  archived_at: string | null;
  images: ArticleImage[];
}

interface Area {
  id: string;
  name: string;
}
const localDateTime = (value: string | null) => (value ? value.slice(0, 16) : "");

export default function AdminActivityEditorPage() {
  useRequireRole("admin", "sk");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "activities", id];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => api.get<ActivityEditor>(`/admin/activities/${id}`).then((r) => r.data),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });
  const updateMutation = useMutation({
    mutationFn: (values: ActivityFormValues) =>
      api.patch(`/admin/activities/${id}`, {
        ...values,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
        venue: values.venue || null,
        area_id: values.area_id || null,
      }),
    onSuccess: () => {
      toast.success("Activity saved");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError || !data)
    return <ErrorState sectionName="This activity" onRetry={() => refetch()} />;
  const defaultValues: ActivityFormValues = {
    title: data.title,
    excerpt: data.excerpt,
    body_json: data.body_json,
    type: data.type,
    starts_at: localDateTime(data.starts_at),
    ends_at: localDateTime(data.ends_at),
    venue: data.venue ?? "",
    area_id: data.area_id ?? "",
    publication_status: data.archived_at
      ? "archived"
      : data.published_at
        ? "published"
        : "draft",
  };
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader
        eyebrow="Article CMS"
        title="Edit"
        titleAccent="activity"
        description="Write the public activity story, then add accessible media before publishing."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/activities">
              <ArrowLeft aria-hidden className="size-4" />
              Back to activities
            </Link>
          </Button>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="rounded-[16px] border border-neutral-200 bg-white p-6 shadow-sm-card sm:p-8">
          <ActivityForm
            areas={areas}
            defaultValues={defaultValues}
            onSubmit={(values) =>
              updateMutation.mutateAsync(values).then(() => undefined)
            }
            onCancel={() => router.push("/admin/activities" as Route)}
          />
        </div>
        <ArticleImageManager
          resource="activities"
          articleId={data.id}
          images={data.images}
          onChanged={() => queryClient.invalidateQueries({ queryKey })}
        />
      </div>
    </div>
  );
}
