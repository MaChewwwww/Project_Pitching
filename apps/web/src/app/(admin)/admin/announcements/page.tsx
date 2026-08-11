"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

/** Announcements & alerts (FR-ALT-*). Admin and SK officer. */

interface Announcement {
  id: string;
  kind: "announcement" | "alert";
  type: string;
  title: string;
  published_at: string | null;
  deactivated_at: string | null;
  is_active: boolean;
  area_names: string[];
  issued_by_name: string;
}
export default function AdminAnnouncementsPage() {
  useRequireRole("admin", "sk");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => api.get<Announcement[]>("/admin/announcements").then((r) => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      toast.success("Announcement deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });

  const columns: ResourceColumn<Announcement>[] = [
    { key: "title", header: "Title" },
    { key: "kind", header: "Kind" },
    { key: "type", header: "Type" },
    {
      key: "published_at",
      header: "Published",
      render: (row) => (row.published_at ? formatPhtDateTime(row.published_at) : "Draft"),
    },
    {
      key: "area_names",
      header: "Areas",
      render: (row) =>
        row.area_names.length > 0 ? row.area_names.join(", ") : "Barangay-wide",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        titleAccent="& alerts"
        description="Publishing here is the only way a public alert reaches the site — nothing is ever automated (D-4)."
        action={
          <Button asChild size="sm">
            <Link href={"/admin/announcements/new" as Route}>
            <Plus aria-hidden className="size-4" />
            New article
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
        emptyTitle="No announcements yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/announcements/${row.id}` as Route}>Edit</Link>
            </Button>
            {row.is_active ? (
              <ConfirmDeleteButton
                itemLabel={row.title}
                actionLabel="Deactivate"
                confirmLabel="Deactivate"
                onConfirm={() => deactivateMutation.mutate(row.id)}
              />
            ) : null}
          </>
        )}
      />
    </div>
  );
}
