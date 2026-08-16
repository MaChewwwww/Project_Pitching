"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  GuideEditor,
  guidePayload,
  type GuideEditorValues,
} from "@/components/features/admin/guide-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

interface Guide {
  id: string;
  slug: string;
  hazard_type: GuideEditorValues["hazard_type"];
  phase: GuideEditorValues["phase"];
  title_fil: string;
  title_en: string;
  body_fil: string;
  body_en: string;
  source_attribution: string | null;
  last_reviewed_at: string | null;
  is_published: boolean;
  sort_order: number;
}

export default function EditGuidePage() {
  useRequireRole("admin");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "guides", id];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api.get<Guide>(`/admin/guides/${id}`).then((response) => response.data),
  });
  const update = useMutation({
    mutationFn: (values: GuideEditorValues) =>
      api.patch(`/admin/guides/${id}`, guidePayload(values)),
    onSuccess: () => {
      toast.success("Guide saved");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError || !data)
    return <ErrorState sectionName="This guide" onRetry={() => refetch()} />;
  const defaults: GuideEditorValues = {
    slug: data.slug,
    hazard_type: data.hazard_type,
    phase: data.phase,
    title_fil: data.title_fil,
    title_en: data.title_en,
    body_fil: data.body_fil,
    body_en: data.body_en,
    source_attribution: data.source_attribution ?? "",
    last_reviewed_at: data.last_reviewed_at?.slice(0, 10) ?? "",
    sort_order: data.sort_order,
    is_published: data.is_published,
  };
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <AdminPageHeader
        title="Edit preparedness guide"
        description="Keep both language versions, attribution, and review date current."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/guides">
              <ArrowLeft aria-hidden className="size-4" />
              Back to guides
            </Link>
          </Button>
        }
      />
      <GuideEditor
        defaultValues={defaults}
        submitLabel="Save guide"
        onSubmit={(values) => update.mutateAsync(values).then(() => undefined)}
        onCancel={() => router.push("/admin/guides")}
      />
    </div>
  );
}
