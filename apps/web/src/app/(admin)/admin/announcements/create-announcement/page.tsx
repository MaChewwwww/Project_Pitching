"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  AnnouncementForm,
  type AnnouncementFormValues,
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
  is_barangay_wide: true,
  area_ids: [],
  publication_status: "published",
};

export default function CreateAnnouncementPage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const client = useQueryClient();

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () =>
      api.get<{ id: string; name: string }[]>("/admin/areas").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      coverFile,
      coverAltText,
    }: {
      values: AnnouncementFormValues;
      coverFile?: File | null;
      coverAltText?: string;
    }) => {
      // 1. Create announcement
      const res = await api.post<{ id: string }>("/admin/announcements", {
        ...values,
        instruction: values.instruction || null,
        severity: values.severity || null,
      });
      const id = res.data.id;

      // 2. Upload cover image if selected directly in create form
      if (coverFile && id) {
        try {
          const formData = new FormData();
          formData.append("file", coverFile);
          const imgRes = await api.post<{ id: string }>(
            `/admin/announcements/${id}/images`,
            formData,
            { headers: { "Content-Type": undefined } },
          );
          if (imgRes.data?.id) {
            await api.patch(`/admin/announcements/${id}/images/${imgRes.data.id}`, {
              is_cover: true,
              alt_text: coverAltText || values.title,
            });
          }
        } catch {
          // Keep announcement created even if image upload fails
          toast.error("Announcement created, but cover image upload encountered an issue.");
        }
      }

      return res.data;
    },
    onSuccess: () => {
      toast.success("Announcement published successfully!");
      client.invalidateQueries({ queryKey: ["admin", "announcements"] });
      router.push("/admin/announcements");
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* Top Left Navigation Back Button */}
      <div className="flex items-center justify-start">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-9 rounded-full px-3.5 text-xs font-bold text-neutral-700 hover:text-emerald-800 hover:bg-emerald-50 border border-neutral-200/80 bg-white shadow-2xs transition-all cursor-pointer gap-2"
        >
          <Link href="/admin/announcements">
            <ArrowLeft aria-hidden className="size-4 text-emerald-600 shrink-0" />
            <span>Back to announcements</span>
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title="Create Announcement"
        description="Publish an alert or advisory for Barangay San Jose residents."
      />

      <AnnouncementForm
        areas={areas}
        defaultValues={defaults}
        showCoverUpload={true}
        onSubmit={async (values, coverFile, coverAltText) => {
          await createMutation.mutateAsync({ values, coverFile, coverAltText });
        }}
        onCancel={() => router.push("/admin/announcements")}
      />
    </div>
  );
}
