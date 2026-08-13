"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Merge as MergeIcon, Pencil, Plus, UserRoundSearch } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistrySummaryRibbon } from "@/components/features/admin/registry-summary";
import { ResourceTable, type ResourceColumn } from "@/components/features/admin/resource-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { DuplicateCandidate, HouseholdOut, RegistrySummary } from "@/lib/api/registry-types";

export default function AdminHouseholdsPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [mergeTarget, setMergeTarget] = React.useState<HouseholdOut | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "households", { flagged: flaggedOnly }],
    queryFn: () =>
      api
        .get<{ items: HouseholdOut[]; total: number }>("/admin/households", {
          params: { size: 1000, flagged: flaggedOnly },
        })
        .then((r) => r.data),
  });
  const { data: summary } = useQuery({
    queryKey: ["admin", "registry-summary"],
    queryFn: () => api.get<RegistrySummary>("/admin/households/summary").then((r) => r.data),
  });

  const mergeMutation = useMutation({
    mutationFn: (body: { kept_household_id: string; merged_household_id: string }) =>
      api.post("/admin/households/merge", body),
    onSuccess: () => {
      toast.success("Households merged and duplicate retired");
      queryClient.invalidateQueries({ queryKey: ["admin", "households"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "registry-summary"] });
      setMergeTarget(null);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["admin", "households", mergeTarget?.id, "duplicates"],
    queryFn: () =>
      api.get<DuplicateCandidate[]>(`/admin/households/${mergeTarget!.id}/duplicates`).then((r) => r.data),
    enabled: !!mergeTarget,
  });

  const columns: ResourceColumn<HouseholdOut>[] = [
    {
      key: "reference_no",
      header: "Household Number",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-bold text-neutral-900">{row.reference_no}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {row.source === "self" ? "Self-registered" : "BHW-assisted"}
            {row.verified_at ? " · Verified" : " · Needs review"}
          </p>
        </div>
      ),
    },
    {
      key: "head_name",
      header: "Head of household",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-semibold text-neutral-900">{row.head_name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {row.contact_number ?? (row.is_unreachable_by_phone ? "No reliable phone" : "No phone recorded")}
          </p>
        </div>
      ),
    },
    { key: "area_name", header: "Area", render: (row) => row.area_name ?? "—" },
    {
      key: "member_count",
      header: "Citizens",
      render: (row) => <span className="font-semibold tabular-nums">{row.member_count}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <Badge tone={row.source === "self" ? "success" : "neutral"}>
          {row.source === "self" ? "Resident" : "BHW visit"}
        </Badge>
      ),
    },
    {
      key: "flag",
      header: "Review",
      render: (row) => (row.has_possible_duplicate ? <Badge tone="warning">Possible duplicate</Badge> : <span className="text-xs text-neutral-400">—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader
        title="Household list"
        description="A living ledger of registered homes, their coverage, and the citizens linked to each record."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/citizens"><UserRoundSearch aria-hidden className="size-4" />Registered citizens</Link>
            </Button>
            {user?.role !== "sk" ? (
              <Button asChild size="sm"><Link href="/admin/households/new"><Plus aria-hidden className="size-4" />New household</Link></Button>
            ) : null}
          </div>
        }
        meta={<span className="text-xs font-semibold text-emerald-800">FR-REG registry workspace · area-scoped for BHW</span>}
      />

      <RegistrySummaryRibbon summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(event) => setFlaggedOnly(event.target.checked)}
            className="size-4 rounded border-neutral-300 accent-emerald-600"
          />
          Show possible duplicates only
        </label>
        <p className="text-xs text-neutral-500">Select a row to inspect its roster, edit details, or resolve a duplicate.</p>
      </div>

      <ResourceTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={flaggedOnly ? "No duplicate records" : "No households registered yet"}
        emptyDescription={flaggedOnly ? "The registry has no household pairs waiting for review." : "Start the registry with a BHW-assisted household record."}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search reference, head, or area"
        rowActions={(row) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button asChild size="sm" variant="outline" className="size-9 px-0" title="View household">
              <Link href={`/admin/households/${row.id}`}><Eye aria-hidden className="size-4" /><span className="sr-only">View household</span></Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="size-9 px-0" title="Edit household">
              <Link href={`/admin/households/${row.id}/edit`}><Pencil aria-hidden className="size-4" /><span className="sr-only">Edit household</span></Link>
            </Button>
            {row.has_possible_duplicate && user?.role === "admin" ? (
              <Dialog open={mergeTarget?.id === row.id} onOpenChange={(open) => setMergeTarget(open ? row : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="size-9 px-0" title="Resolve duplicate"><MergeIcon aria-hidden className="size-4" /><span className="sr-only">Resolve duplicate</span></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Resolve duplicate for {row.head_name}</DialogTitle></DialogHeader>
                  <p className="text-sm text-neutral-600">Choose the matching record to fold into this household. Members are preserved and the duplicate is retired.</p>
                  <div className="flex flex-col gap-2">
                    {candidatesLoading ? <p className="text-sm text-neutral-500">Checking for matches…</p> : !candidates?.length ? <p className="text-sm text-neutral-500">No matching record found. Refresh and try again.</p> : candidates.map((candidate) => (
                      <Button key={candidate.household_id} type="button" variant="outline" className="h-auto flex-col items-start py-2" disabled={mergeMutation.isPending} onClick={() => mergeMutation.mutate({ kept_household_id: row.id, merged_household_id: candidate.household_id })}>
                        <span>{candidate.head_name} · {candidate.reference_no}</span>
                        <span className="text-xs text-neutral-500">{candidate.match_reason === "name_similarity" ? "Similar head name" : "Shared member name and birth date"}</span>
                      </Button>
                    ))}
                  </div>
                  <DialogFooter />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
