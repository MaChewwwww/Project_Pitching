"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistryHouseholdForm } from "@/components/features/admin/registry-household-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdDetailOut, HouseholdUpdate } from "@/lib/api/registry-types";

interface Area { id: string; name: string; }

export default function EditHouseholdPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const householdQuery = useQuery({ queryKey: ["admin", "household", id], queryFn: () => api.get<HouseholdDetailOut>(`/admin/households/${id}`).then((r) => r.data) });
  const areasQuery = useQuery({ queryKey: ["admin", "areas"], queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data) });
  const save = useMutation({
    mutationFn: (body: HouseholdUpdate) => api.patch<HouseholdDetailOut>(`/admin/households/${id}`, body).then((r) => r.data),
    onSuccess: () => { toast.success("Household details saved"); client.invalidateQueries({ queryKey: ["admin", "household", id] }); router.push(`/admin/households/${id}`); },
    onError: (error) => { throw new Error(toDisplayError(error).detail); },
  });
  const household = householdQuery.data;

  if (householdQuery.isLoading) return <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">Loading household…</div>;
  if (!household) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Household not found.</div>;

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-10"><AdminPageHeader title={`Edit ${household.reference_no}`} description="Keep the household record current without changing its reference or audit history." action={<Button asChild size="sm" variant="outline"><Link href={`/admin/households/${id}`}><ArrowLeft aria-hidden className="size-4" />Back to record</Link></Button>} /><Card><CardContent><RegistryHouseholdForm household={household} areas={areasQuery.data ?? []} protectedHead={Boolean(household.head_user_id)} onSubmit={(values) => save.mutateAsync(values).then(() => undefined)} onCancel={() => router.push(`/admin/households/${id}`)} /></CardContent></Card></div>;
}
