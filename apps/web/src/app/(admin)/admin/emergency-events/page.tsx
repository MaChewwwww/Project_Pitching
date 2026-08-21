"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarClock,
  ChevronDown,
  CircleCheck,
  Clock,
  Eye,
  Flame,
  Layers,
  Map,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  Waves,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { MapWorkspaceSkeleton } from "@/components/common/portal-loading";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { SafetyLedgerTab } from "@/components/features/safety/safety-ledger-tab";
import { EmergencyOverviewDashboard } from "@/components/features/safety/emergency-overview-dashboard";
import { EditEventDialog } from "@/components/features/safety/edit-event-dialog";
import { EmergencyEventBackfillDialog } from "@/components/features/safety/emergency-event-backfill-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, toDisplayError } from "@/lib/api/client";
import { formatPhtDateTime } from "@/lib/format";
import type { EmergencyEventOut, EmergencyWorkspaceOut } from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { cn } from "@/lib/utils";

const EmergencyResponseMap = dynamic(
  () =>
    import("@/components/features/safety/emergency-response-map").then(
      (module) => module.EmergencyResponseMap,
    ),
  { ssr: false, loading: () => <WorkspaceLoading label="Loading response map…" /> },
);

function toLocalDatetimeString(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

function getEventTypeBadgeClass(type: string, isLightPopover = false): string {
  if (isLightPopover) {
    switch (type.toLowerCase()) {
      case "flood":
        return "bg-sky-100 text-sky-900 border-sky-300 font-bold";
      case "fire":
        return "bg-rose-100 text-rose-900 border-rose-300 font-bold";
      case "typhoon":
      case "severe_weather":
        return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      case "earthquake":
        return "bg-stone-100 text-stone-900 border-stone-300 font-bold";
      default:
        return "bg-teal-100 text-teal-900 border-teal-300 font-bold";
    }
  }

  switch (type.toLowerCase()) {
    case "flood":
      return "bg-sky-500/25 text-sky-100 border-sky-300/50 shadow-2xs";
    case "fire":
      return "bg-rose-500/25 text-rose-100 border-rose-300/50 shadow-2xs";
    case "typhoon":
    case "severe_weather":
      return "bg-amber-500/25 text-amber-100 border-amber-300/50 shadow-2xs";
    case "earthquake":
      return "bg-stone-500/25 text-stone-100 border-stone-300/50 shadow-2xs";
    default:
      return "bg-teal-500/25 text-teal-100 border-teal-300/50 shadow-2xs";
  }
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(start)) return "—";
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const tabs = ["overview", "events", "map", "accounted-for"] as const;
type Tab = (typeof tabs)[number];

export default function AdminEmergencyEventsPage() {
  const { user } = useRequireRole("admin", "bhw", "sk");
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab = tabs.includes(requestedTab as Tab)
    ? (requestedTab as Tab)
    : "overview";
  const canManageEvents = user?.role === "admin" || user?.role === "superadmin";
  const canSeePii = user?.role !== "sk";

  const eventsQuery = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });
  const selectedId = searchParams.get("event") ?? "";
  const events = React.useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const activeEvents = React.useMemo(
    () => events.filter((event) => event.is_active),
    [events],
  );
  const activeCount = activeEvents.length;

  const isSpecificEventSelected = Boolean(
    selectedId && selectedId !== "all" && selectedId !== "active",
  );
  const isAllActiveOverview = !isSpecificEventSelected;
  const selected = isSpecificEventSelected
    ? (events.find((event) => event.id === selectedId) ?? null)
    : (activeEvents[0] ?? events[0] ?? null);

  React.useEffect(() => {
    if (events.length === 0 || selectedId) return;
    const initial = activeEvents.length > 0 ? "all" : (events[0]?.id ?? "all");
    const safeTab = !canSeePii && tab === "map" ? "overview" : tab;
    router.replace(`/admin/emergency-events?event=${initial}&tab=${safeTab}`);
  }, [canSeePii, events, activeEvents, router, selectedId, tab]);

  React.useEffect(() => {
    if (!canSeePii && selected && tab === "map") {
      router.replace(`/admin/emergency-events?event=${selected.id}&tab=overview`);
    }
  }, [canSeePii, router, selected, tab]);

  const workspaceQuery = useQuery({
    queryKey: ["admin", "emergency-workspace", selected?.id],
    queryFn: () =>
      api
        .get<EmergencyWorkspaceOut>(`/admin/emergency-events/${selected!.id}/workspace`)
        .then((response) => response.data),
    // The workspace contains every household roster and map pin. Overview uses
    // its small aggregate endpoints instead; fetch this PII-heavy payload only
    // when an officer opens the response map.
    enabled: Boolean(selected && canSeePii && tab === "map"),
  });

  const effectiveWorkspaceData = React.useMemo(() => {
    if (!workspaceQuery.data) return undefined;
    if (isAllActiveOverview && activeEvents.length === 0) {
      // When viewing All Active Emergencies and there are 0 active events, reset live map to pristine/clean state
      return {
        ...workspaceQuery.data,
        is_read_only: true,
        event: {
          ...workspaceQuery.data.event,
          is_active: false,
          name: "No Active Emergency",
        },
        households: workspaceQuery.data.households.map((h) => ({
          ...h,
          all_safe: false,
          rescue_requested: false,
        })),
        unregistered_pins: [],
      };
    }
    return workspaceQuery.data;
  }, [workspaceQuery.data, isAllActiveOverview, activeEvents.length]);

  const invalidateOperations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "accounted-for"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] }),
      queryClient.invalidateQueries({ queryKey: ["portal", "safety"] }),
    ]);
  };

  const declareMutation = useMutation({
    mutationFn: (values: {
      name: string;
      type: "flood" | "earthquake" | "typhoon" | "fire" | "other";
      started_at?: string;
    }) =>
      api.post<EmergencyEventOut>("/admin/emergency-events", {
        name: values.name,
        type: values.type,
        started_at: values.started_at
          ? new Date(values.started_at).toISOString()
          : undefined,
      }),
    onSuccess: async ({ data }) => {
      toast.success("Emergency event declared successfully");
      await invalidateOperations();
      router.replace(`/admin/emergency-events?event=${data.id}&tab=overview`);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const endMutation = useMutation({
    mutationFn: ({ id, ended_at }: { id: string; ended_at?: string }) =>
      api.post<EmergencyEventOut>(`/admin/emergency-events/${id}/end`, {
        ended_at: ended_at ? new Date(ended_at).toISOString() : undefined,
      }),
    onSuccess: async ({ data }) => {
      toast.success(
        data.occupancy_reset_count > 0
          ? `Event ended; ${data.occupancy_reset_count} evacuees checked out`
          : "Event ended; physical occupancy preserved",
      );
      await invalidateOperations();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const endAllMutation = useMutation({
    mutationFn: async ({
      eventsToEnd,
      ended_at,
    }: {
      eventsToEnd: EmergencyEventOut[];
      ended_at?: string;
    }) => {
      const results = await Promise.all(
        eventsToEnd.map((e) =>
          api
            .post<EmergencyEventOut>(`/admin/emergency-events/${e.id}/end`, {
              ended_at: ended_at ? new Date(ended_at).toISOString() : undefined,
            })
            .then((r) => r.data),
        ),
      );
      return results;
    },
    onSuccess: async (results) => {
      const totalReset = results.reduce(
        (acc, r) => acc + (r.occupancy_reset_count || 0),
        0,
      );
      toast.success(
        totalReset > 0
          ? `All ${results.length} active events ended; ${totalReset} evacuees checked out`
          : `All ${results.length} active events ended successfully`,
      );
      await invalidateOperations();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const [editingEvent, setEditingEvent] = React.useState<EmergencyEventOut | null>(null);
  const [backfillingEvent, setBackfillingEvent] =
    React.useState<EmergencyEventOut | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/emergency-events/${id}`),
    onSuccess: async () => {
      toast.success("Emergency event deleted successfully");
      await invalidateOperations();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const setSelection = (eventId: string, nextTab: Tab = tab) => {
    const targetId = eventId || selectedId || (selected?.id ?? "");
    router.replace(`/admin/emergency-events?event=${targetId}&tab=${nextTab}`);
  };

  const columns: ResourceColumn<EmergencyEventOut>[] = [
    {
      key: "name",
      header: "Incident / Event",
      render: (row) => (
        <div className="flex min-w-56 items-center gap-3">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl shadow-2xs ${
              row.type === "flood"
                ? "border border-sky-200 bg-sky-100 text-sky-700"
                : row.type === "fire"
                  ? "border border-rose-200 bg-rose-100 text-rose-700"
                  : row.type === "earthquake"
                    ? "border border-amber-200 bg-amber-100 text-amber-700"
                    : row.type === "typhoon"
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "border border-emerald-200 bg-emerald-100 text-emerald-700"
            }`}
          >
            {row.type === "flood" ? (
              <Waves className="size-4.5" />
            ) : row.type === "fire" ? (
              <Flame className="size-4.5" />
            ) : row.type === "typhoon" ? (
              <Wind className="size-4.5" />
            ) : row.type === "earthquake" ? (
              <AlertTriangle className="size-4.5" />
            ) : (
              <Siren className="size-4.5" />
            )}
          </span>
          <div className="flex min-w-0 flex-col">
            <Link
              href={`/admin/emergency-events/${row.id}` as Route}
              className="truncate font-bold text-neutral-900 hover:text-emerald-700 hover:underline"
            >
              {row.name}
            </Link>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span>
                {new Date(row.started_at).toLocaleDateString("en-PH", {
                  dateStyle: "medium",
                })}
              </span>
              {row.declared_by_name && (
                <>
                  <span>·</span>
                  <span>By {row.declared_by_name}</span>
                </>
              )}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Classification",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${
            row.type === "flood"
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : row.type === "fire"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : row.type === "typhoon"
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : row.type === "earthquake"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) =>
        row.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-black tracking-wide text-rose-700 uppercase">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-600" />
            </span>
            Live Incident
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            <span className="size-1.5 shrink-0 rounded-full bg-neutral-400" />
            Concluded
          </span>
        ),
    },
    {
      key: "started_at",
      header: "Duration / Timeline",
      render: (row) => (
        <div className="flex flex-col text-xs text-neutral-700">
          <span className="font-semibold text-neutral-900">
            {formatDuration(row.started_at, row.ended_at)}
          </span>
          <span className="text-[11px] text-neutral-500">
            {new Date(row.started_at).toLocaleTimeString("en-PH", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
            {row.ended_at
              ? ` – ${new Date(row.ended_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })}`
              : " (Ongoing)"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Emergency Events"
        description="Command center for real-time incident tracking, area safety ledgers, spatial response mapping, and evacuation operations."
        action={
          canManageEvents ? (
            <DeclareEventDialog
              onSubmit={async (values) => {
                await declareMutation.mutateAsync(values);
              }}
              isPending={declareMutation.isPending}
            />
          ) : null
        }
      />

      {eventsQuery.isFetching ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <WorkspaceLoading label="Loading emergency events command center…" />
        </div>
      ) : eventsQuery.isError ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <WorkspaceError
            label="Emergency events could not be loaded."
            onRetry={() => eventsQuery.refetch()}
          />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
            <Siren className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">
            No emergency events active
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
            Declare an emergency event to activate the live response workspace and area
            safety tracker.
          </p>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {/* 1. Active Event Context Bar with GREEN EMERALD THEME */}
          {selected ? (
            <div className="relative overflow-hidden border-b border-emerald-800/40 bg-gradient-to-r from-[#043d2e] via-[#064e3b] to-[#0a5c46] p-6 text-white shadow-md sm:p-7">
              {/* Subtle background ambient blur */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-emerald-400/10 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-teal-300/10 blur-3xl"
              />

              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                {/* Left Side Metadata */}
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* High-Contrast Icon Container */}
                  <div className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white text-emerald-950 shadow-lg ring-4 ring-white/10">
                    {selected.type === "flood" ? (
                      <Waves className="size-7 text-sky-600" />
                    ) : selected.type === "fire" ? (
                      <Flame className="size-7 text-rose-600" />
                    ) : (
                      <Siren className="size-7 text-amber-600" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {/* High-Contrast Badges & Date */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      {isAllActiveOverview && activeEvents.length === 0 ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/60 bg-emerald-950/80 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase shadow-xs">
                          <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
                          ALL CLEAR / STANDBY
                        </span>
                      ) : selected.is_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-600 px-3 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-sm">
                          <span className="relative flex size-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-white" />
                          </span>
                          LIVE EMERGENCY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-neutral-300 uppercase">
                          <span className="size-2 shrink-0 rounded-full bg-neutral-400" />
                          ARCHIVED / ENDED
                        </span>
                      )}

                      {/* Dynamic Event Type Badge(s) */}
                      {isAllActiveOverview && activeEvents.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Array.from(new Set(activeEvents.map((e) => e.type))).map(
                            (type) => (
                              <span
                                key={type}
                                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${getEventTypeBadgeClass(type)}`}
                              >
                                {type}
                              </span>
                            ),
                          )}
                        </div>
                      ) : isAllActiveOverview && activeEvents.length === 0 ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-200 uppercase">
                          NORMAL STATUS
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${getEventTypeBadgeClass(selected.type)}`}
                        >
                          {selected.type}
                        </span>
                      )}

                      {/* Declared Date & Elapsed Duration */}
                      {isAllActiveOverview && activeEvents.length === 0 ? (
                        <div className="ml-1 flex items-center gap-1.5 text-xs font-medium text-white/90">
                          <Clock className="size-3.5 shrink-0 text-white/80" />
                          <span>All Systems Normal · Ready for Dispatch</span>
                        </div>
                      ) : (
                        <div className="ml-1 flex flex-wrap items-center gap-2 text-xs font-medium text-white/90 sm:gap-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 shrink-0 text-emerald-300" />
                            <span>
                              Declared:{" "}
                              <strong className="font-bold text-white">
                                {formatPhtDateTime(selected.started_at)}
                              </strong>
                            </span>
                          </div>
                          <span className="hidden text-emerald-400/50 sm:inline">·</span>
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 shrink-0 text-emerald-300" />
                            <span>
                              {selected.is_active ? "Elapsed:" : "Duration:"}{" "}
                              <strong className="font-bold text-emerald-200">
                                {formatDuration(selected.started_at, selected.ended_at)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl leading-none font-black tracking-tight text-white drop-shadow-xs">
                      {isAllActiveOverview && activeEvents.length === 0
                        ? "No Active Emergencies Ongoing"
                        : isAllActiveOverview && activeEvents.length > 0
                          ? activeEvents.map((e) => e.name).join(" | ")
                          : selected.name}
                    </h2>
                  </div>
                </div>

                {/* Right Side Actions & Searchable Dropdown */}
                <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-emerald-800/40 pt-3 lg:justify-end lg:border-t-0 lg:pt-0">
                  {/* Custom Searchable Categorized Dropdown */}
                  <EventSearchSelect
                    events={events}
                    selectedId={selectedId}
                    isAllActiveOverview={isAllActiveOverview}
                    onSelect={(id) => setSelection(id)}
                  />

                  {/* End Event Button (Always Rendered) */}
                  <EndEventDialog
                    event={selected}
                    activeEvents={activeEvents}
                    isAllActiveOverview={isAllActiveOverview}
                    pending={endMutation.isPending || endAllMutation.isPending}
                    canManage={canManageEvents}
                    onConfirmSingle={(endedAt) =>
                      endMutation.mutate({ id: selected.id, ended_at: endedAt })
                    }
                    onConfirmAll={(endedAt) =>
                      endAllMutation.mutate({
                        eventsToEnd: activeEvents,
                        ended_at: endedAt,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* 3. Connected Underline Tabs Header Bar */}
          <div className="border-b border-neutral-200 bg-white">
            <div
              role="tablist"
              className="grid grid-cols-2 gap-2 p-2.5 sm:flex sm:gap-0 sm:overflow-x-auto sm:p-0"
            >
              {/* Tab 1: Overview Metrics */}
              <button
                role="tab"
                aria-selected={tab === "overview"}
                onClick={() => setSelection(selectedId, "overview")}
                className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-b-2 px-3 text-xs font-extrabold transition-all sm:h-13 sm:min-w-[160px] sm:flex-1 sm:rounded-none sm:px-5 sm:text-sm ${
                  tab === "overview"
                    ? "border-emerald-600 bg-emerald-50/80 text-emerald-700 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:bg-transparent sm:hover:bg-neutral-50"
                }`}
              >
                <Activity aria-hidden className="size-4 shrink-0" />
                <span className="truncate">Overview Metrics</span>
              </button>

              {/* Tab 2: Emergency Events */}
              <button
                role="tab"
                aria-selected={tab === "events"}
                onClick={() => setSelection(selectedId, "events")}
                className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-b-2 px-3 text-xs font-extrabold transition-all sm:h-13 sm:min-w-[160px] sm:flex-1 sm:rounded-none sm:px-5 sm:text-sm ${
                  tab === "events"
                    ? "border-emerald-600 bg-emerald-50/80 text-emerald-700 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:bg-transparent sm:hover:bg-neutral-50"
                }`}
              >
                <Siren aria-hidden className="size-4 shrink-0" />
                <span className="truncate">Emergency Events</span>
                {events.length > 0 ? (
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs leading-none font-bold text-emerald-800">
                    {events.length}
                  </span>
                ) : null}
              </button>

              {/* Tab 3: Response Map */}
              {canSeePii ? (
                <button
                  role="tab"
                  aria-selected={tab === "map"}
                  onClick={() => setSelection(selectedId, "map")}
                  className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-b-2 px-3 text-xs font-extrabold transition-all sm:h-13 sm:min-w-[160px] sm:flex-1 sm:rounded-none sm:px-5 sm:text-sm ${
                    tab === "map"
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-700 sm:bg-emerald-50/30"
                      : "border-transparent bg-neutral-50/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:bg-transparent sm:hover:bg-neutral-50"
                  }`}
                >
                  <Map aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">Response Map</span>
                </button>
              ) : null}

              {/* Tab 4: Safety Ledger */}
              <button
                role="tab"
                aria-selected={tab === "accounted-for"}
                onClick={() => setSelection(selectedId, "accounted-for")}
                className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-b-2 px-3 text-xs font-extrabold transition-all sm:h-13 sm:min-w-[160px] sm:flex-1 sm:rounded-none sm:px-5 sm:text-sm ${
                  tab === "accounted-for"
                    ? "border-emerald-600 bg-emerald-50/80 text-emerald-700 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:bg-transparent sm:hover:bg-neutral-50"
                } ${!canSeePii ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <CircleCheck aria-hidden className="size-4 shrink-0" />
                <span className="truncate">Safety Ledger</span>
              </button>
            </div>
          </div>

          {/* 4. Tab Content Panel Container */}
          <div className="bg-slate-50/50 p-5 sm:p-7">
            {/* Overview Metrics Tab */}
            {tab === "overview" ? (
              <EmergencyOverviewDashboard
                event={selected}
                events={events}
                activeCount={activeCount}
                isAllActiveOverview={isAllActiveOverview}
                workspace={effectiveWorkspaceData}
                canSeePii={canSeePii}
                loading={false}
                error={false}
                onRetry={() => workspaceQuery.refetch()}
                onNavigateTab={(targetTab) => {
                  setSelection(selectedId, targetTab);
                }}
              />
            ) : null}

            {/* Emergency Events Directory Tab */}
            {tab === "events" ? (
              <div className="flex flex-col gap-6">
                {/* 1. High-Impact Summary KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: Active Emergencies */}
                  <div className="flex flex-col justify-between rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/30 to-rose-50/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                        Live Emergencies
                      </span>
                      <div className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-700">
                        <Radio className="size-4.5 animate-pulse" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-3xl font-black tracking-tight text-slate-950">
                        {events.filter((e) => e.is_active).length}
                      </span>
                      <p className="mt-0.5 text-[11px] font-semibold text-rose-700/90">
                        {events.filter((e) => e.is_active).length > 0
                          ? "Active response workspaces ongoing"
                          : "All systems normal / standby"}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Concluded Archives */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                        Concluded Archives
                      </span>
                      <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
                        <Clock className="size-4.5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-3xl font-black tracking-tight text-slate-950">
                        {events.filter((e) => !e.is_active).length}
                      </span>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Past disaster response logs retained
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Total Recorded */}
                  <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/50 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
                        Total Incidents Logged
                      </span>
                      <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                        <Layers className="size-4.5 text-emerald-700" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-3xl font-black tracking-tight text-slate-950">
                        {events.length}
                      </span>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                        Complete barangay incident ledger
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Hazard Distribution */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
                    <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Hazard Classification
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between rounded-lg border border-sky-200/60 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900">
                        <span className="flex items-center gap-1.5">
                          <Waves className="size-3 text-sky-600" /> Flood
                        </span>
                        <span className="font-bold">
                          {events.filter((e) => e.type === "flood").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-teal-200/60 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                        <span className="flex items-center gap-1.5">
                          <Wind className="size-3 text-teal-600" /> Typhoon
                        </span>
                        <span className="font-bold">
                          {
                            events.filter(
                              (e) =>
                                e.type === "typhoon" ||
                                (e.type as string) === "severe_weather",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <Flame className="size-3 text-rose-600" /> Fire
                        </span>
                        <span className="font-bold">
                          {events.filter((e) => e.type === "fire").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3 text-amber-600" /> Quake /
                          Other
                        </span>
                        <span className="font-bold">
                          {
                            events.filter(
                              (e) => e.type === "earthquake" || e.type === "other",
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Overhauled ResourceTable with View, Edit, Backfill, and Delete Actions */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <ResourceTable
                    columns={columns}
                    data={events}
                    isLoading={eventsQuery.isLoading || eventsQuery.isFetching}
                    loadingLabel="Loading emergency events"
                    isError={eventsQuery.isError}
                    onRetry={() => eventsQuery.refetch()}
                    searchPlaceholder="Search event name, hazard classification, or date..."
                    toolbarAction={
                      canManageEvents ? (
                        <DeclareEventDialog
                          onSubmit={async (values) => {
                            await declareMutation.mutateAsync(values);
                          }}
                          isPending={declareMutation.isPending}
                        />
                      ) : null
                    }
                    filterAllLabel="All Incident Types"
                    filterChoices={(rows) => {
                      const types = Array.from(new Set(rows.map((r) => r.type)));
                      return [
                        {
                          value: "status:active",
                          label: "Active Incidents Only",
                          matches: (r) => r.is_active,
                        },
                        {
                          value: "status:ended",
                          label: "Concluded Archives Only",
                          matches: (r) => !r.is_active,
                        },
                        ...types.map((t) => ({
                          value: `type:${t}`,
                          label: `${t.charAt(0).toUpperCase() + t.slice(1)} Hazards`,
                          matches: (r: EmergencyEventOut) => r.type === t,
                        })),
                      ];
                    }}
                    emptyTitle="No emergency events registered"
                    emptyDescription="Declare a new emergency event or backfill historical records to populate this directory."
                    getRowKey={(row) => row.id}
                    rowActions={(row) => (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {/* View Button -> Navigates to /admin/emergency-events/[id] */}
                        <Button
                          asChild
                          size="sm"
                          variant="success"
                          className="h-8 cursor-pointer gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
                          title="View complete event records and audit log"
                          aria-label="View complete event records and audit log"
                        >
                          <Link href={`/admin/emergency-events/${row.id}` as Route}>
                            <Eye aria-hidden className="size-3.5 shrink-0" />
                            <span className="md:hidden">View</span>
                          </Link>
                        </Button>

                        {/* Backfill Button -> Opens Backfill & Blackout Recovery Dialog */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBackfillingEvent(row)}
                          className="h-8 cursor-pointer gap-1.5 rounded-lg border border-teal-300/80 bg-teal-50 px-2.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 hover:text-teal-800"
                          title="Backfill offline field logs & paper manifests"
                          aria-label="Backfill offline field logs & paper manifests"
                        >
                          <CalendarClock aria-hidden className="size-3.5 shrink-0" />
                          <span className="md:hidden">Backfill</span>
                        </Button>

                        {/* Edit Button -> Opens Edit Dialog */}
                        {canManageEvents ? (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => setEditingEvent(row)}
                            className="h-8 cursor-pointer gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
                            title="Edit event metadata and duration"
                            aria-label="Edit event metadata and duration"
                          >
                            <Pencil aria-hidden className="size-3.5 shrink-0" />
                            <span className="md:hidden">Edit</span>
                          </Button>
                        ) : null}

                        {/* Delete Button -> ConfirmDeleteButton */}
                        {canManageEvents ? (
                          <ConfirmDeleteButton
                            itemLabel={row.name}
                            actionLabel="Delete"
                            confirmLabel="Delete Event"
                            iconOnly
                            onConfirm={() => deleteMutation.mutate(row.id)}
                          />
                        ) : null}
                      </div>
                    )}
                  />
                </div>
              </div>
            ) : null}

            {/* Response Map Tab */}
            {tab === "map" && canSeePii ? (
              <div className="flex flex-col gap-4">
                {workspaceQuery.isFetching ? (
                  <WorkspaceLoading label="Loading spatial response map and household locations…" />
                ) : workspaceQuery.isError ? (
                  <WorkspaceError
                    label="The response map could not be loaded."
                    onRetry={() => workspaceQuery.refetch()}
                  />
                ) : effectiveWorkspaceData ? (
                  <EmergencyResponseMap data={effectiveWorkspaceData} />
                ) : null}
              </div>
            ) : null}

            {/* Safety Ledger Tab */}
            {tab === "accounted-for" ? (
              <SafetyLedgerTab event={selected} canSeePii={canSeePii} />
            ) : null}
          </div>
        </div>
      )}

      {/* Global Modals for Editing and Backfilling */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={Boolean(editingEvent)}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          onUpdated={() => {
            invalidateOperations();
          }}
        />
      )}

      {backfillingEvent && (
        <EmergencyEventBackfillDialog
          event={backfillingEvent}
          open={Boolean(backfillingEvent)}
          onOpenChange={(open) => {
            if (!open) setBackfillingEvent(null);
          }}
          onSuccess={() => {
            invalidateOperations();
          }}
        />
      )}
    </div>
  );
}

function getEventDotColor(type: string): string {
  switch (type.toLowerCase()) {
    case "flood":
      return "bg-sky-400";
    case "fire":
      return "bg-rose-500";
    case "typhoon":
    case "severe_weather":
      return "bg-amber-400";
    case "earthquake":
      return "bg-stone-300";
    default:
      return "bg-white";
  }
}

function EventSearchSelect({
  events,
  selectedId,
  isAllActiveOverview,
  onSelect,
}: {
  events: EmergencyEventOut[];
  selectedId: string;
  isAllActiveOverview: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedEvent = events.find((e) => e.id === selectedId);
  const activeEvents = events.filter((e) => e.is_active);
  const endedEvents = events.filter((e) => !e.is_active);

  const query = search.trim().toLowerCase();
  const filteredActive = activeEvents.filter(
    (e) => e.name.toLowerCase().includes(query) || e.type.toLowerCase().includes(query),
  );
  const filteredEnded = endedEvents.filter(
    (e) => e.name.toLowerCase().includes(query) || e.type.toLowerCase().includes(query),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 max-w-[290px] min-w-[220px] shrink-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-600/50 bg-emerald-950/80 px-3.5 text-xs font-bold text-white shadow-inner backdrop-blur-md transition-all hover:bg-emerald-900 focus:ring-2 focus:ring-emerald-400/50 focus:outline-none"
        >
          <div className="flex items-center gap-2 truncate">
            {isAllActiveOverview ? (
              <>
                {activeEvents.length > 0 ? (
                  <span className="relative flex size-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                  </span>
                ) : (
                  <span className="size-2 shrink-0 rounded-full bg-emerald-400/60" />
                )}
                <span className="truncate font-black text-white">
                  {activeEvents.length > 0
                    ? `Current Active Emergencies (${activeEvents.length})`
                    : "Current Active Emergencies (0)"}
                </span>
              </>
            ) : selectedEvent ? (
              <>
                {selectedEvent.is_active ? (
                  <span className="relative flex size-2 shrink-0">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getEventDotColor(selectedEvent.type)} opacity-75`}
                    />
                    <span
                      className={`relative inline-flex size-2 rounded-full ${getEventDotColor(selectedEvent.type)}`}
                    />
                  </span>
                ) : (
                  <span className="size-2 shrink-0 rounded-full bg-neutral-400" />
                )}
                <span className="truncate font-black text-white">
                  {selectedEvent.name}
                </span>
                {!selectedEvent.is_active ? (
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-200/70">
                    (Ended)
                  </span>
                ) : null}
              </>
            ) : (
              <span className="font-semibold text-emerald-200/70">
                Select event archive…
              </span>
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 text-emerald-300 opacity-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-[1500] w-80 rounded-2xl border border-emerald-700/80 bg-[#04281e] p-3 text-white shadow-2xl sm:w-96"
      >
        {/* Search Bar */}
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-800/80 bg-emerald-950/90 px-3 py-2 transition-all focus-within:border-emerald-400 focus-within:bg-emerald-950">
          <Search className="size-4 shrink-0 text-emerald-400" />
          <input
            type="text"
            placeholder="Search active or past events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-emerald-300/50 focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="cursor-pointer px-1 text-[10px] font-bold text-emerald-300/60 hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="custom-scrollbar-dark max-h-72 space-y-3 overflow-y-auto pr-1.5">
          {/* Active Events Section */}
          <div>
            <button
              type="button"
              onClick={() => {
                onSelect("all");
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-2.5 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all ${
                isAllActiveOverview
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-2xs"
                  : "border-transparent text-emerald-400 hover:border-emerald-800/40 hover:bg-emerald-900/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Active Emergency Events
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-200">
                {filteredActive.length}
              </span>
            </button>

            {filteredActive.length === 0 ? (
              <div className="px-3 py-2 text-xs text-emerald-300/50 italic">
                No active events match search
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                {filteredActive.map((e) => {
                  const isSelected = !isAllActiveOverview && e.id === selectedId;
                  const dotColor = getEventDotColor(e.type);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSelect(e.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-600 font-bold text-white shadow-sm"
                          : "text-emerald-100 hover:bg-emerald-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="relative flex size-2 shrink-0">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`}
                          />
                          <span
                            className={`relative inline-flex size-2 rounded-full ${isSelected ? "bg-white" : dotColor}`}
                          />
                        </span>
                        <span className="truncate">{e.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getEventTypeBadgeClass(e.type, false)}`}
                        >
                          {e.type}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past / Ended Events Section */}
          <div>
            <div className="flex items-center justify-between border-t border-emerald-900/60 px-2 py-1 pt-2 text-[10px] font-black tracking-wider text-emerald-300/70 uppercase">
              <span>📜 History / Past Events</span>
              <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300/80">
                {filteredEnded.length}
              </span>
            </div>

            {filteredEnded.length === 0 ? (
              <div className="px-3 py-2 text-xs text-emerald-300/50 italic">
                No past events match search
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                {filteredEnded.map((e) => {
                  const isSelected = !isAllActiveOverview && e.id === selectedId;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSelect(e.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                        isSelected
                          ? "border border-emerald-700 bg-emerald-950 font-bold text-white shadow-sm"
                          : "text-emerald-200/80 hover:bg-emerald-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="size-2 shrink-0 rounded-full bg-neutral-500" />
                        <span className="truncate">{e.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] capitalize ${getEventTypeBadgeClass(e.type, false)}`}
                        >
                          {e.type}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-300/50">
                          Ended
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Declare Emergency Event Dialog with Backfill Datetime                      */
/* -------------------------------------------------------------------------- */

function DeclareEventDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (values: {
    name: string;
    type: "flood" | "earthquake" | "typhoon" | "fire" | "other";
    started_at: string;
  }) => Promise<void>;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<
    "flood" | "earthquake" | "typhoon" | "fire" | "other"
  >("flood");
  const [startedAt, setStartedAt] = React.useState(() => toLocalDatetimeString());
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartedAt(toLocalDatetimeString());
      setName("");
      setType("flood");
      setErrors({});
    }
    setOpen(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Event name is required" });
      return;
    }
    await onSubmit({ name: name.trim(), type, started_at: startedAt });
    setOpen(false);
  };

  const types = [
    {
      value: "flood" as const,
      label: "Flood",
      icon: Waves,
      color: "text-sky-600 bg-sky-50 border-sky-300",
    },
    {
      value: "typhoon" as const,
      label: "Typhoon",
      icon: Wind,
      color: "text-teal-600 bg-teal-50 border-teal-300",
    },
    {
      value: "earthquake" as const,
      label: "Earthquake",
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50 border-amber-300",
    },
    {
      value: "fire" as const,
      label: "Fire",
      icon: Flame,
      color: "text-rose-600 bg-rose-50 border-rose-300",
    },
    {
      value: "other" as const,
      label: "Other Hazard",
      icon: Siren,
      color: "text-emerald-600 bg-emerald-50 border-emerald-300",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
        >
          <Plus aria-hidden className="size-4 stroke-[2.5]" />
          <span>Declare Event</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-800 shadow-xs">
                <Siren className="size-6 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black text-slate-950">
                  Declare Emergency Event
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs font-medium text-slate-500">
                  Activate live response operations, spatial tracking, and area safety
                  ledgers.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Event Name */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>
                  Event Name <span className="text-rose-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({});
                }}
                placeholder="e.g. Typhoon Carina — Severe Flooding & Evacuation"
                className={cn(
                  "w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:ring-2 focus:outline-none sm:text-sm",
                  errors.name
                    ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20",
                )}
              />
              {errors.name && (
                <span className="text-[11px] font-bold text-rose-600">{errors.name}</span>
              )}
            </div>

            {/* Incident Type Grid Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Incident / Hazard Classification
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {types.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.value;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition-all",
                        isSelected
                          ? cn(
                              t.color,
                              "border-current shadow-xs ring-2 ring-emerald-600/30",
                            )
                          : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-slate-100",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Declared Start Date & Time with Backfill support */}
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                  Incident Start Date & Time
                </label>
                <button
                  type="button"
                  onClick={() => setStartedAt(toLocalDatetimeString())}
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <RefreshCw className="size-3" />
                  Set to Now
                </button>
              </div>

              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />

              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
                <Clock className="mt-0.5 size-3 shrink-0 text-slate-400" />
                <span>
                  Defaults to current time. You can backdate this timestamp if documenting
                  an incident retrospectively after a blackout or delayed report.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
            >
              <Siren className="size-3.5" />
              <span>{isPending ? "Declaring…" : "Declare & Activate Event"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Redesigned End Emergency Event Dialog with Concluded Datetime Picker       */
/* -------------------------------------------------------------------------- */

function EndEventDialog({
  event,
  activeEvents,
  isAllActiveOverview,
  pending,
  canManage = true,
  onConfirmSingle,
  onConfirmAll,
}: {
  event: EmergencyEventOut;
  activeEvents: EmergencyEventOut[];
  isAllActiveOverview: boolean;
  pending: boolean;
  canManage?: boolean;
  onConfirmSingle: (endedAt: string) => void;
  onConfirmAll: (endedAt: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [endedAt, setEndedAt] = React.useState(() => toLocalDatetimeString());
  const isEndingAll = isAllActiveOverview && activeEvents.length > 0;
  const isSingleActive = !isAllActiveOverview && event.is_active;
  const isEnabled = (isEndingAll || isSingleActive) && canManage && !pending;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEndedAt(toLocalDatetimeString());
    }
    setOpen(isOpen);
  };

  const handleConfirm = () => {
    if (isEndingAll) {
      onConfirmAll(endedAt);
    } else {
      onConfirmSingle(endedAt);
    }
    setOpen(false);
  };

  if (!isEndingAll && !event.is_active) {
    return (
      <div
        className="inline-flex h-10 cursor-default items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3.5 text-xs font-bold text-white/50 shadow-xs backdrop-blur-md select-none"
        title="This event has already concluded and is archived in read-only mode"
      >
        <span className="size-2 shrink-0 rounded-full bg-neutral-400/60" />
        <span>Event Concluded</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="danger"
          className="h-10 shrink-0 cursor-pointer gap-1.5 border border-rose-500/40 bg-rose-600 px-4 text-xs font-black text-white shadow-md transition-all hover:bg-rose-700 active:scale-95"
          disabled={!isEnabled}
        >
          <AlertTriangle className="size-3.5" />
          <span>{isEndingAll ? "End All Events" : "End Event"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:w-full">
        <div className="flex flex-col gap-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-rose-200 bg-rose-100 text-rose-700 shadow-xs">
                <AlertTriangle className="size-6 stroke-[2.5] text-rose-600" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black text-slate-950">
                  {isEndingAll
                    ? `End All Active Emergency Events (${activeEvents.length})`
                    : "End Active Emergency Event"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs font-medium text-slate-500">
                  {isEndingAll
                    ? "Mass Emergency Incident Closure"
                    : "Emergency Incident Closure"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Event Name Tag */}
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-2xs">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-bold text-slate-900">
              <Siren className="size-4 shrink-0 text-rose-600" />
              <span className="truncate">
                {isEndingAll
                  ? `All Active Events: ${activeEvents.map((e) => e.name).join(", ")}`
                  : event.name}
              </span>
            </div>
            <Badge tone="danger" className="shrink-0">
              Active Incident
            </Badge>
          </div>

          {/* Concluded Date & Time with Backfill support */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Calendar className="size-3.5 shrink-0 text-rose-600" />
                Incident Concluded Date & Time
              </label>
              <button
                type="button"
                onClick={() => setEndedAt(toLocalDatetimeString())}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline"
              >
                <RefreshCw className="size-3" />
                Set to Now
              </button>
            </div>

            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
            />

            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
              <Clock className="mt-0.5 size-3 shrink-0 text-slate-400" />
              <span>
                Defaults to current time. You can backdate this timestamp if officially
                concluding an event retrospectively after power/connectivity restoration.
              </span>
            </p>
          </div>

          {/* Operational Impact Notice Box */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/50 p-3.5 text-xs text-amber-950">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-900 uppercase">
              <ShieldAlert className="size-3.5 shrink-0 text-amber-700" />
              Operational Impact
            </span>
            <p className="text-xs leading-relaxed text-slate-700">
              {isEndingAll ? (
                <>
                  Concludes all <strong>{activeEvents.length} live incident(s)</strong>.
                  Open evacuation center check-ins will be automatically checked out and
                  center occupancy reset to zero.
                </>
              ) : activeEvents.length > 1 ? (
                <>
                  {activeEvents.length - 1} other active emergency event(s) remain open in
                  Barangay San Jose. Evacuation center occupancies will be maintained.
                </>
              ) : (
                <>
                  This is the final active emergency event. Open evacuation center
                  check-ins will be automatically checked out and center occupancy reset
                  to zero.
                </>
              )}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Historical safety records, walk-ins, and safety ledgers remain permanently
              preserved in archives.
            </p>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={handleConfirm}
              className="gap-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-md hover:bg-rose-700"
            >
              <AlertTriangle className="size-3.5" />
              <span>
                {pending
                  ? "Ending Event…"
                  : isEndingAll
                    ? "Confirm & End All Events"
                    : "Confirm & End Event"}
              </span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceLoading({ label }: { label: string }) {
  return <MapWorkspaceSkeleton label={label} />;
}

function WorkspaceError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Card radius="lg" className="border-neutral-200">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="size-8 text-rose-500" />
        <p className="text-sm font-semibold text-neutral-700">{label}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry Connection
        </Button>
      </CardContent>
    </Card>
  );
}
