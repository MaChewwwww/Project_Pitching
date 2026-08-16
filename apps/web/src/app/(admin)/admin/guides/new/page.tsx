"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
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
      toast.success("Guide created");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
      router.replace(`/admin/guides/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <AdminPageHeader
        title="Create preparedness guide"
        description="Write both language versions, add the official source, then publish when review is complete."
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
        defaultValues={emptyGuideValues}
        submitLabel="Create guide"
        onSubmit={(values) => create.mutateAsync(values).then(() => undefined)}
        onCancel={() => router.push("/admin/guides")}
      />
    </div>
  );
}
