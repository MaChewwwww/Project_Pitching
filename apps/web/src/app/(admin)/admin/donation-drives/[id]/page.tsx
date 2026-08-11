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
import { ArticleImageManager } from "@/components/features/admin/article-image-manager";
import {
  DonationDriveForm,
  type DonationDriveFormValues,
} from "@/components/features/admin/donation-drive-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { ArticleDocument, ArticleImage } from "@/lib/api/public-types";

interface DonationDriveEditor {
  id: string;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
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
      }),
    onSuccess: () => {
      toast.success("Donation notice saved");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError || !data)
    return <ErrorState sectionName="This donation notice" onRetry={() => refetch()} />;
  const defaultValues: DonationDriveFormValues = {
    title: data.title,
    excerpt: data.excerpt,
    body_json: data.body_json,
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader
        eyebrow="Article CMS"
        title="Edit"
        titleAccent="donation notice"
        description="Describe where and when goods are needed. This screen never records donations or payments."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/donation-drives">
              <ArrowLeft aria-hidden className="size-4" />
              Back to notices
            </Link>
          </Button>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="rounded-[16px] border border-neutral-200 bg-white p-6 shadow-sm-card sm:p-8">
          <DonationDriveForm
            defaultValues={defaultValues}
            onSubmit={(values) =>
              updateMutation.mutateAsync(values).then(() => undefined)
            }
            onCancel={() => router.push("/admin/donation-drives" as Route)}
          />
        </div>
        <ArticleImageManager
          resource="donation-drives"
          articleId={data.id}
          images={data.images}
          onChanged={() => queryClient.invalidateQueries({ queryKey })}
        />
      </div>
    </div>
  );
}
