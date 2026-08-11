"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/common/page-header";
import { AnnouncementForm, type AnnouncementFormValues } from "@/components/features/admin/announcement-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

const defaults: AnnouncementFormValues = { kind: "announcement", type: "general", title: "", excerpt: "", body_json: emptyArticleDocument, instruction: "", is_barangay_wide: true, area_ids: [], expires_at: "", publication_status: "draft" };
export default function NewAnnouncementPage() {
  useRequireRole("admin", "sk");
  const router = useRouter(); const client = useQueryClient();
  const { data: areas = [] } = useQuery({ queryKey: ["admin", "areas"], queryFn: () => api.get<{ id: string; name: string }[]>("/admin/areas").then((r) => r.data) });
  const create = useMutation({ mutationFn: (values: AnnouncementFormValues) => api.post("/admin/announcements", { ...values, instruction: values.instruction || null, severity: values.severity || null, alert_level: values.alert_level || null, expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null }), onSuccess: (response) => { toast.success("Draft created. Add a cover image before publishing."); client.invalidateQueries({ queryKey: ["admin", "announcements"] }); router.replace(`/admin/announcements/${response.data.id}` as Route); }, onError: (error) => { throw toDisplayError(error); } });
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><PageHeader eyebrow="Article CMS" title="Create" titleAccent="announcement" description="Start with a clear public story. You will add the cover and publish controls on the next screen." action={<Button asChild size="sm" variant="outline"><Link href="/admin/announcements"><ArrowLeft aria-hidden className="size-4" />Back to announcements</Link></Button>} /><section className="rounded-[14px] border border-neutral-200 bg-white p-5 shadow-xs sm:p-8"><AnnouncementForm areas={areas} defaultValues={defaults} onSubmit={(values) => create.mutateAsync(values).then(() => undefined)} onCancel={() => router.push("/admin/announcements")} /></section></div>;
}
