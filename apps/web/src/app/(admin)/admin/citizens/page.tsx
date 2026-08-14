"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, LockKeyhole, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { CitizenRegistrySummary } from "@/components/features/admin/citizen-registry-summary";
import { ResourceTable, type ResourceColumn, type ResourceFilterChoice } from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { RegistryMemberOut, RegistryMemberSummary } from "@/lib/api/registry-types";

const title = (value?: string | null) => value ? value.replaceAll("_", " ").replace(/\b\p{L}/gu, (x) => x.toUpperCase()) : "—";
const age = (birth?: string | null) => birth ? Math.max(0, new Date().getFullYear() - new Date(birth).getFullYear() - (new Date() < new Date(new Date().getFullYear(), new Date(birth).getMonth(), new Date(birth).getDate()) ? 1 : 0)) : null;
const supportLabels = (row: RegistryMemberOut) => [row.is_pwd && "PWD", (row.is_pregnant || row.is_lactating) && "Maternal", row.has_chronic_condition && "Chronic Condition", row.is_bedridden && "Mobility-Limited"].filter(Boolean) as string[];

export default function RegisteredCitizensPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["admin", "citizens"], queryFn: () => api.get<{ items: RegistryMemberOut[]; total: number }>("/admin/members", { params: { size: 1000 } }).then((r) => r.data) });
  const summary = useQuery({ queryKey: ["admin", "citizens", "summary"], queryFn: () => api.get<RegistryMemberSummary>("/admin/members/summary").then((r) => r.data) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/members/${id}`), onSuccess: () => { toast.success("Citizen archived"); client.invalidateQueries({ queryKey: ["admin", "citizens"] }); }, onError: (error) => toast.error(toDisplayError(error).detail) });
  const columns: ResourceColumn<RegistryMemberOut>[] = [
    { key: "full_name", header: "Registered Citizen", render: (row) => <div className="min-w-48"><p className="font-bold text-neutral-950">{title(row.full_name)}</p><p className="mt-0.5 text-xs text-neutral-500">{row.is_head ? "Household Head" : title(row.relationship_to_head)}</p></div> },
    { key: "household_reference_no", header: "Household Number", render: (row) => <Link href={`/admin/households/${row.household_id}`} className="font-semibold text-emerald-800 hover:underline">{row.household_reference_no}<span className="block text-xs font-normal text-neutral-500">{title(row.household_head_name)}</span></Link> },
    { key: "age_sex", header: "Age / Sex", render: (row) => <div><p className="font-semibold">{age(row.birth_date) ?? "Not Recorded"}</p><p className="text-xs text-neutral-500">{title(row.sex ?? "Sex not recorded")}</p></div> },
    { key: "area_name", header: "Area", render: (row) => title(row.area_name) },
    { key: "support", header: "Support Needs", render: (row) => supportLabels(row).length ? <div className="flex max-w-56 flex-wrap gap-1">{supportLabels(row).map((item) => <Badge key={item} tone="warning">{item}</Badge>)}</div> : <span className="text-xs text-neutral-400">None Recorded</span> },
    { key: "review", header: "Profile Review", render: (row) => <div className="flex flex-wrap gap-1">{!row.birth_date || !row.sex ? <Badge tone="warning">Incomplete Profile</Badge> : null}{!row.contact_number ? <Badge tone="orange">No Contact Number</Badge> : null}{row.birth_date && row.sex && row.contact_number ? <span className="text-xs text-neutral-400">—</span> : null}</div> },
  ];
  const filters = (rows: RegistryMemberOut[]): ResourceFilterChoice<RegistryMemberOut>[] => [
    ...[...new Map(rows.map((row) => [row.area_id, row])).values()].sort((a, b) => a.area_name.localeCompare(b.area_name, undefined, { numeric: true })).map((area) => ({ value: `area:${area.area_id}`, label: area.area_name, matches: (row: RegistryMemberOut) => row.area_id === area.area_id })),
    { value: "heads", label: "Household Heads", matches: (row) => row.is_head },
    { value: "members", label: "Household Members", matches: (row) => !row.is_head },
    { value: "support", label: "With Support Needs", matches: (row) => supportLabels(row).length > 0 },
    { value: "incomplete", label: "Incomplete Profiles", matches: (row) => !row.birth_date || !row.sex },
    { value: "no-contact", label: "Missing Contact Number", matches: (row) => !row.contact_number },
  ];
  return <div className="flex flex-col gap-5 pb-10">
    <AdminPageHeader title="Registered Citizens" description="A person-focused registry of household membership, profile readiness, and recorded support needs." action={<Button asChild size="sm" className="rounded-full bg-emerald-700 px-4 font-bold shadow-md hover:bg-emerald-800"><Link href="/admin/citizens/new"><Plus className="size-4" />Add Household Member</Link></Button>} />
    <CitizenRegistrySummary summary={summary.data} />
    <ResourceTable columns={columns} data={list.data?.items} isLoading={list.isLoading} isError={list.isError} onRetry={() => list.refetch()} getRowKey={(row) => row.id} searchPlaceholder="Search citizen, household number, head, or area" filterChoices={filters} filterAllLabel="All Citizens & Reviews" emptyTitle="No registered citizens" emptyDescription="Citizen records appear after a household is registered." rowActions={(row) => <div className="flex justify-end gap-1.5">
      <Button asChild size="sm" variant="success" className="size-8 rounded-lg border border-emerald-300 bg-emerald-50 p-0 text-emerald-700" title="View citizen"><Link href={`/admin/citizens/${row.id}`}><Eye className="size-3.5" /><span className="sr-only">View citizen</span></Link></Button>
      <Button asChild size="sm" variant="warning" className="size-8 rounded-lg border border-amber-300 bg-amber-50 p-0 text-amber-700" title="Edit citizen"><Link href={`/admin/citizens/${row.id}/edit`}><Pencil className="size-3.5" /><span className="sr-only">Edit citizen</span></Link></Button>
      {user?.role === "admin" ? row.is_head ? <Button size="sm" variant="outline" disabled className="size-8 p-0" title="Replace the household head before deleting"><LockKeyhole className="size-3.5" /><span className="sr-only">Household head is protected</span></Button> : <ConfirmDeleteButton itemLabel={row.full_name} actionLabel="Delete" confirmLabel="Delete" iconOnly onConfirm={() => remove.mutate(row.id)} /> : null}
    </div>} />
  </div>;
}
