"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  AnnouncementForm,
  type AnnouncementFormValues,
  type ImageFileItem,
} from "@/components/features/admin/announcement-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

const defaults: AnnouncementFormValues = {
  kind: "announcement",
  type: "general",
  title: "",
  excerpt: "",
  body_json: emptyArticleDocument,
  instruction: "",
  is_barangay_wide: false,
  area_ids: [],
  publication_status: "published",
};

function announcementPayload(
  values: AnnouncementFormValues,
  publicationStatus: AnnouncementFormValues["publication_status"],
) {
  return {
    ...values,
    publication_status: publicationStatus,
    instruction: values.instruction || null,
    severity: values.severity || null,
  };
}

export default function CreateAnnouncementPage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useQueryClient();
  const alertIntent = searchParams.get("kind") === "alert";

  const formDefaults = React.useMemo(
    () => ({ ...defaults, kind: alertIntent ? ("alert" as const) : defaults.kind }),
    [alertIntent],
  );

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () =>
      api.get<{ id: string; name: string }[]>("/admin/areas").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      imageItems,
    }: {
      values: AnnouncementFormValues;
      imageItems: ImageFileItem[];
    }) => {
      const requestedStatus = values.publication_status;
      // A published article needs a cover, but media uploads need an article ID.
      // Stage a publish request as a draft, upload media, then publish it.
      const createStatus = requestedStatus === "published" ? "draft" : requestedStatus;
      const res = await api.post<{ id: string }>(
        "/admin/announcements",
        announcementPayload(values, createStatus),
      );
      const id = res.data.id;

      // 2. Upload images sequentially
      if (imageItems.length > 0 && id) {
        try {
          for (const item of imageItems) {
            const formData = new FormData();
            formData.append("file", item.file);
            const imgRes = await api.post<{ id: string }>(
              `/admin/announcements/${id}/images`,
              formData,
              { headers: { "Content-Type": undefined } },
            );
            if (item.isCover && imgRes.data?.id) {
              await api.patch(`/admin/announcements/${id}/images/${imgRes.data.id}`, {
                is_cover: true,
              });
            }
          }
        } catch {
          // Keep announcement created even if image upload encounters an issue
          toast.error(
            "Announcement created, but some image uploads encountered an issue.",
          );
        }
      }

      if (requestedStatus === "published") {
        await api.patch(
          `/admin/announcements/${id}`,
          announcementPayload(values, "published"),
        );
      }

      return { ...res.data, publication_status: requestedStatus };
    },
    onSuccess: (response) => {
      toast.success(
        response.publication_status === "published"
          ? "Announcement published successfully!"
          : "Announcement draft saved.",
      );
      client.invalidateQueries({ queryKey: ["admin", "announcements"] });
      router.push("/admin/announcements");
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Create Announcement"
        description="Publish an alert or advisory for Barangay San Jose residents."
      />

      <AnnouncementForm
        key={alertIntent ? "alert" : "announcement"}
        areas={areas}
        defaultValues={formDefaults}
        showCoverUpload={true}
        onSubmit={async (values, imageItems) => {
          await createMutation.mutateAsync({ values, imageItems });
        }}
        onCancel={() => router.push("/admin/announcements")}
      />
    </div>
  );
}
