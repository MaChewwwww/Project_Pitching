"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Gift, Layers, Pencil, Plus, Radio } from "lucide-react";

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

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
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

  const metrics = React.useMemo(() => {
    const list = data ?? [];
    const total = list.length;
    const published = list.filter(
      (d) => Boolean(d.published_at) && !d.archived_at,
    ).length;
    const drafts = list.filter((d) => !d.published_at && !d.archived_at).length;
    const archived = list.filter((d) => Boolean(d.archived_at)).length;
    const emergencyLinked = list.filter((d) => Boolean(d.event_id)).length;
    const generalDrives = total - emergencyLinked;

    return {
      total,
      published,
      drafts,
      archived,
      emergencyLinked,
      generalDrives,
    };
  }, [data]);

  const columns: ResourceColumn<DonationDrive>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="line-clamp-1 font-bold text-neutral-900">{row.title}</span>
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
        <span className="text-xs font-medium text-neutral-700">
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
            className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
          >
            <Link href={"/admin/donation-drives/create-drive" as Route}>
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              <span>New drive</span>
            </Link>
          </Button>
        }
      />

      {/* Summary KPI Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active In-Kind Drives */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
              Active Relief Drives
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100/80 text-emerald-700 shadow-2xs">
              <Gift className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.published}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              active campaigns
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Open to Public:</span>
            <span className="font-bold text-emerald-800">
              {metrics.published > 0 ? "Accepting Donations" : "No live drives"}
            </span>
          </div>
        </div>

        {/* Card 2: Disaster Response Linked */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/20 to-orange-50/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-rose-900 uppercase">
              Disaster-Linked Drives
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-700 shadow-2xs">
              <Radio className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.emergencyLinked}
            </span>
            <span className="text-xs font-semibold text-rose-700">
              emergency campaigns
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rose-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">General Standalone:</span>
            <span className="font-bold text-neutral-800">
              {metrics.generalDrives} drives
            </span>
          </div>
        </div>

        {/* Card 3: Total Recorded Drives */}
        <div className="flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-teal-900 uppercase">
              Total Recorded
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
              <Layers className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.total}
            </span>
            <span className="text-xs font-semibold text-neutral-500">total drives</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-teal-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Ledger Status:</span>
            <span className="font-bold text-neutral-800">Barangay relief log</span>
          </div>
        </div>

        {/* Card 4: Publication Status Pipeline */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Campaign Status
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 shadow-2xs">
              <CheckCircle2 className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50 px-2 py-1.5 text-emerald-900">
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                Live
              </span>
              <span className="text-base font-black">{metrics.published}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50 px-2 py-1.5 text-amber-900">
              <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                Draft
              </span>
              <span className="text-base font-black">{metrics.drafts}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200/70 bg-neutral-100 px-2 py-1.5 text-neutral-800">
              <span className="text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                Archive
              </span>
              <span className="text-base font-black">{metrics.archived}</span>
            </div>
          </div>
        </div>
      </div>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading || isFetching}
        loadingLabel="Loading donation drives"
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search campaign title, linked event, organizer, or location..."
        filterChoices={(rows) => [
          {
            value: "status:published",
            label: "Live / Published Only",
            matches: (r) => Boolean(r.published_at) && !r.archived_at,
          },
          {
            value: "status:draft",
            label: "Drafts Only",
            matches: (r) => !r.published_at && !r.archived_at,
          },
          {
            value: "status:archived",
            label: "Archived Only",
            matches: (r) => Boolean(r.archived_at),
          },
          {
            value: "linked:emergency",
            label: "Linked to Emergency Event",
            matches: (r) => Boolean(r.event_id),
          },
          {
            value: "linked:general",
            label: "General Drives (Standalone)",
            matches: (r) => !r.event_id,
          },
        ]}
        emptyTitle="No donation drives yet"
        emptyDescription="Publish your first donation drive or relief collection call for Barangay San Jose."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <DonationDrivePreviewDialog driveId={row.id} title={row.title} />

            <Button
              asChild
              size="sm"
              variant="warning"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
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
