"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/common/page-header";
import { DonationDriveForm, type DonationDriveFormValues } from "@/components/features/admin/donation-drive-form";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
const defaults: DonationDriveFormValues = { title: "", excerpt: "", body_json: emptyArticleDocument, organizer_name: "", organizer_contact: "", drop_off_instructions: "", active_from: "", active_until: "", publication_status: "draft" };
export default function NewDonationDrivePage() { useRequireRole("admin"); const router = useRouter(); const client = useQueryClient(); const create = useMutation({ mutationFn: (values: DonationDriveFormValues) => api.post("/admin/donation-drives", { ...values, organizer_name: values.organizer_name || null, organizer_contact: values.organizer_contact || null, drop_off_instructions: values.drop_off_instructions || null, active_from: values.active_from ? new Date(values.active_from).toISOString() : null, active_until: values.active_until ? new Date(values.active_until).toISOString() : null, publication_status: "draft" }), onSuccess: (response) => { toast.success("Donation notice draft created. Add a cover image before publishing."); client.invalidateQueries({ queryKey: ["admin", "donation-drives"] }); router.replace(`/admin/donation-drives/${response.data.id}` as Route); }, onError: (error) => { throw toDisplayError(error); } }); return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><PageHeader eyebrow="Article CMS" title="Create" titleAccent="donation notice" description="Describe a collection clearly, then add a cover and publish from the full editor." action={<Button asChild size="sm" variant="outline"><Link href="/admin/donation-drives"><ArrowLeft aria-hidden className="size-4" />Back to notices</Link></Button>} /><section className="rounded-[14px] border border-neutral-200 bg-white p-5 shadow-xs sm:p-8"><DonationDriveForm defaultValues={defaults} submitLabel="Create draft" showPublication={false} onSubmit={(values) => create.mutateAsync(values).then(() => undefined)} onCancel={() => router.push("/admin/donation-drives")} /></section></div>; }
