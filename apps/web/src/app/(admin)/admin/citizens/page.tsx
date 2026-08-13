"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Pencil, Plus, UsersRound } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistrySummaryRibbon } from "@/components/features/admin/registry-summary";
import { ResourceTable, type ResourceColumn } from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { RegistryMemberOut, RegistrySummary } from "@/lib/api/registry-types";

function titleCaseWords(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export default function RegisteredCitizensPage() {
  useRequireRole("admin", "bhw");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "citizens"],
    queryFn: () => api.get<{ items: RegistryMemberOut[]; total: number }>("/admin/members", { params: { size: 1000 } }).then((r) => r.data),
  });
  const { data: summary } = useQuery({ queryKey: ["admin", "registry-summary"], queryFn: () => api.get<RegistrySummary>("/admin/households/summary").then((r) => r.data) });

  const columns: ResourceColumn<RegistryMemberOut>[] = [
    { key: "full_name", header: "Members", render: (row) => <div className="min-w-48"><p className="font-bold text-neutral-900">{titleCaseWords(row.full_name)}{row.is_head ? <Badge tone="success" className="ml-2">Head</Badge> : null}</p><p className="mt-0.5 text-xs text-neutral-500">{titleCaseWords(row.relationship_to_head ?? "Household head / relationship not recorded")}</p></div> },
    { key: "household_reference_no", header: "Household Number", render: (row) => <Link className="font-semibold text-emerald-800 hover:underline" href={`/admin/households/${row.household_id}`}>{row.household_reference_no}<span className="mt-0.5 block text-xs font-normal text-neutral-500">{titleCaseWords(row.household_head_name)}</span></Link> },
    { key: "area_name", header: "Area", render: (row) => titleCaseWords(row.area_name) },
    { key: "sex", header: "Profile", render: (row) => <div className="text-xs text-neutral-600"><span>{titleCaseWords(row.sex ?? "Sex not recorded")}</span>{row.birth_date ? <span className="mt-0.5 block">Born {new Date(row.birth_date).toLocaleDateString()}</span> : null}</div> },
    { key: "flags", header: "Support needs", render: (row) => { const flags = [row.is_pwd && "PWD", row.is_senior && "Senior", row.is_child && "Child", row.is_pregnant && "Pregnant", row.is_lactating && "Lactating", row.is_bedridden && "Mobility"].filter((flag): flag is string => Boolean(flag)); return flags.length ? <div className="flex flex-wrap gap-1">{flags.map((flag) => <Badge key={flag} tone="warning">{flag}</Badge>)}</div> : <span className="text-xs text-neutral-400">None recorded</span>; } },
  ];

  return <div className="flex flex-col gap-6 pb-10"><AdminPageHeader title="Registered citizens" description="Every active citizen profile in the registry, with household context and support flags visible at a glance." action={<div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href="/admin/households"><UsersRound aria-hidden className="size-4" />Household list</Link></Button><Button asChild size="sm"><Link href="/admin/citizens/new"><Plus aria-hidden className="size-4" />Add citizen</Link></Button></div>} /><RegistrySummaryRibbon summary={summary} /><ResourceTable columns={columns} data={data?.items} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyTitle="No citizens registered yet" emptyDescription="Citizens appear here as soon as a household is created or a resident adds a member." getRowKey={(row) => row.id} searchPlaceholder="Search citizen, household, or area" rowActions={(row) => <div className="flex gap-1.5"><Button asChild size="sm" variant="outline" className="size-9 px-0" title="View household"><Link href={`/admin/households/${row.household_id}`}><Eye aria-hidden className="size-4" /><span className="sr-only">View household</span></Link></Button><Button asChild size="sm" variant="outline" className="size-9 px-0" title="Edit citizen"><Link href={`/admin/citizens/${row.id}/edit`}><Pencil aria-hidden className="size-4" /><span className="sr-only">Edit citizen</span></Link></Button></div>} /></div>;
}
