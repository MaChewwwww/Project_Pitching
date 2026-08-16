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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "guides"],
    queryFn: () => api.get<Guide[]>("/admin/guides").then((response) => response.data),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/guides/${id}`),
    onSuccess: () => {
      toast.success("Guide removed");
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
      header: "Hazard / phase",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-primary-50 text-primary-800 rounded-full px-2 py-1 text-[11px] font-bold capitalize">
            {row.hazard_type}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 capitalize">
            {row.phase}
          </span>
        </div>
      ),
    },
    {
      key: "last_reviewed_at",
      header: "Review record",
      render: (row) =>
        row.last_reviewed_at ? (
          <span className="text-xs text-neutral-700">
            {formatPhtDate(row.last_reviewed_at)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Needs date</span>
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
          <Button asChild size="sm">
            <Link href={"/admin/guides/new" as Route}>
              <Plus aria-hidden className="size-4" />
              New guide
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={BookOpen}
          label="Total guides"
          value={metrics.total}
          detail="preparedness records"
        />
        <Metric
          icon={Languages}
          label="Published"
          value={metrics.published}
          detail="visible to residents"
        />
        <Metric
          icon={BookOpen}
          label="Hazards covered"
          value={metrics.hazards}
          detail="distinct guide topics"
        />
        <Metric
          icon={CalendarCheck}
          label="Review records"
          value={metrics.reviewed}
          detail="source and date complete"
        />
      </div>
      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search guide title, hazard, phase, or source..."
        filterChoices={() => [
          { value: "published", label: "Published", matches: (row) => row.is_published },
          { value: "draft", label: "Drafts", matches: (row) => !row.is_published },
          {
            value: "needs-review",
            label: "Needs review date",
            matches: (row) => !row.last_reviewed_at,
          },
        ]}
        emptyTitle="No guides yet"
        emptyDescription="Create a bilingual preparedness guide for residents."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <GuidePreviewDialog guideId={row.id} title={row.title_en} />
            <Button asChild size="sm" variant="warning">
              <Link href={`/admin/guides/${row.id}` as Route}>
                <Pencil aria-hidden className="size-3.5" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>
            <ConfirmDeleteButton
              itemLabel={row.title_en}
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
