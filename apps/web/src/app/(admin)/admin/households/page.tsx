"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Merge as MergeIcon, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { HouseholdRegistrySummary } from "@/components/features/admin/registry-summary";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  DuplicateCandidate,
  HouseholdOut,
  RegistrySummary,
} from "@/lib/api/registry-types";
import type { PublicBarangayStats, FloodExposure } from "@/lib/api/public-types";

function titleCaseWords(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export default function AdminHouseholdsPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canAdministerHouseholds = user?.role === "admin" || user?.role === "superadmin";
  const [mergeTarget, setMergeTarget] = React.useState<HouseholdOut | null>(null);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [directoryFilter, setDirectoryFilter] = React.useState("all");
  const deferredSearch = React.useDeferredValue(search);
  const directoryFilterParams = React.useMemo(() => {
    if (directoryFilter.startsWith("area:")) {
      return { area_id: directoryFilter.slice("area:".length) };
    }
    if (directoryFilter === "review:possible-duplicate") return { flagged: true };
    if (directoryFilter.startsWith("source:")) {
      return { source: directoryFilter.slice("source:".length) };
    }
    return {};
  }, [directoryFilter]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "admin",
      "households",
      { page, query: deferredSearch, filter: directoryFilter },
    ],
    queryFn: () =>
      api
        .get<{
          items: HouseholdOut[];
          total: number;
          page: number;
          pages: number;
          size: number;
        }>("/admin/households", {
          params: {
            page,
            size: 50,
            query: deferredSearch || undefined,
            ...directoryFilterParams,
          },
        })
        .then((r) => r.data),
  });
  const { data: summary, isFetching: summaryFetching } = useQuery({
    queryKey: ["admin", "registry-summary"],
    queryFn: () =>
      api.get<RegistrySummary>("/admin/households/summary").then((r) => r.data),
  });
  const { data: areaStats } = useQuery({
    queryKey: ["public", "area-stats"],
    queryFn: () => api.get<PublicBarangayStats>("/public/area-stats").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const areaRisk = React.useMemo(
    () =>
      new Map(
        areaStats?.areas.map((area) => [area.area_id, area.flood_exposure] as const),
      ),
    [areaStats],
  );
  const riskCounts = React.useMemo(() => {
    if (!summary || !areaStats) return undefined;
    return summary.areas.reduce(
      (counts, household) => {
        const risk = areaRisk.get(household.id);
        if (risk) counts[risk] += household.households;
        return counts;
      },
      { low: 0, medium: 0, high: 0 },
    );
  }, [areaRisk, areaStats, summary]);

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

  const deleteMutation = useMutation({
    mutationFn: (householdId: string) => api.delete(`/admin/households/${householdId}`),
    onSuccess: () => {
      toast.success("Household deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "households"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "registry-summary"] });
      queryClient.invalidateQueries({ queryKey: ["public", "area-stats"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["admin", "households", mergeTarget?.id, "duplicates"],
    queryFn: () =>
      api
        .get<DuplicateCandidate[]>(`/admin/households/${mergeTarget!.id}/duplicates`)
        .then((r) => r.data),
    enabled: !!mergeTarget,
  });

  const columns: ResourceColumn<HouseholdOut>[] = [
    {
      key: "reference_no",
      header: "Household Number",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-bold text-neutral-900">{row.reference_no}</p>
          <p
            className={
              row.source === "self"
                ? "mt-0.5 text-xs font-semibold text-emerald-700"
                : "mt-0.5 text-xs font-semibold text-orange-700"
            }
          >
            {row.source === "self" ? "Self-Registered" : "BHW-Assisted"}
          </p>
        </div>
      ),
    },
    {
      key: "head_name",
      header: "Head of household",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-semibold text-neutral-900">
            {titleCaseWords(row.head_name)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {row.contact_number ??
              (row.is_unreachable_by_phone ? "No Reliable Phone" : "No Phone Recorded")}
          </p>
        </div>
      ),
    },
    {
      key: "member_count",
      header: "Members",
      render: (row) => (
        <span className="font-semibold tabular-nums">{row.member_count}</span>
      ),
    },
    { key: "area_name", header: "Area", render: (row) => titleCaseWords(row.area_name) },
    {
      key: "flood_exposure",
      header: "Flood Risk",
      filterable: false,
      filterValue: (row) => areaRisk.get(row.area_id) ?? "not_recorded",
      render: (row) => {
        const risk = areaRisk.get(row.area_id) as FloodExposure | null | undefined;
        if (!risk) return <span className="text-xs text-neutral-400">Not Recorded</span>;
        const tone =
          risk === "high" ? "danger" : risk === "medium" ? "warning" : "success";
        return <Badge tone={tone}>{titleCaseWords(risk)}</Badge>;
      },
    },
    {
      key: "has_possible_duplicate",
      header: "Review",
      render: (row) => {
        const reviewItems = [
          row.has_possible_duplicate ? (
            <Badge key="duplicate" tone="warning">
              Possible Duplicate
            </Badge>
          ) : null,
          !row.contact_number ? (
            <Badge key="contact" tone="orange">
              No Contact Number
            </Badge>
          ) : null,
        ].filter(Boolean);
        return reviewItems.length ? (
          <div className="flex flex-wrap gap-1.5">{reviewItems}</div>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader
        title="Household List"
        description="A living ledger of registered homes, their coverage, and the citizens linked to each record."
        action={
          <div className="flex flex-wrap gap-2">
            {user?.role !== "sk" ? (
              <Button
                asChild
                size="sm"
                className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
              >
                <Link href="/admin/households/new">
                  <Plus aria-hidden className="size-4 stroke-[2.5]" />
                  New Household
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <HouseholdRegistrySummary
        summary={summary}
        riskCounts={riskCounts}
        isLoading={summaryFetching}
      />

      <ResourceTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading || isFetching}
        loadingLabel="Loading households"
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No households registered yet"
        emptyDescription="Start the registry with a BHW-assisted household record."
        getRowKey={(row) => row.id}
        searchPlaceholder="Search household number, head, or area"
        searchValue={search}
        onSearchChange={setSearch}
        filterSlots={
          <Select
            value={directoryFilter}
            onValueChange={(value) => {
              setDirectoryFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[180px] rounded-full border-emerald-600/30 bg-white px-3.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 sm:w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All households</SelectItem>
              {(summary?.areas ?? []).map((area) => (
                <SelectItem key={area.id} value={`area:${area.id}`}>
                  {titleCaseWords(area.name)}
                </SelectItem>
              ))}
              <SelectItem value="review:possible-duplicate">
                Possible duplicates
              </SelectItem>
              <SelectItem value="source:bhw">BHW-assisted</SelectItem>
              <SelectItem value="source:self">Self-registered</SelectItem>
            </SelectContent>
          </Select>
        }
        externalFilterActive={directoryFilter !== "all"}
        onResetExternalFilters={() => setDirectoryFilter("all")}
        serverPagination={{
          page: data?.page ?? page,
          pages: data?.pages ?? 1,
          size: data?.size ?? 50,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
        disableSorting
        rowActions={(row) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button
              asChild
              size="sm"
              variant="success"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
              title="View household"
              aria-label="View household"
            >
              <Link href={`/admin/households/${row.id}`}>
                <Eye aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">View</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
              title="Edit household"
              aria-label="Edit household"
            >
              <Link href={`/admin/households/${row.id}/edit`}>
                <Pencil aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>
            {row.has_possible_duplicate && canAdministerHouseholds ? (
              <Dialog
                open={mergeTarget?.id === row.id}
                onOpenChange={(open) => setMergeTarget(open ? row : null)}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 cursor-pointer gap-1.5 rounded-lg border border-violet-300/80 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 hover:text-violet-800"
                    title="Resolve duplicate"
                    aria-label="Resolve duplicate"
                  >
                    <MergeIcon aria-hidden className="size-3.5 shrink-0" />
                    <span className="md:hidden">Resolve</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resolve duplicate for {row.head_name}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-neutral-600">
                    Choose the matching record to fold into this household. Members are
                    preserved and the duplicate is retired.
                  </p>
                  <div className="flex flex-col gap-2">
                    {candidatesLoading ? (
                      <p className="text-sm text-neutral-500">Checking for matches…</p>
                    ) : !candidates?.length ? (
                      <p className="text-sm text-neutral-500">
                        No matching record found. Refresh and try again.
                      </p>
                    ) : (
                      candidates.map((candidate) => (
                        <Button
                          key={candidate.household_id}
                          type="button"
                          variant="outline"
                          className="h-auto flex-col items-start py-2"
                          disabled={mergeMutation.isPending}
                          onClick={() =>
                            mergeMutation.mutate({
                              kept_household_id: row.id,
                              merged_household_id: candidate.household_id,
                            })
                          }
                        >
                          <span>
                            {candidate.head_name} · {candidate.reference_no}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {candidate.match_reason === "name_similarity"
                              ? "Similar head name"
                              : "Shared member name and birth date"}
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                  <DialogFooter />
                </DialogContent>
              </Dialog>
            ) : null}
            {canAdministerHouseholds ? (
              <ConfirmDeleteButton
                itemLabel={row.reference_no}
                actionLabel="Delete"
                confirmLabel="Delete"
                iconOnly
                onConfirm={() => deleteMutation.mutate(row.id)}
              />
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
