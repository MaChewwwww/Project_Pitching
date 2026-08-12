"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ActivityForm, type ActivityFormValues } from "@/components/features/admin/activity-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
const defaults: ActivityFormValues = { title: "", excerpt: "", body_json: emptyArticleDocument, type: "drill", starts_at: "", ends_at: "", venue: "", area_id: "", publication_status: "draft" };
export default function NewActivityPage() { useRequireRole("admin", "sk"); const router = useRouter(); const client = useQueryClient(); const { data: areas = [] } = useQuery({ queryKey: ["admin", "areas"], queryFn: () => api.get<{ id: string; name: string }[]>("/admin/areas").then((r) => r.data) }); const create = useMutation({ mutationFn: (values: ActivityFormValues) => api.post("/admin/activities", { ...values, starts_at: new Date(values.starts_at).toISOString(), ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null, venue: values.venue || null, area_id: values.area_id || null, publication_status: "draft" }), onSuccess: (response) => { toast.success("Activity draft created. Add a cover image before publishing."); client.invalidateQueries({ queryKey: ["admin", "activities"] }); router.replace(`/admin/activities/${response.data.id}` as Route); }, onError: (error) => { throw toDisplayError(error); } }); return <div className="mx-auto flex w-full max-w-6xl flex-col gap-8"><AdminPageHeader title="Create Activity" description="Set the public details first, then add media and publish from the full editor." action={<Button asChild size="sm" variant="outline"><Link href="/admin/activities"><ArrowLeft aria-hidden className="size-4" />Back to activities</Link></Button>} /><section className="rounded-[16px] border border-neutral-200 bg-white p-6 shadow-sm-card sm:p-10"><ActivityForm areas={areas} defaultValues={defaults} submitLabel="Create draft" showPublication={false} onSubmit={(values) => create.mutateAsync(values).then(() => undefined)} onCancel={() => router.push("/admin/activities")} /></section></div>; }
