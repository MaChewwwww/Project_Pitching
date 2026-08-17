"use client";

import Link from "next/link";
import type { Route } from "next";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, Languages, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { GuidePreviewDialog } from "@/components/features/admin/guide-preview-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDate } from "@/lib/format";

function guideLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

interface Guide {
  id: string;
  slug: string;
  hazard_type: string;
  title_fil: string;
  title_en: string;
  phase: string;
  source_attribution: string | null;
  last_reviewed_at: string | null;
  is_published: boolean;
  sort_order: number;
}

export default function AdminGuidesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin", "guides"],
    queryFn: () => api.get<Guide[]>("/admin/guides").then((response) => response.data),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/guides/${id}`),
    onSuccess: () => {
      toast.success("Guide Removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const metrics = React.useMemo(() => {
    const guides = data ?? [];
    return {
      total: guides.length,
      published: guides.filter((guide) => guide.is_published).length,
      hazards: new Set(guides.map((guide) => guide.hazard_type)).size,
      reviewed: guides.filter(
        (guide) => guide.last_reviewed_at && guide.source_attribution,
      ).length,
    };
  }, [data]);
  const columns: ResourceColumn<Guide>[] = [
    {
      key: "title_en",
      header: "Guide",
      render: (row) => (
        <div>
          <p className="font-bold text-neutral-900">{row.title_en}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{row.title_fil}</p>
        </div>
      ),
    },
    {
      key: "hazard_type",
      header: "Hazard / Phase",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-primary-50 text-primary-800 rounded-full px-2 py-1 text-[11px] font-bold capitalize">
            {guideLabel(row.hazard_type)}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 capitalize">
            {guideLabel(row.phase)}
          </span>
        </div>
      ),
    },
    {
      key: "last_reviewed_at",
      header: "Review Record",
      render: (row) =>
        row.last_reviewed_at ? (
          <span className="text-xs text-neutral-700">
            {formatPhtDate(row.last_reviewed_at)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Needs Date</span>
        ),
    },
    {
      key: "is_published",
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${row.is_published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
        >
          {row.is_published ? "Published" : "Draft"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Preparedness Guides"
        description="Maintain bilingual, source-dated guidance for the hazards San Jose faces."
        action={
          <Button
            asChild
            size="sm"
            className="h-10 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
          >
            <Link href={"/admin/guides/new" as Route}>
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              New Guide
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={BookOpen}
          label="Total Guides"
          value={metrics.total}
          detail="Preparedness Records"
        />
        <Metric
          icon={Languages}
          label="Published"
          value={metrics.published}
          detail="Visible To Residents"
        />
        <Metric
          icon={BookOpen}
          label="Hazards Covered"
          value={metrics.hazards}
          detail="Distinct Guide Topics"
        />
        <Metric
          icon={CalendarCheck}
          label="Review Records"
          value={metrics.reviewed}
          detail="Source And Date Complete"
        />
      </div>
      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading || isFetching}
        loadingLabel="Loading preparedness guides"
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search guide title, hazard, phase, or source..."
        filterChoices={() => [
          { value: "published", label: "Published", matches: (row) => row.is_published },
          { value: "draft", label: "Drafts", matches: (row) => !row.is_published },
          {
            value: "needs-review",
            label: "Needs Review Date",
            matches: (row) => !row.last_reviewed_at,
          },
        ]}
        emptyTitle="No Guides Yet"
        emptyDescription="Create a bilingual preparedness guide for residents."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <GuidePreviewDialog guideId={row.id} title={row.title_en} />
            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              title="Edit Guide"
              aria-label="Edit Guide"
            >
              <Link href={`/admin/guides/${row.id}` as Route}>
                <Pencil aria-hidden className="size-3.5" />
                <span>Edit</span>
              </Link>
            </Button>
            <ConfirmDeleteButton
              itemLabel={row.title_en}
              actionLabel="Delete"
              confirmLabel="Delete"
              onConfirm={() => remove.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-neutral-600 uppercase">
          {label}
        </span>
        <Icon className="text-primary-700 size-4" />
      </div>
      <p className="mt-4 text-3xl font-black text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </section>
  );
}
