"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ArticleImageManager } from "@/components/features/admin/article-image-manager";
import {
  AnnouncementForm,
  type AnnouncementFormValues,
} from "@/components/features/admin/announcement-form";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { ArticleImage, ArticleDocument } from "@/lib/api/public-types";

interface AnnouncementEditor {
  id: string;
  kind: AnnouncementFormValues["kind"];
  type: AnnouncementFormValues["type"];
  severity: AnnouncementFormValues["severity"] | null;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
  instruction: string | null;
  is_barangay_wide: boolean;
  area_ids: string[];
  expires_at: string | null;
  publication_status: AnnouncementFormValues["publication_status"];
  images: ArticleImage[];
}

interface Area {
  id: string;
  name: string;
}

export default function AdminAnnouncementEditorPage() {
  useRequireRole("admin", "sk");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "announcements", id];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api.get<AnnouncementEditor>(`/admin/announcements/${id}`).then((r) => r.data),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });
  const updateMutation = useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      api.patch(`/admin/announcements/${id}`, {
        ...values,
        instruction: values.instruction || null,
        severity: values.severity || null,
      }),
    onSuccess: () => {
      toast.success("Announcement saved");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError || !data)
    return <ErrorState sectionName="This announcement" onRetry={() => refetch()} />;

  const defaultValues: AnnouncementFormValues = {
    kind: data.kind,
    type: data.type,
    severity: data.severity ?? undefined,
    title: data.title,
    excerpt: data.excerpt,
    body_json: data.body_json,
    instruction: data.instruction ?? "",
    is_barangay_wide: data.is_barangay_wide,
    area_ids: data.area_ids,
    publication_status: data.publication_status,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Edit Announcement"
        description="Update the announcement content, audience, publication status, and media."
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <AnnouncementForm
          areas={areas}
          defaultValues={defaultValues}
          onSubmit={(values) => updateMutation.mutateAsync(values).then(() => undefined)}
          onCancel={() => router.push("/admin/announcements")}
        />
        <ArticleImageManager
          resource="announcements"
          articleId={data.id}
          images={data.images}
          onChanged={() => queryClient.invalidateQueries({ queryKey })}
        />
      </div>
    </div>
  );
}
