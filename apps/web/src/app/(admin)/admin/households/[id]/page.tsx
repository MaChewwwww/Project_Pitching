"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Archive, CircleAlert, Pencil, Plus, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";

export default function HouseholdDetailPage() {
  useRequireRole("admin", "bhw");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: household, isLoading, isError } = useQuery({
    queryKey: ["admin", "household", params.id],
    queryFn: () => api.get<HouseholdDetailOut>(`/admin/households/${params.id}`).then((r) => r.data),
  });
  const makeHead = useMutation({
    mutationFn: (memberId: string) => api.post(`/admin/members/${memberId}/make-head`),
    onSuccess: () => { toast.success("New household head assigned"); queryClient.invalidateQueries({ queryKey: ["admin", "household", params.id] }); queryClient.invalidateQueries({ queryKey: ["admin", "households"] }); },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const archive = useMutation({
    mutationFn: () => api.delete(`/admin/households/${params.id}`),
    onSuccess: () => { toast.success("Household archived"); router.push("/admin/households"); },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  if (isLoading) return <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">Loading household…</div>;
  if (isError || !household) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">This household could not be loaded.</div>;
  const record = household;

  function confirmArchive() {
    if (window.confirm(`Archive ${record.reference_no}? Its history remains in the audit trail, but it will leave active registry lists.`)) archive.mutate();
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader title={household.reference_no} description={`Household record for ${household.head_name} · ${household.area_name ?? "Area not recorded"}.`} action={<div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href="/admin/households"><ArrowLeft aria-hidden className="size-4" />Back to households</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/admin/households/${household.id}/edit`}><Pencil aria-hidden className="size-4" />Edit details</Link></Button>{user?.role === "admin" ? <Button size="sm" variant="danger" onClick={confirmArchive} disabled={archive.isPending}><Archive aria-hidden className="size-4" />Archive</Button> : null}</div>} meta={<div className="flex flex-wrap gap-2"><Badge tone={household.source === "self" ? "success" : "neutral"}>{household.source === "self" ? "Resident self-registration" : "BHW-assisted"}</Badge>{household.verified_at ? <Badge tone="success"><ShieldCheck aria-hidden className="mr-1 inline size-3" />Verified</Badge> : <Badge tone="warning">Needs verification</Badge>}{household.has_possible_duplicate ? <Badge tone="warning"><CircleAlert aria-hidden className="mr-1 inline size-3" />Possible duplicate</Badge> : null}</div>} />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card><CardContent className="space-y-5"><div><p className="text-overline text-neutral-500">Household profile</p><h2 className="mt-1 text-xl font-bold text-neutral-950">{household.head_name}</h2><p className="mt-1 text-sm text-neutral-500">{household.street_address ?? "No street address recorded"}</p></div><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><div><dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Contact</dt><dd className="mt-1 text-sm text-neutral-900">{household.contact_number ?? (household.is_unreachable_by_phone ? "Marked unreachable" : "Not recorded")}</dd></div><div><dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Waterway proximity</dt><dd className="mt-1 text-sm capitalize text-neutral-900">{household.waterway_proximity?.replace("_", " ") ?? "Not recorded"}</dd></div><div><dt className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Registered</dt><dd className="mt-1 text-sm text-neutral-900">{new Date(household.created_at).toLocaleDateString()}</dd></div></dl>{household.head_user_id ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">The head is linked to a resident account. Name, move, demotion, and archive actions are protected by the account lifecycle.</p> : <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">This household is managed by the registry. Assign a new head before archiving or transferring the current head.</p>}</CardContent></Card>
        <Card><CardContent><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-overline text-neutral-500">Citizen roster</p><h2 className="mt-1 text-xl font-bold text-neutral-950">{household.members.length} registered citizen{household.members.length === 1 ? "" : "s"}</h2></div><Button asChild size="sm"><Link href={`/admin/citizens/new?household_id=${household.id}`}><Plus aria-hidden className="size-4" />Add citizen</Link></Button></div><div className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200">{household.members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><UserRound aria-hidden className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-neutral-900">{member.full_name}{member.is_head ? <Badge tone="success" className="ml-2">Head</Badge> : null}</p><p className="mt-0.5 text-xs text-neutral-500">{member.relationship_to_head ?? "Household member"}{member.is_pwd || member.is_senior || member.is_bedridden ? " · Support flag" : ""}</p></div></div><div className="flex items-center gap-1.5"><Button asChild size="sm" variant="outline" className="size-9 px-0" title="Edit citizen"><Link href={`/admin/citizens/${member.id}/edit`}><Pencil aria-hidden className="size-4" /><span className="sr-only">Edit citizen</span></Link></Button>{!member.is_head && !household.head_user_id ? <Button size="sm" variant="outline" onClick={() => makeHead.mutate(member.id)} disabled={makeHead.isPending} title="Make household head">Make head</Button> : null}</div></div>)}{household.members.length === 0 ? <p className="p-5 text-sm text-neutral-500">No active citizens are attached to this household.</p> : null}</div></CardContent></Card>
      </div>
    </div>
  );
}
