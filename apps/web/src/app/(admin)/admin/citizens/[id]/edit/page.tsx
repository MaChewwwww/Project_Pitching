"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { MemberUpdate, RegistryMemberDetailOut } from "@/lib/api/registry-types";

export default function EditCitizenPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const citizen = useQuery({ queryKey: ["admin", "citizen", id], queryFn: () => api.get<RegistryMemberDetailOut>(`/admin/members/${id}`).then((r) => r.data) });
  const save = useMutation({ mutationFn: (body: MemberUpdate) => api.patch(`/admin/members/${id}`, body), onSuccess: () => { toast.success("Citizen profile updated"); client.invalidateQueries({ queryKey: ["admin", "citizen", id] }); client.invalidateQueries({ queryKey: ["admin", "citizens"] }); router.push(`/admin/citizens/${id}`); }, onError: (error) => { throw new Error(toDisplayError(error).detail); } });
  if (citizen.isLoading) return <div className="min-h-64 animate-pulse rounded-2xl bg-white" />;
  if (!citizen.data) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">Citizen could not be loaded.</div>;
  const linkedHead = citizen.data.is_head && Boolean(citizen.data.household_head_user_id);
  return <div className="flex flex-col gap-5 pb-10"><AdminPageHeader title="Edit Citizen" description={`${citizen.data.full_name} · ${citizen.data.household_reference_no} · ${citizen.data.area_name}`} /><RegistryMemberForm initial={citizen.data} isHead={citizen.data.is_head} protectedName={linkedHead} submitLabel="Save Changes" onSubmit={(values) => save.mutateAsync(values).then(() => undefined)} onCancel={() => router.push(`/admin/citizens/${id}`)} /></div>;
}
