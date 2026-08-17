"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, LockKeyhole, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { CitizenRegistrySummary } from "@/components/features/admin/citizen-registry-summary";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
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
import type { RegistryMemberOut, RegistryMemberSummary } from "@/lib/api/registry-types";

function title(value?: string | null): string {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\p{L}/gu, (x) => x.toUpperCase());
}

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function supportLabels(row: RegistryMemberOut): string[] {
  return [
    row.is_pwd && "PWD",
    (row.is_pregnant || row.is_lactating) && "Maternal",
    row.has_chronic_condition && "Chronic Condition",
    row.is_bedridden && "Mobility-Limited",
  ].filter(Boolean) as string[];
}

export default function RegisteredCitizensPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const client = useQueryClient();

  const canAdminister = user?.role === "admin" || user?.role === "superadmin";
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [directoryFilter, setDirectoryFilter] = React.useState("all");
  const deferredSearch = React.useDeferredValue(search);
  const directoryFilterParams = React.useMemo(() => {
    if (directoryFilter.startsWith("area:")) {
      return { area_id: directoryFilter.slice("area:".length) };
    }
    if (directoryFilter === "heads") return { head_only: true };
    if (directoryFilter === "vulnerable") return { vulnerable: true };
    return {};
  }, [directoryFilter]);

  const list = useQuery({
    queryKey: [
      "admin",
      "citizens",
      { page, query: deferredSearch, filter: directoryFilter },
    ],
    queryFn: () =>
      api
        .get<{
          items: RegistryMemberOut[];
          total: number;
          page: number;
          pages: number;
          size: number;
        }>("/admin/members", {
          params: {
            page,
            size: 50,
            query: deferredSearch || undefined,
            ...directoryFilterParams,
          },
        })
        .then((r) => r.data),
  });

  const summary = useQuery({
    queryKey: ["admin", "citizens", "summary"],
    queryFn: () =>
      api.get<RegistryMemberSummary>("/admin/members/summary").then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/members/${id}`),
    onSuccess: () => {
      toast.success("Citizen deleted from registry");
      client.invalidateQueries({ queryKey: ["admin", "citizens"] });
      client.invalidateQueries({ queryKey: ["admin", "citizens", "summary"] });
      client.invalidateQueries({ queryKey: ["admin", "households"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const columns: ResourceColumn<RegistryMemberOut>[] = [
    {
      key: "full_name",
      header: "Registered Citizen",
      render: (row) => (
        <div className="min-w-48">
          <p className="font-bold text-neutral-950">{title(row.full_name)}</p>
          <p
            className={`mt-0.5 text-xs font-bold ${
              row.is_head ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            {row.is_head ? "Household Head" : "Household Member"}
          </p>
        </div>
      ),
    },
    {
      key: "household_reference_no",
      header: "Household Number",
      render: (row) => (
        <Link
          href={`/admin/households/${row.household_id}` as Route}
          className="font-semibold text-emerald-800 transition-colors hover:text-emerald-900 hover:underline"
        >
          {row.household_reference_no}
          <span className="block text-xs font-normal text-neutral-500">
            {title(row.household_head_name)}
          </span>
        </Link>
      ),
    },
    {
      key: "age_sex",
      header: "Age / Sex",
      render: (row) => {
        const ageVal = calculateAge(row.birth_date);
        return (
          <div>
            <p className="font-semibold text-neutral-900">
              {ageVal !== null ? `${ageVal} yrs` : "Not Recorded"}
            </p>
            <p className="text-xs text-neutral-500">
              {title(row.sex ?? "Sex not recorded")}
            </p>
          </div>
        );
      },
    },
    {
      key: "area_name",
      header: "Area",
      render: (row) => title(row.area_name),
    },
    {
      key: "support",
      header: "Support Needs",
      render: (row) => {
        const labels = supportLabels(row);
        return labels.length ? (
          <div className="flex max-w-56 flex-wrap gap-1">
            {labels.map((item) => (
              <Badge key={item} tone="warning">
                {item}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        );
      },
    },
    {
      key: "review",
      header: "Profile Review",
      render: (row) => {
        const issues = [];
        if (!row.birth_date || !row.sex) {
          issues.push(
            <Badge key="incomplete" tone="warning">
              Incomplete Profile
            </Badge>,
          );
        }
        if (!row.contact_number) {
          issues.push(
            <Badge key="contact" tone="orange">
              No Contact Number
            </Badge>,
          );
        }
        return issues.length ? (
          <div className="flex flex-wrap gap-1">{issues}</div>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader
        title="Registered Citizens"
        description="A person-focused registry of household membership, profile readiness, and recorded support needs."
        action={
          <Button
            asChild
            size="sm"
            className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
          >
            <Link href="/admin/citizens/new">
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              Add Household Member
            </Link>
          </Button>
        }
      />

      <CitizenRegistrySummary summary={summary.data} />

      <ResourceTable
        columns={columns}
        data={list.data?.items}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search citizen, household number, head, or area"
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
              <SelectItem value="all">All citizens</SelectItem>
              {(summary.data?.areas ?? []).map((area) => (
                <SelectItem key={area.id} value={`area:${area.id}`}>
                  {title(area.name)}
                </SelectItem>
              ))}
              <SelectItem value="heads">Household heads</SelectItem>
              <SelectItem value="vulnerable">Priority support needs</SelectItem>
            </SelectContent>
          </Select>
        }
        externalFilterActive={directoryFilter !== "all"}
        onResetExternalFilters={() => setDirectoryFilter("all")}
        serverPagination={{
          page: list.data?.page ?? page,
          pages: list.data?.pages ?? 1,
          size: list.data?.size ?? 50,
          total: list.data?.total ?? 0,
          onPageChange: setPage,
        }}
        disableSorting
        emptyTitle="No registered citizens"
        emptyDescription="Citizen records appear after a household is registered."
        rowActions={(row) => (
          <div className="flex justify-end gap-1.5">
            <Button
              asChild
              size="sm"
              variant="success"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
              title="View citizen"
              aria-label="View citizen"
            >
              <Link href={`/admin/citizens/${row.id}` as Route}>
                <Eye aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">View</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
              title="Edit citizen"
              aria-label="Edit citizen"
            >
              <Link href={`/admin/citizens/${row.id}/edit` as Route}>
                <Pencil aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>
            {canAdminister ? (
              row.is_head ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="h-8 cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 text-xs font-semibold text-neutral-400 opacity-60"
                  title="Replace the household head before deleting"
                  aria-label="Household head is protected from direct deletion"
                >
                  <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
                </Button>
              ) : (
                <ConfirmDeleteButton
                  itemLabel={title(row.full_name)}
                  actionLabel="Delete"
                  confirmLabel="Delete"
                  iconOnly
                  onConfirm={() => remove.mutate(row.id)}
                />
              )
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
