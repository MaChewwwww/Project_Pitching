"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, UsersRound } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { RegistryHouseholdForm } from "@/components/features/admin/registry-household-form";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdDetailOut, HouseholdUpdate, MemberUpdate } from "@/lib/api/registry-types";

interface Area { id: string; name: string; }

export default function PortalHouseholdEditPage() {
  useRequireRole("head");
  const router = useRouter();
  const client = useQueryClient();
  const [adding, setAdding] = React.useState(false);
  const householdQuery = useQuery({ queryKey: ["me", "household"], queryFn: () => api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data) });
  const areasQuery = useQuery({ queryKey: ["public", "areas"], queryFn: () => api.get<Area[]>("/public/areas").then((r) => r.data) });
  const updateHousehold = useMutation({ mutationFn: (body: HouseholdUpdate) => api.patch("/me/household", body), onSuccess: () => { toast.success("Household details updated"); client.invalidateQueries({ queryKey: ["me", "household"] }); }, onError: (error) => { throw new Error(toDisplayError(error).detail); } });
  const updateMember = useMutation({ mutationFn: ({ id, body }: { id: string; body: MemberUpdate }) => api.patch(`/me/household/members/${id}`, body), onSuccess: () => { toast.success("Citizen profile updated"); client.invalidateQueries({ queryKey: ["me", "household"] }); }, onError: (error) => { throw new Error(toDisplayError(error).detail); } });
  const addMember = useMutation({ mutationFn: (body: MemberUpdate) => api.post("/me/household/members", body), onSuccess: () => { toast.success("Citizen added to your household"); setAdding(false); client.invalidateQueries({ queryKey: ["me", "household"] }); }, onError: (error) => { throw new Error(toDisplayError(error).detail); } });
  const household = householdQuery.data;

  if (householdQuery.isLoading) return <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">Loading household…</div>;
  if (!household) return <div className="mx-auto max-w-xl p-8 text-center text-sm text-neutral-600">Complete onboarding before editing your household.</div>;

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8"><div className="flex items-center justify-between gap-3"><div><p className="text-overline text-emerald-700">Resident portal</p><h1 className="mt-1 text-2xl font-bold text-neutral-950">Edit your household</h1><p className="mt-1 text-sm text-neutral-500">Keep the barangay registry accurate for assistance and safety check-ins.</p></div><Button variant="outline" onClick={() => router.push("/portal")}><ArrowLeft aria-hidden className="size-4" />Back</Button></div><Card><CardContent><RegistryHouseholdForm household={household} areas={areasQuery.data ?? []} protectedHead onSubmit={(values) => updateHousehold.mutateAsync(values).then(() => undefined)} onCancel={() => router.push("/portal")} /></CardContent></Card><Card><CardContent><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-neutral-900"><UsersRound aria-hidden className="size-4 text-emerald-700" />Household citizens</p><p className="mt-1 text-xs text-neutral-500">Update profiles and support flags for people in your household.</p></div><Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}><Plus aria-hidden className="size-4" />{adding ? "Close" : "Add citizen"}</Button></div>{adding ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"><RegistryMemberForm submitLabel="Add citizen" onSubmit={(values) => addMember.mutateAsync(values).then(() => undefined)} onCancel={() => setAdding(false)} /></div> : null}<div className="mt-5 space-y-4">{household.members.map((member) => <div key={member.id} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-neutral-900">{member.full_name}{member.is_head ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Head</span> : null}</p><span className="text-xs text-neutral-500">{member.relationship_to_head ?? "Household head"}</span></div><RegistryMemberForm initial={member} protectedName={Boolean(member.is_head)} submitLabel="Save profile" onSubmit={(values) => updateMember.mutateAsync({ id: member.id, body: values }).then(() => undefined)} /></div>)}</div></CardContent></Card></div>;
}
