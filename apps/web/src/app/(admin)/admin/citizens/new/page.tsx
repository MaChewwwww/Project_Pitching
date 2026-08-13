"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdOut, MemberUpdate } from "@/lib/api/registry-types";

export default function NewCitizenPage() {
  useRequireRole("admin", "bhw");
  const router = useRouter();
  const params = useSearchParams();
  const [householdId, setHouseholdId] = React.useState(params.get("household_id") ?? "");
  const householdsQuery = useQuery({ queryKey: ["admin", "households", "citizen-create"], queryFn: () => api.get<{ items: HouseholdOut[] }>("/admin/households", { params: { size: 1000 } }).then((r) => r.data.items) });
  const create = useMutation({ mutationFn: (values: MemberUpdate) => api.post(`/admin/households/${householdId}/members`, values), onSuccess: () => { toast.success("Citizen added to household"); router.push("/admin/citizens"); }, onError: (error) => { throw new Error(toDisplayError(error).detail); } });

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-10"><AdminPageHeader title="Add registered citizen" description="Attach a citizen profile to an existing household while keeping the roster and support flags current." action={<Button asChild size="sm" variant="outline"><Link href="/admin/citizens"><ArrowLeft aria-hidden className="size-4" />Back to citizens</Link></Button>} /><Card><CardContent className="space-y-5"><div><label htmlFor="household" className="text-sm font-bold text-neutral-800">Household <span className="text-red-600">*</span></label><select id="household" value={householdId} onChange={(event) => setHouseholdId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"><option value="">Choose a household</option>{(householdsQuery.data ?? []).map((household) => <option key={household.id} value={household.id}>{household.reference_no} · {household.head_name} · {household.area_name}</option>)}</select></div>{householdId ? <RegistryMemberForm key={householdId} submitLabel="Add citizen" onSubmit={(values) => { if (!householdId) return Promise.reject(new Error("Choose a household first.")); return create.mutateAsync(values).then(() => undefined); }} onCancel={() => router.push("/admin/citizens")} /> : <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center"><UserRoundPlus aria-hidden className="mx-auto size-8 text-emerald-600" /><p className="mt-3 text-sm font-semibold text-neutral-800">Choose a household to begin</p><p className="mt-1 text-xs text-neutral-500">The new citizen will inherit the household&apos;s area and appear in both registry workspaces.</p></div>}</CardContent></Card></div>;
}
