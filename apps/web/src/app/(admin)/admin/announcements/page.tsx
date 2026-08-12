"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { ArticlePreviewDialog } from "@/components/features/admin/article-preview-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
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
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const columns: ResourceColumn<Announcement>[] = [
    { key: "title", header: "Title" },
    { key: "kind", header: "Type" },
    { key: "type", header: "Category" },
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
      <AdminPageHeader
        title="Alerts & Advisories"
        description="Publishing here is the only way a public alert reaches the site — nothing is ever automated (D-4)."
        action={
          <Button
            asChild
            size="sm"
            className="h-10 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] transition-all px-4 gap-2 border border-emerald-600/30 max-sm:w-full max-sm:justify-center cursor-pointer"
          >
            <Link href={"/admin/announcements/create-announcement" as Route}>
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              <span>New article</span>
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
            <ArticlePreviewDialog announcementId={row.id} title={row.title} />

            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors px-2.5 gap-1.5 font-semibold text-xs cursor-pointer"
              title="Edit article"
              aria-label="Edit article"
            >
              <Link href={`/admin/announcements/${row.id}` as Route}>
                <Pencil aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>

            <ConfirmDeleteButton
              itemLabel={row.title}
              actionLabel="Delete"
              confirmLabel="Delete"
              onConfirm={() => deactivateMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
