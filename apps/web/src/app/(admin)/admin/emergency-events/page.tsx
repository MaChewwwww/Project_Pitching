"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Clock,
  Flame,
  List,
  Map,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { SafetyLedgerTab } from "@/components/features/safety/safety-ledger-tab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  EmergencyEventOut,
  EmergencyWorkspaceOut,
} from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";

const EmergencyResponseMap = dynamic(
  () =>
    import("@/components/features/safety/emergency-response-map").then(
      (module) => module.EmergencyResponseMap,
    ),
  { ssr: false, loading: () => <WorkspaceLoading label="Loading response map…" /> },
);

const eventTypes = ["flood", "earthquake", "typhoon", "fire", "other"] as const;

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



const tabs = ["overview", "events", "map", "accounted-for"] as const;
type Tab = (typeof tabs)[number];

const declareSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(eventTypes),
});

const declareFields: AdminField[] = [
  {
    name: "name",
    label: "Event name",
    type: "text",
    placeholder: "Continuous Heavy Rainfall — Riverside Areas",
  },
  {
    name: "type",
    label: "Type",
    type: "select",
    options: eventTypes.map((type) => ({
      value: type,
      label: type[0].toUpperCase() + type.slice(1),
    })),
  },
];

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
  const activeEvents = React.useMemo(() => events.filter((event) => event.is_active), [events]);
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
    enabled: Boolean(selected && canSeePii && (tab === "map" || tab === "overview" || tab === "events")),
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
          members: h.members.map((m) => ({
            ...m,
            status: "unaccounted" as const,
            evac_center_id: null,
            evac_center_name: null,
          })),
        })),
        evacuation_centers: workspaceQuery.data.evacuation_centers.map((c) => ({
          ...c,
          occupancy: 0,
          is_at_capacity: false,
        })),
        walkin_records: [],
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
    mutationFn: (values: z.infer<typeof declareSchema>) =>
      api.post<EmergencyEventOut>("/admin/emergency-events", values),
    onSuccess: async ({ data }) => {
      toast.success("Emergency event declared");
      await invalidateOperations();
      router.replace(`/admin/emergency-events?event=${data.id}&tab=overview`);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<EmergencyEventOut>(`/admin/emergency-events/${id}/end`),
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
    mutationFn: async (eventsToEnd: EmergencyEventOut[]) => {
      const results = await Promise.all(
        eventsToEnd.map((e) =>
          api
            .post<EmergencyEventOut>(`/admin/emergency-events/${e.id}/end`)
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

  const setSelection = (eventId: string, nextTab: Tab = tab) => {
    const targetId = eventId || selectedId || (selected?.id ?? "");
    router.replace(`/admin/emergency-events?event=${targetId}&tab=${nextTab}`);
  };

  const columns: ResourceColumn<EmergencyEventOut>[] = [
    {
      key: "name",
      header: "Event Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className={`grid size-7 place-items-center rounded-lg ${row.type === "flood"
              ? "bg-sky-100 text-sky-700"
              : row.type === "fire"
                ? "bg-rose-100 text-rose-700"
                : row.type === "earthquake"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
          >
            {row.type === "flood" ? (
              <Waves className="size-4" />
            ) : row.type === "fire" ? (
              <Flame className="size-4" />
            ) : (
              <Siren className="size-4" />
            )}
          </span>
          <span className="font-bold text-neutral-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge outline tone="neutral" className="capitalize text-xs font-semibold">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) =>
        row.is_active ? (
          <Badge tone="danger" className="font-bold text-xs uppercase tracking-wide">
            Active
          </Badge>
        ) : (
          <Badge outline tone="neutral" className="text-xs text-neutral-500 font-medium">
            Ended
          </Badge>
        ),
    },
    {
      key: "started_at",
      header: "Declared At",
      render: (row) => (
        <span className="text-xs text-neutral-600 font-medium">
          {new Date(row.started_at).toLocaleString()}
        </span>
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
            <ResourceFormDialog
              title="Declare Emergency Event"
              fields={declareFields}
              schema={declareSchema}
              defaultValues={{ name: "", type: "flood" as const }}
              onSubmit={async (values) => {
                await declareMutation.mutateAsync(values);
              }}
              trigger={
                <Button
                  size="sm"
                  className="h-10 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] transition-all px-4 gap-2 border border-emerald-600/30 max-sm:w-full max-sm:justify-center cursor-pointer"
                >
                  <Plus aria-hidden className="size-4 stroke-[2.5]" />
                  <span>Declare Event</span>
                </Button>
              }
            />
          ) : null
        }
      />

      {eventsQuery.isLoading ? (
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
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
            <Siren className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No emergency events active</h2>
          <p className="mt-1 max-w-sm mx-auto text-sm text-neutral-500">
            Declare an emergency event to activate the live response workspace and area safety tracker.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm flex flex-col">
          {/* 1. Active Event Context Bar with GREEN EMERALD THEME */}
          {selected ? (
            <div className="relative overflow-hidden bg-gradient-to-r from-[#043d2e] via-[#064e3b] to-[#0a5c46] p-6 sm:p-7 text-white shadow-md border-b border-emerald-800/40">
              {/* Subtle background ambient blur */}
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/10 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-300/10 blur-3xl" />

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
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 text-emerald-300 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-700/60 shadow-xs">
                          <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                          ALL CLEAR / STANDBY
                        </span>
                      ) : selected.is_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm border border-rose-400/40">
                          <span className="relative flex size-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-white" />
                          </span>
                          LIVE EMERGENCY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 text-neutral-300 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-neutral-700">
                          <span className="size-2 rounded-full bg-neutral-400 shrink-0" />
                          ARCHIVED / ENDED
                        </span>
                      )}

                      {/* Dynamic Event Type Badge(s) */}
                      {isAllActiveOverview && activeEvents.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Array.from(new Set(activeEvents.map((e) => e.type))).map((type) => (
                            <span
                              key={type}
                              className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${getEventTypeBadgeClass(type)}`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : isAllActiveOverview && activeEvents.length === 0 ? (
                        <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-700 bg-emerald-900/60 text-emerald-200">
                          NORMAL STATUS
                        </span>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${getEventTypeBadgeClass(selected.type)}`}>
                          {selected.type}
                        </span>
                      )}

                      {/* Date / Time Moved to Top Badge Row */}
                      <div className="flex items-center gap-1.5 text-xs text-white font-bold leading-none ml-1">
                        <Clock className="size-3.5 text-white shrink-0" />
                        <span>
                          {isAllActiveOverview && activeEvents.length === 0
                            ? "All Systems Normal · Ready for Dispatch"
                            : `Started ${new Date(selected.started_at).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-xs">
                      {isAllActiveOverview && activeEvents.length === 0
                        ? "No Active Emergencies Ongoing"
                        : isAllActiveOverview && activeEvents.length > 0
                          ? activeEvents.map((e) => e.name).join(" | ")
                          : selected.name}
                    </h2>
                  </div>
                </div>

                {/* Right Side Actions & Searchable Dropdown */}
                <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0 pt-3 lg:pt-0 border-t border-emerald-800/40 lg:border-t-0">


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
                    onConfirmSingle={() => endMutation.mutate(selected.id)}
                    onConfirmAll={() => endAllMutation.mutate(activeEvents)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* 3. Connected Underline Tabs Header Bar */}
          <div className="border-b border-neutral-200 bg-white">
            <div
              role="tablist"
              className="grid grid-cols-2 gap-2 p-2.5 sm:p-0 sm:gap-0 sm:flex sm:overflow-x-auto"
            >
              {/* Tab 1: Overview Metrics */}
              <button
                role="tab"
                aria-selected={tab === "overview"}
                onClick={() => setSelection(selectedId, "overview")}
                className={`inline-flex h-11 sm:h-13 sm:flex-1 sm:min-w-[160px] items-center justify-center gap-2 border-b-2 px-3 sm:px-5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer rounded-lg sm:rounded-none ${
                  tab === "overview"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/80 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 sm:bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 sm:hover:bg-neutral-50"
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
                className={`inline-flex h-11 sm:h-13 sm:flex-1 sm:min-w-[160px] items-center justify-center gap-2 border-b-2 px-3 sm:px-5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer rounded-lg sm:rounded-none ${
                  tab === "events"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/80 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 sm:bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 sm:hover:bg-neutral-50"
                }`}
              >
                <Siren aria-hidden className="size-4 shrink-0" />
                <span className="truncate">Emergency Events</span>
                {events.length > 0 ? (
                  <span className="ml-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold leading-none">
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
                  className={`inline-flex h-11 sm:h-13 sm:flex-1 sm:min-w-[160px] items-center justify-center gap-2 border-b-2 px-3 sm:px-5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer rounded-lg sm:rounded-none ${
                    tab === "map"
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/80 sm:bg-emerald-50/30"
                      : "border-transparent bg-neutral-50/60 sm:bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 sm:hover:bg-neutral-50"
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
                className={`inline-flex h-11 sm:h-13 sm:flex-1 sm:min-w-[160px] items-center justify-center gap-2 border-b-2 px-3 sm:px-5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer rounded-lg sm:rounded-none ${
                  tab === "accounted-for"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/80 sm:bg-emerald-50/30"
                    : "border-transparent bg-neutral-50/60 sm:bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 sm:hover:bg-neutral-50"
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
            {tab === "overview" && selected ? (
              <Overview
                event={selected}
                activeCount={activeCount}
                workspace={effectiveWorkspaceData}
                canSeePii={canSeePii}
                loading={workspaceQuery.isLoading}
                error={workspaceQuery.isError}
                retry={() => workspaceQuery.refetch()}
              />
            ) : null}

            {/* Emergency Events Directory Tab */}
            {tab === "events" ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                      <List className="size-4 text-emerald-600" />
                      Emergency Events Ledger & History
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Directory of all registered emergency events and disaster response logs.
                    </p>
                  </div>
                  <Badge tone="info">{events.length} Registered Events</Badge>
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <ResourceTable
                    columns={columns}
                    data={events}
                    isLoading={false}
                    isError={false}
                    emptyTitle="No emergency events declared"
                    getRowKey={(row) => row.id}
                  />
                </div>
              </div>
            ) : null}

            {/* Response Map Tab */}
            {tab === "map" && canSeePii ? (
              <div className="flex flex-col gap-4">
                {workspaceQuery.isLoading ? (
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
              <SafetyLedgerTab
                event={selected}
                events={events}
                onSelectEvent={(eventId) => setSelection(eventId, "accounted-for")}
                canSeePii={canSeePii}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Overview({
  event,
  activeCount,
  workspace,
  canSeePii,
  loading,
  error,
  retry,
}: {
  event: EmergencyEventOut;
  activeCount: number;
  workspace?: EmergencyWorkspaceOut;
  canSeePii: boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const householdsCount = workspace?.households.length ?? 0;
  const safeCount = workspace?.households.filter((h) => h.all_safe).length ?? 0;
  const rescueCount = workspace?.households.filter((h) => h.needs_rescue_count > 0).length ?? 0;
  const safePct = householdsCount > 0 ? ((safeCount / householdsCount) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-6">
      {/* 4 Executive KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStat
          icon={Siren}
          label="Concurrent Active Events"
          value={activeCount}
          subtext={activeCount === 1 ? "1 active event" : `${activeCount} active events`}
          tone="rose"
        />
        <OverviewStat
          icon={Users}
          label="Households in Scope"
          value={canSeePii ? householdsCount : "Aggregate"}
          subtext="Barangay San Jose"
          tone="emerald"
        />
        <OverviewStat
          icon={CheckCircle2}
          label="Households Fully Safe"
          value={canSeePii ? safeCount : "See Ledger"}
          subtext={canSeePii ? `${safePct}% rate` : "Accounted For"}
          tone="teal"
        />
        <OverviewStat
          icon={ShieldAlert}
          label="Priority Rescue Needed"
          value={canSeePii ? rescueCount : "Restricted"}
          subtext={rescueCount > 0 ? "Requires action" : "Zero distress"}
          tone={rescueCount > 0 ? "rose" : "amber"}
        />
      </div>

      {canSeePii && loading ? (
        <WorkspaceLoading label="Loading event operational details…" />
      ) : canSeePii && error ? (
        <WorkspaceError label="Event operational metrics could not be loaded." onRetry={retry} />
      ) : null}

      {/* Operational Phase & Lifecycle Info Card */}
      <Card radius="lg" className="border-neutral-200 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Zap className="size-4 text-emerald-600" />
                Live Response Lifecycle Phase
              </h3>
              <p className="text-xs text-neutral-500">
                {event.is_active
                  ? "Operational writes and safety check-ins are active for this event."
                  : `Event concluded on ${event.ended_at ? new Date(event.ended_at).toLocaleString() : "—"}. Record retained.`}
              </p>
            </div>
            <Badge tone={event.is_active ? "danger" : "neutral"}>
              {event.is_active ? "Phase 2: Live Operational Response" : "Phase 4: Concluded Archive"}
            </Badge>
          </div>

          {/* Visual Response Timeline */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
            <TimelineStep
              step="1"
              title="Event Declared"
              desc={new Date(event.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              completed={true}
              current={false}
            />
            <TimelineStep
              step="2"
              title="Live Operations"
              desc="Safety ledger & check-ins"
              completed={true}
              current={event.is_active}
            />
            <TimelineStep
              step="3"
              title="Evacuation Active"
              desc="Center check-ins"
              completed={!event.is_active}
              current={false}
            />
            <TimelineStep
              step="4"
              title="Resolution & Reset"
              desc={event.ended_at ? "Finalized" : "Pending conclusion"}
              completed={!event.is_active}
              current={false}
            />
          </div>

          {event.type === "flood" ? (
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 border border-sky-200">
              <Waves className="size-4 shrink-0 text-sky-600" />
              <span>
                <strong>Flood History Synchronization:</strong> Ending this flood event will record its peak river gauge reading into canonical flood records.
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineStep({
  step,
  title,
  desc,
  completed,
  current,
}: {
  step: string;
  title: string;
  desc: string;
  completed: boolean;
  current: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${current
        ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-sm ring-1 ring-emerald-400/50"
        : completed
          ? "bg-neutral-50 border-neutral-200 text-neutral-700"
          : "bg-neutral-50/40 border-neutral-100 text-neutral-400"
        }`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${current
          ? "bg-emerald-600 text-white"
          : completed
            ? "bg-neutral-200 text-neutral-800"
            : "bg-neutral-100 text-neutral-400"
          }`}
      >
        {step}
      </span>
      <div className="min-w-0">
        <h4 className="text-xs font-bold truncate">{title}</h4>
        <p className="text-[10px] text-neutral-500 truncate">{desc}</p>
      </div>
    </div>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
}: {
  icon: typeof Siren;
  label: string;
  value: string | number;
  subtext: string;
  tone: "rose" | "emerald" | "teal" | "amber";
}) {
  const toneStyles = {
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  }[tone];

  return (
    <Card radius="lg" className="border-neutral-200 shadow-sm hover:shadow-md transition-all">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl border ${toneStyles}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <span className="block text-2xl font-black tracking-tight text-neutral-900">{value}</span>
          <h4 className="text-xs font-bold text-neutral-700">{label}</h4>
          <span className="text-[11px] text-neutral-400 font-medium">{subtext}</span>
        </div>
      </CardContent>
    </Card>
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
    (e) => e.name.toLowerCase().includes(query) || e.type.toLowerCase().includes(query)
  );
  const filteredEnded = endedEvents.filter(
    (e) => e.name.toLowerCase().includes(query) || e.type.toLowerCase().includes(query)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 rounded-xl border border-emerald-600/50 bg-emerald-950/80 px-3.5 text-xs font-bold text-white shadow-inner hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 flex items-center justify-between gap-3 min-w-[220px] max-w-[290px] cursor-pointer transition-all shrink-0 backdrop-blur-md"
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
                  <span className="size-2 rounded-full bg-emerald-400/60 shrink-0" />
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
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getEventDotColor(selectedEvent.type)} opacity-75`} />
                    <span className={`relative inline-flex size-2 rounded-full ${getEventDotColor(selectedEvent.type)}`} />
                  </span>
                ) : (
                  <span className="size-2 rounded-full bg-neutral-400 shrink-0" />
                )}
                <span className="truncate font-black text-white">{selectedEvent.name}</span>
                {!selectedEvent.is_active ? (
                  <span className="text-[10px] text-emerald-200/70 font-semibold shrink-0">(Ended)</span>
                ) : null}
              </>
            ) : (
              <span className="text-emerald-200/70 font-semibold">Select event archive…</span>
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 text-emerald-300 opacity-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 rounded-2xl bg-[#04281e] text-white border border-emerald-700/80 p-3 shadow-2xl z-50">
        {/* Search Bar */}
        <div className="flex items-center gap-2 rounded-xl bg-emerald-950/90 px-3 py-2 border border-emerald-800/80 mb-3 focus-within:border-emerald-400 focus-within:bg-emerald-950 transition-all">
          <Search className="size-4 text-emerald-400 shrink-0" />
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
              className="text-[10px] text-emerald-300/60 hover:text-white px-1 font-bold cursor-pointer"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="max-h-72 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {/* Active Events Section */}
          <div>
            <button
              type="button"
              onClick={() => {
                onSelect("all");
                setOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer border ${isAllActiveOverview
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-2xs"
                  : "text-emerald-400 hover:bg-emerald-900/50 border-transparent hover:border-emerald-800/40"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Active Emergency Events
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-200 border border-emerald-500/30">
                {filteredActive.length}
              </span>
            </button>

            {filteredActive.length === 0 ? (
              <div className="px-3 py-2 text-xs text-emerald-300/50 italic">No active events match search</div>
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${isSelected
                          ? "bg-emerald-600 text-white font-bold shadow-sm"
                          : "hover:bg-emerald-900/60 text-emerald-100"
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="relative flex size-2 shrink-0">
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`} />
                          <span className={`relative inline-flex size-2 rounded-full ${isSelected ? "bg-white" : dotColor}`} />
                        </span>
                        <span className="truncate">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getEventTypeBadgeClass(e.type, false)}`}>
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
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300/70 flex items-center justify-between pt-2 border-t border-emerald-900/60">
              <span>📜 History / Past Events</span>
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300/80 border border-emerald-800">
                {filteredEnded.length}
              </span>
            </div>

            {filteredEnded.length === 0 ? (
              <div className="px-3 py-2 text-xs text-emerald-300/50 italic">No past events match search</div>
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${isSelected
                          ? "bg-emerald-950 text-white font-bold shadow-sm border border-emerald-700"
                          : "hover:bg-emerald-900/40 text-emerald-200/80"
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="size-2 rounded-full bg-neutral-500 shrink-0" />
                        <span className="truncate">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] capitalize px-2 py-0.5 rounded-md border ${getEventTypeBadgeClass(e.type, false)}`}>
                          {e.type}
                        </span>
                        <span className="text-[10px] text-emerald-300/50 font-medium">Ended</span>
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
  onConfirmSingle: () => void;
  onConfirmAll: () => void;
}) {
  const isEndingAll = isAllActiveOverview && activeEvents.length > 0;
  const isSingleActive = !isAllActiveOverview && event.is_active;
  const isEnabled = (isEndingAll || isSingleActive) && canManage && !pending;

  if (!isEndingAll && !event.is_active) {
    return (
      <div
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3.5 text-xs font-bold text-white/50 backdrop-blur-md select-none cursor-default shadow-xs"
        title="This event has already concluded and is archived in read-only mode"
      >
        <span className="size-2 rounded-full bg-neutral-400/60 shrink-0" />
        <span>Event Concluded</span>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="danger"
          className="h-10 px-4 font-black text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer shrink-0 transition-all active:scale-95 border border-rose-500/40 gap-1.5"
          disabled={!isEnabled}
        >
          <AlertTriangle className="size-3.5" />
          <span>{isEndingAll ? "End All Events" : "End Event"}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-6">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-600 shrink-0 shadow-xs">
              <AlertTriangle className="size-5 stroke-[2.5]" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-black text-slate-950">
                {isEndingAll
                  ? `End All Active Emergency Events (${activeEvents.length})?`
                  : `End Emergency Event: ${event.name}?`}
              </AlertDialogTitle>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isEndingAll ? "Mass Emergency Incident Closure" : "Emergency Incident Closure"}
              </p>
            </div>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
            {isEndingAll ? (
              <>
                This will immediately conclude all <strong>{activeEvents.length} live emergency event(s)</strong> (
                {activeEvents.map((e) => e.name).join(", ")}).
                <br />
                <br />
                All open evacuation center check-ins will be automatically checked out and center occupancies reset to zero. Historical safety ledgers, audit logs, and walk-ins are safely preserved.
              </>
            ) : (
              <>
                {activeEvents.length > 1
                  ? `${activeEvents.length - 1} other active emergency event(s) remain live in Barangay San Jose. Active physical evacuation occupancy will be preserved.`
                  : "This is the final active emergency event. All open evacuation check-ins will be automatically checked out and center occupancy reset to zero."}
                <br />
                <br />
                Historical safety records, walk-ins, and safety check-ins are safely preserved.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={isEndingAll ? onConfirmAll : onConfirmSingle}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
          >
            {isEndingAll ? "Confirm & End All Events" : "Confirm & End Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <Card radius="lg" className="border-neutral-200">
      <CardContent className="animate-pulse py-12 text-center text-sm font-semibold text-neutral-500">
        <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-emerald-600" />
        {label}
      </CardContent>
    </Card>
  );
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

