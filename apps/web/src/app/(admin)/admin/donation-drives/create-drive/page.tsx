"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  DonationDriveForm,
  type DonationDriveFormValues,
  type ImageFileItem,
} from "@/components/features/admin/donation-drive-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

function getTodayDateTimeLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const defaults: DonationDriveFormValues = {
  title: "",
  excerpt: "",
  body_json: emptyArticleDocument,
  organizer_name: "Barangay San Jose Relief Desk",
  organizer_contact: "(02) 8555-0100",
  drop_off_instructions: "Barangay San Jose Multi-Purpose Hall, 8:00 AM - 5:00 PM daily.",
  active_from: getTodayDateTimeLocal(),
  active_until: "",
  publication_status: "published",
  event_id: null,
};

function donationDrivePayload(
  values: DonationDriveFormValues,
  publicationStatus: DonationDriveFormValues["publication_status"],
) {
  return {
    ...values,
    publication_status: publicationStatus,
    organizer_name: values.organizer_name || null,
    organizer_contact: values.organizer_contact || null,
    drop_off_instructions: values.drop_off_instructions || null,
    active_from: values.active_from ? new Date(values.active_from).toISOString() : null,
    active_until: values.active_until
      ? new Date(values.active_until).toISOString()
      : null,
    event_id: values.event_id || null,
  };
}

export default function CreateDonationDrivePage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: { id: string; name: string }[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((r) => r.data.items ?? [])
        .catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      imageItems,
    }: {
      values: DonationDriveFormValues;
      imageItems: ImageFileItem[];
    }) => {
      const requestedStatus = values.publication_status;
      // A published article needs a cover, but media uploads need an article ID.
      // Stage a publish request as a draft, upload media, then publish it.
      const createStatus = requestedStatus === "published" ? "draft" : requestedStatus;
      const res = await api.post<{ id: string }>(
        "/admin/donation-drives",
        donationDrivePayload(values, createStatus),
      );
      const id = res.data.id;

      // 2. Upload images sequentially
      if (imageItems.length > 0 && id) {
        try {
          for (const item of imageItems) {
            const formData = new FormData();
            formData.append("file", item.file);
            const imgRes = await api.post<{ id: string }>(
              `/admin/donation-drives/${id}/images`,
              formData,
              { headers: { "Content-Type": undefined } },
            );
            if (item.isCover && imgRes.data?.id) {
              await api.patch(`/admin/donation-drives/${id}/images/${imgRes.data.id}`, {
                is_cover: true,
              });
            }
          }
        } catch {
          toast.error("Drive created, but some image uploads encountered an issue.");
        }
      }

      if (requestedStatus === "published") {
        await api.patch(
          `/admin/donation-drives/${id}`,
          donationDrivePayload(values, "published"),
        );
      }

      return { ...res.data, publication_status: requestedStatus };
    },
    onSuccess: (response) => {
      toast.success(
        response.publication_status === "published"
          ? "Donation drive published successfully!"
          : "Donation drive draft saved.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
      router.push("/admin/donation-drives");
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Create Donation Drive"
        description="Publish a donation notice or relief collection call for Barangay San Jose."
      />

      <DonationDriveForm
        events={events}
        defaultValues={defaults}
        showCoverUpload={true}
        onSubmit={async (values, imageItems) => {
          await createMutation.mutateAsync({ values, imageItems });
        }}
        onCancel={() => router.push("/admin/donation-drives")}
      />
    </div>
  );
}
