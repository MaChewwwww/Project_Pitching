"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ArticleImageManager } from "@/components/features/admin/article-image-manager";
import {
  DonationDriveForm,
  type DonationDriveFormValues,
} from "@/components/features/admin/donation-drive-form";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { ArticleDocument, ArticleImage } from "@/lib/api/public-types";

interface DonationDriveEditor {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
  event_id: string | null;
  event_name: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  drop_off_instructions: string | null;
  active_from: string | null;
  active_until: string | null;
  published_at: string | null;
  archived_at: string | null;
  images: ArticleImage[];
}

const localDateTime = (value: string | null) => (value ? value.slice(0, 16) : "");

export default function AdminDonationDriveEditorPage() {
  useRequireRole("admin", "sk");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "donation-drives", id];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api.get<DonationDriveEditor>(`/admin/donation-drives/${id}`).then((r) => r.data),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ id: string; name: string }[]>("/admin/emergency-events")
        .then((r) => r.data)
        .catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: (values: DonationDriveFormValues) =>
      api.patch(`/admin/donation-drives/${id}`, {
        ...values,
        organizer_name: values.organizer_name || null,
        organizer_contact: values.organizer_contact || null,
        drop_off_instructions: values.drop_off_instructions || null,
        active_from: values.active_from
          ? new Date(values.active_from).toISOString()
          : null,
        active_until: values.active_until
          ? new Date(values.active_until).toISOString()
          : null,
        event_id: values.event_id || null,
      }),
    onSuccess: () => {
      toast.success("Donation drive saved");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError || !data)
    return <ErrorState sectionName="This donation drive" onRetry={() => refetch()} />;

  const defaultValues: DonationDriveFormValues = {
    title: data.title,
    excerpt: data.excerpt,
    body_json: data.body_json,
    event_id: data.event_id,
    organizer_name: data.organizer_name ?? "",
    organizer_contact: data.organizer_contact ?? "",
    drop_off_instructions: data.drop_off_instructions ?? "",
    active_from: localDateTime(data.active_from),
    active_until: localDateTime(data.active_until),
    publication_status: data.archived_at
      ? "archived"
      : data.published_at
      ? "published"
      : "draft",
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Edit Donation Drive"
        description="Update campaign content, drop-off location, schedule, publication status, and media."
      />
      <DonationDriveForm
        events={events}
        defaultValues={defaultValues}
        submitLabel="Update"
        onSubmit={(values) => updateMutation.mutateAsync(values).then(() => undefined)}
        onCancel={() => router.push("/admin/donation-drives")}
        mediaPanel={
          <ArticleImageManager
            resource="donation-drives"
            articleId={data.id}
            images={data.images}
            onChanged={() => queryClient.invalidateQueries({ queryKey })}
          />
        }
      />
    </div>
  );
}
