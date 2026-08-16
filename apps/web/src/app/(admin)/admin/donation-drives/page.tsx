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
import { DonationDrivePreviewDialog } from "@/components/features/admin/donation-drive-preview-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Donation drives (FR-DON-001, 009, 015…017). Admin and SK officer. */

interface DonationDrive {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  event_id: string | null;
  event_name: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  drop_off_instructions: string | null;
  active_from: string | null;
  active_until: string | null;
  published_at: string | null;
  archived_at: string | null;
}

export default function AdminDonationDrivesPage() {
  useRequireRole("admin", "sk");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "donation-drives"],
    queryFn: () => api.get<DonationDrive[]>("/admin/donation-drives").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/donation-drives/${id}`),
    onSuccess: () => {
      toast.success("Donation drive deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const columns: ResourceColumn<DonationDrive>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-neutral-900 line-clamp-1">{row.title}</span>
          {row.event_name ? (
            <span className="text-[11px] font-semibold text-emerald-700">
              Event: {row.event_name}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "published_at",
      header: "Status",
      render: (row) => {
        const isArchived = Boolean(row.archived_at);
        const isPublished = Boolean(row.published_at);
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
              isArchived
                ? "bg-neutral-100 text-neutral-700"
                : isPublished
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800",
            )}
          >
            {isArchived ? "Archived" : isPublished ? "Published" : "Draft"}
          </span>
        );
      },
    },
    {
      key: "active_until",
      header: "Active Period",
      render: (row) => {
        if (!row.active_from && !row.active_until) return "Ongoing";
        if (row.active_until) {
          return `Until ${formatPhtDateTime(row.active_until)}`;
        }
        return `From ${formatPhtDateTime(row.active_from!)}`;
      },
    },
    {
      key: "drop_off_instructions",
      header: "Drop-off Location",
      render: (row) => (
        <span className="line-clamp-1 max-w-[14rem] text-xs text-neutral-600">
          {row.drop_off_instructions || "Barangay Hall"}
        </span>
      ),
    },
    {
      key: "organizer_name",
      header: "Organizer",
      render: (row) => (
        <span className="text-xs text-neutral-700 font-medium">
          {row.organizer_name || "Barangay San Jose"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Donation Drives"
        description="Manage official donation calls, drop-off locations, and relief assistance campaigns for Barangay San Jose."
        action={
          <Button
            asChild
            size="sm"
            className="h-10 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] transition-all px-4 gap-2 border border-emerald-600/30 max-sm:w-full max-sm:justify-center cursor-pointer"
          >
            <Link href={"/admin/donation-drives/create-drive" as Route}>
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              <span>New drive</span>
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
        emptyTitle="No donation drives yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <DonationDrivePreviewDialog driveId={row.id} title={row.title} />

            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors px-2.5 gap-1.5 font-semibold text-xs cursor-pointer"
              title="Edit donation drive"
              aria-label="Edit donation drive"
            >
              <Link href={`/admin/donation-drives/${row.id}` as Route}>
                <Pencil aria-hidden className="size-3.5 shrink-0" />
                <span className="md:hidden">Edit</span>
              </Link>
            </Button>

            <ConfirmDeleteButton
              itemLabel={row.title}
              actionLabel="Delete"
              confirmLabel="Delete"
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
