"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Pencil, Plus, Waves } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  FloodEventDetailsDialog,
  FloodEventEditorDialog,
  type FloodAreaOption,
  type FloodEventRecord,
  toFloodEventPayload,
  type FloodEventFormValues,
} from "@/components/features/admin/flood-event-editor";
import { FloodHistoryInsights } from "@/components/features/admin/flood-history-insights";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDate } from "@/lib/format";

interface Page<T> {
  items: T[];
}

/** Admin flood history (FR-WX-013). Public history has a deliberately smaller DTO. */
export default function AdminFloodEventsPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({
    queryKey: ["admin", "flood-events"],
    queryFn: () =>
      api
        .get<Page<FloodEventRecord>>("/admin/flood-events")
        .then((response) => response.data.items),
  });
  const areasQuery = useQuery({
    queryKey: ["public", "areas"],
    queryFn: () =>
      api.get<FloodAreaOption[]>("/public/areas").then((response) => response.data),
  });

  const refreshEvents = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "flood-events"] });
  const createMutation = useMutation({
    mutationFn: (values: FloodEventFormValues) =>
      api.post("/admin/flood-events", toFloodEventPayload(values)),
    onSuccess: () => {
      toast.success("Flood event recorded");
      refreshEvents();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FloodEventFormValues }) =>
      api.patch(`/admin/flood-events/${id}`, toFloodEventPayload(values)),
    onSuccess: () => {
      toast.success("Flood event updated");
      refreshEvents();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/flood-events/${id}`),
    onSuccess: () => {
      toast.success("Flood event deleted");
      refreshEvents();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const columns: ResourceColumn<FloodEventRecord>[] = [
    {
      key: "name",
      header: "Flood event",
      render: (event) => (
        <div className="flex min-w-48 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-neutral-900">{event.name}</span>
            {event.is_ongoing ? <Badge tone="danger">Ongoing</Badge> : null}
            {event.emergency_event_id ? (
              <Badge tone="info" outline>
                Auto-synced
              </Badge>
            ) : null}
          </div>
          <span className="text-caption text-neutral-500">
            {event.area_names.length
              ? `Areas: ${event.area_names.join(", ")}`
              : "Affected areas not recorded"}
          </span>
        </div>
      ),
    },
    {
      key: "started_at",
      header: "Started",
      render: (event) => (
        <span className="whitespace-nowrap">{formatPhtDate(event.started_at)}</span>
      ),
    },
    {
      key: "peak_level_m",
      header: "Peak level",
      render: (event) =>
        event.peak_level_m != null ? (
          <span className="font-semibold text-neutral-900 tabular-nums">
            {event.peak_level_m} m
          </span>
        ) : (
          "Not recorded"
        ),
    },
    {
      key: "households_displaced",
      header: "Displaced",
      render: (event) =>
        event.households_displaced != null ? (
          <span className="font-semibold text-neutral-900 tabular-nums">
            {event.households_displaced.toLocaleString("en-PH")}
          </span>
        ) : (
          "Not recorded"
        ),
    },
  ];

  const events = eventsQuery.data ?? [];
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        icon={AlertTriangle}
        title="Flood History"
        description="Maintain the historical record residents use to understand flood impact in Barangay San Jose."
        meta={
          eventsQuery.data ? (
            <Badge tone="neutral">
              {events.length} recorded event{events.length === 1 ? "" : "s"}
            </Badge>
          ) : null
        }
        action={
          <>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-10 rounded-xl border-emerald-200 bg-white px-3 text-emerald-800 hover:bg-emerald-50"
            >
              <Link href={"/admin/weather-readings" as Route}>
                <Waves aria-hidden className="size-4" />
                <span className="hidden lg:inline">Weather watch</span>
                <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            </Button>
            <FloodEventEditorDialog
              areas={areasQuery.data ?? []}
              areasLoading={areasQuery.isLoading}
              areasError={areasQuery.isError}
              onRetryAreas={() => areasQuery.refetch()}
              isSubmitting={createMutation.isPending}
              onSubmit={async (values) => {
                await createMutation.mutateAsync(values);
              }}
              trigger={
                <Button
                  size="sm"
                  className="h-10 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800"
                >
                  <Plus aria-hidden className="size-4" />
                  Record event
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.48fr)_minmax(19rem,0.82fr)]">
        <ResourceTable
          columns={columns}
          data={eventsQuery.data}
          isLoading={eventsQuery.isLoading}
          isError={eventsQuery.isError}
          onRetry={() => eventsQuery.refetch()}
          emptyTitle="No flood events recorded yet"
          emptyDescription="Record a past flood event to build the community’s public disaster history."
          getRowKey={(event) => event.id}
          rowActions={(event) => (
            <>
              <FloodEventDetailsDialog event={event} />
              <FloodEventEditorDialog
                event={event}
                areas={areasQuery.data ?? []}
                areasLoading={areasQuery.isLoading}
                areasError={areasQuery.isError}
                onRetryAreas={() => areasQuery.refetch()}
                isSubmitting={updateMutation.isPending}
                onSubmit={async (values) => {
                  await updateMutation.mutateAsync({ id: event.id, values });
                }}
                trigger={
                  <Button
                    size="sm"
                    variant="warning"
                    className="h-8 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  >
                    <Pencil aria-hidden className="size-3.5" />
                    <span className="md:hidden">Edit</span>
                  </Button>
                }
              />
              {!event.emergency_event_id ? (
                <ConfirmDeleteButton
                  itemLabel={event.name}
                  onConfirm={() => deleteMutation.mutate(event.id)}
                />
              ) : null}
            </>
          )}
        />
        <FloodHistoryInsights events={events} isLoading={eventsQuery.isLoading} />
      </div>
    </div>
  );
}
