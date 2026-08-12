"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
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
  area_name: string | null;
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
  const columns: ResourceColumn<Activity>[] = [
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    {
      key: "starts_at",
      header: "When",
      render: (row) => formatPhtDateTime(row.starts_at),
    },
    {
      key: "area_name",
      header: "Area",
      render: (row) => row.area_name ?? "Barangay-wide",
    },
    {
      key: "published_at",
      header: "Status",
      render: (row) =>
        row.archived_at ? "Archived" : row.published_at ? "Published" : "Draft",
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
      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No activities yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/activities/${row.id}` as Route}>Edit</Link>
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
