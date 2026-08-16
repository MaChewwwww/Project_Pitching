"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  ActivityForm,
  type ActivityFormValues,
  type ImageFileItem,
} from "@/components/features/admin/activity-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

const defaults: ActivityFormValues = {
  title: "",
  excerpt: "",
  body_json: emptyArticleDocument,
  type: "drill",
  starts_at: "",
  ends_at: "",
  venue: "",
  area_id: "",
  publication_status: "draft",
};

export default function NewActivityPage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const client = useQueryClient();

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () =>
      api.get<{ id: string; name: string }[]>("/admin/areas").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: async ({
      values,
      imageItems,
    }: {
      values: ActivityFormValues;
      imageItems: ImageFileItem[];
    }) => {
      const response = await api.post<{ id: string }>("/admin/activities", {
        ...values,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
        venue: values.venue || null,
        area_id: values.area_id || null,
        publication_status: "draft",
      });
      const activityId = response.data.id;

      if (imageItems.length > 0 && activityId) {
        try {
          for (const item of imageItems) {
            const formData = new FormData();
            formData.append("file", item.file);
            const imageResponse = await api.post<{ id: string }>(
              `/admin/activities/${activityId}/images`,
              formData,
              { headers: { "Content-Type": undefined } },
            );
            if (item.isCover && imageResponse.data?.id) {
              await api.patch(
                `/admin/activities/${activityId}/images/${imageResponse.data.id}`,
                { is_cover: true },
              );
            }
          }
        } catch {
          toast.error("Activity Created, But Some Image Uploads Failed.");
        }
      }

      return response.data;
    },
    onSuccess: (response) => {
      toast.success("Activity Draft Created.");
      client.invalidateQueries({ queryKey: ["admin", "activities"] });
      router.replace(`/admin/activities/${response.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Create Activity"
        description="Write the activity details, add photos, and publish when everything is ready."
      />
      <ActivityForm
        areas={areas}
        defaultValues={defaults}
        submitLabel="Create Draft"
        showPublication={false}
        showCoverUpload
        onSubmit={(values, imageItems) =>
          create.mutateAsync({ values, imageItems }).then(() => undefined)
        }
        onCancel={() => router.push("/admin/activities")}
      />
    </div>
  );
}
