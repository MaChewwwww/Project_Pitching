"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  GuideEditor,
  emptyGuideValues,
  guidePayload,
  type GuideEditorValues,
} from "@/components/features/admin/guide-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

export default function NewGuidePage() {
  useRequireRole("admin");
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (values: GuideEditorValues) =>
      api.post("/admin/guides", guidePayload(values)),
    onSuccess: (response) => {
      toast.success("Guide Created");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
      router.replace(`/admin/guides/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Create Preparedness Guide"
        description="Write both language versions, add the official source, then publish when review is complete."
      />
      <GuideEditor
        defaultValues={emptyGuideValues}
        submitLabel="Create Guide"
        onSubmit={(values) => create.mutateAsync(values).then(() => undefined)}
        onCancel={() => router.push("/admin/guides")}
      />
    </div>
  );
}
