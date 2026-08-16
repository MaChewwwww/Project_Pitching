"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Layers, MapPin, Pencil, Plus, Radio } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { ActivityPreviewDialog } from "@/components/features/admin/activity-preview-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

interface Activity {
  id: string;
  title: string;
  type: string;
  excerpt: string;
  starts_at: string;
  venue: string | null;
  area_name: string | null;
  is_upcoming: boolean;
  published_at: string | null;
  archived_at: string | null;
}
export default function AdminActivitiesPage() {
  useRequireRole("admin", "sk");
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "activities"],
    queryFn: () => api.get<Activity[]>("/admin/activities").then((r) => r.data),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/activities/${id}`),
    onSuccess: () => {
      toast.success("Activity removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
  });
  const metrics = React.useMemo(() => {
    const activities = data ?? [];
    return {
      upcoming: activities.filter((item) => item.is_upcoming).length,
      published: activities.filter((item) => item.published_at && !item.archived_at)
        .length,
      drafts: activities.filter((item) => !item.published_at && !item.archived_at).length,
      areaSpecific: activities.filter((item) => item.area_name).length,
    };
  }, [data]);
  const columns: ResourceColumn<Activity>[] = [
    {
      key: "title",
      header: "Activity",
      render: (row) => (
        <div>
          <p className="font-bold text-neutral-900">{row.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
            {row.excerpt || "No summary yet"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <span className="bg-primary-50 text-primary-800 rounded-full px-2.5 py-1 text-[11px] font-bold">
          {row.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "starts_at",
      header: "When",
      render: (row) => formatPhtDateTime(row.starts_at),
    },
    {
      key: "area_name",
      header: "Area",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700">
          <MapPin className="text-primary-600 size-3.5" />
          {row.area_name ?? "Barangay-wide"}
        </span>
      ),
    },
    {
      key: "published_at",
      header: "Status",
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.archived_at ? "bg-neutral-200 text-neutral-700" : row.published_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
        >
          {row.archived_at ? "Archived" : row.published_at ? "Published" : "Draft"}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Community Activities"
        description="Create the public activity story, then add a cover image and publish when it is ready."
        action={
          <Button asChild size="sm">
            <Link href={"/admin/activities/new" as Route}>
              <Plus aria-hidden className="size-4" />
              New activity
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CalendarDays}
          label="Upcoming"
          value={metrics.upcoming}
          detail="scheduled activities"
        />
        <Metric
          icon={Radio}
          label="Published"
          value={metrics.published}
          detail="visible to residents"
        />
        <Metric
          icon={Layers}
          label="Drafts"
          value={metrics.drafts}
          detail="need completion"
        />
        <Metric
          icon={MapPin}
          label="Area-specific"
          value={metrics.areaSpecific}
          detail="local programmes"
        />
      </div>
      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search activity title, type, venue, or area..."
        filterChoices={() => [
          {
            value: "published",
            label: "Published",
            matches: (row) => Boolean(row.published_at) && !row.archived_at,
          },
          {
            value: "draft",
            label: "Drafts",
            matches: (row) => !row.published_at && !row.archived_at,
          },
          {
            value: "archived",
            label: "Archived",
            matches: (row) => Boolean(row.archived_at),
          },
          ...[
            "drill",
            "seminar",
            "first_aid",
            "cleanup",
            "tree_planting",
            "ngo_program",
            "other",
          ].map((type) => ({
            value: `type:${type}`,
            label: type.replace(/_/g, " "),
            matches: (row: Activity) => row.type === type,
          })),
        ]}
        emptyTitle="No activities yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ActivityPreviewDialog activityId={row.id} title={row.title} />
            <Button asChild size="sm" variant="warning">
              <Link href={`/admin/activities/${row.id}` as Route}>
                <Pencil aria-hidden className="size-3.5" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>
            <ConfirmDeleteButton
              itemLabel={row.title}
              onConfirm={() => deleteMutation.mutate(row.id)}
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
  icon: typeof CalendarDays;
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
