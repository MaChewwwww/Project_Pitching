"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Radio,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

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

  const metrics = React.useMemo(() => {
    const list = data ?? [];
    const total = list.length;
    const active = list.filter((a) => a.is_active).length;
    const alerts = list.filter((a) => a.kind === "alert").length;
    const announcements = list.filter((a) => a.kind === "announcement").length;
    const published = list.filter((a) => Boolean(a.published_at)).length;
    const drafts = list.filter((a) => !a.published_at).length;
    const barangayWide = list.filter((a) => a.area_names.length === 0).length;
    const areaSpecific = list.filter((a) => a.area_names.length > 0).length;

    return {
      total,
      active,
      alerts,
      announcements,
      published,
      drafts,
      barangayWide,
      areaSpecific,
    };
  }, [data]);

  const columns: ResourceColumn<Announcement>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-neutral-900 line-clamp-1">{row.title}</span>
          {row.issued_by_name ? (
            <span className="text-[11px] text-neutral-500 font-medium">
              By {row.issued_by_name}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            row.kind === "alert"
              ? "bg-rose-100 text-rose-800 border border-rose-200"
              : "bg-emerald-100 text-emerald-800 border border-emerald-200",
          )}
        >
          {row.kind}
        </span>
      ),
    },
    {
      key: "type",
      header: "Category",
      render: (row) => (
        <span className="capitalize text-xs font-semibold text-neutral-700">
          {row.type}
        </span>
      ),
    },
    {
      key: "published_at",
      header: "Status / Published",
      render: (row) => {
        if (!row.published_at) {
          return (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
              Draft
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-neutral-800">
              {formatPhtDateTime(row.published_at)}
            </span>
            {row.is_active ? (
              <span className="text-[10px] font-bold text-emerald-700 uppercase">
                Active Broadcast
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "area_names",
      header: "Scope",
      render: (row) => (
        <span className="text-xs font-medium text-neutral-600 line-clamp-1 max-w-[14rem]">
          {row.area_names.length > 0 ? row.area_names.join(", ") : "Barangay-wide"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Alerts & Advisories"
        description="Create and manage alerts, advisories, and public announcements for Barangay San Jose."
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

      {/* Summary KPI Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Live Broadcasts */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/30 to-amber-50/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Active Broadcasts
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-700 shadow-2xs">
              <Radio
                className={cn(
                  "size-4.5 stroke-[2.2]",
                  metrics.active > 0 && "animate-pulse",
                )}
              />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.active}
            </span>
            <span className="text-xs font-semibold text-rose-700">active alerts</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rose-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Channel Status:</span>
            <span className="font-bold text-rose-800">
              {metrics.active > 0 ? "Public Alerting Live" : "Standby"}
            </span>
          </div>
        </div>

        {/* Card 2: Emergency Alerts vs Notices */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Alerts & Advisories
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
              <AlertTriangle className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-amber-800">
                {metrics.alerts}
              </span>
              <span className="text-xs font-bold text-amber-700">Alerts</span>
            </div>
            <div className="flex items-baseline gap-1 border-l border-amber-200/80 pl-3">
              <span className="text-2xl font-black tracking-tight text-neutral-800">
                {metrics.announcements}
              </span>
              <span className="text-xs font-bold text-neutral-600">Notices</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-amber-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Classification:</span>
            <span className="font-bold text-amber-900">Disaster vs Community</span>
          </div>
        </div>

        {/* Card 3: Total Recorded */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Total Articles
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <Megaphone className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.total}
            </span>
            <span className="text-xs font-semibold text-neutral-500">recorded</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Published Live:</span>
            <span className="font-bold text-emerald-800">
              {metrics.published} published
            </span>
          </div>
        </div>

        {/* Card 4: Geographic Scope */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Geographic Scope
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 shadow-2xs">
              <MapPin className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200/60 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900">
              <span>Barangay-wide</span>
              <span className="font-bold">{metrics.barangayWide}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-teal-200/60 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900">
              <span>Area-Specific</span>
              <span className="font-bold">{metrics.areaSpecific}</span>
            </div>
          </div>
        </div>
      </div>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search article title, category, type, or area..."
        filterChoices={(rows) => [
          {
            value: "status:active",
            label: "Active Broadcasts Only",
            matches: (r) => r.is_active,
          },
          {
            value: "kind:alert",
            label: "Emergency Alerts",
            matches: (r) => r.kind === "alert",
          },
          {
            value: "kind:announcement",
            label: "Community Announcements",
            matches: (r) => r.kind === "announcement",
          },
          {
            value: "scope:barangay",
            label: "Barangay-wide Only",
            matches: (r) => r.area_names.length === 0,
          },
          {
            value: "scope:area",
            label: "Area-Specific Only",
            matches: (r) => r.area_names.length > 0,
          },
          {
            value: "status:draft",
            label: "Drafts Only",
            matches: (r) => !r.published_at,
          },
        ]}
        emptyTitle="No announcements yet"
        emptyDescription="Create your first alert advisory or public announcement to populate this bulletin."
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
