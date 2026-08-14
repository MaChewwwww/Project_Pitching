"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleCheck,
  Clock,
  Flame,
  List,
  Map,
  Plus,
  RefreshCw,
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
import { AccountedForPanel } from "@/components/features/safety/accounted-for-panel";
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
import { api, toDisplayError } from "@/lib/api/client";
import type {
  AccountedForOut,
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
  const selectedId = searchParams.get("event");
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
  const events = React.useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const activeCount = events.filter((event) => event.is_active).length;

  React.useEffect(() => {
    if (events.length === 0 || selected) return;
    const initial = events.find((event) => event.is_active) ?? events[0];
    const safeTab = !canSeePii && tab === "map" ? "overview" : tab;
    router.replace(`/admin/emergency-events?event=${initial.id}&tab=${safeTab}`);
  }, [canSeePii, events, router, selected, tab]);

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
  const accountedQuery = useQuery({
    queryKey: ["admin", "accounted-for", selected?.id],
    queryFn: () =>
      api
        .get<AccountedForOut>("/admin/accounted-for", {
          params: { event_id: selected!.id },
        })
        .then((response) => response.data),
    enabled: Boolean(selected && tab === "accounted-for"),
    refetchInterval: selected?.is_active ? 15_000 : false,
  });

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

  const setSelection = (eventId: string, nextTab: Tab = tab) => {
    const targetId = eventId || (selected?.id ?? "");
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
            <div className="relative overflow-hidden bg-gradient-to-r from-[#064e3b] via-[#043e2e] to-[#0d5c46] p-5 sm:p-6 text-white shadow-inner border-b border-emerald-800/40">
              {/* Subtle background ambient blur */}
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-teal-400/10 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Left Side Metadata */}
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-emerald-300 border border-white/20 shadow-md backdrop-blur-md">
                    {selected.type === "flood" ? (
                      <Waves className="size-6" />
                    ) : selected.type === "fire" ? (
                      <Flame className="size-6" />
                    ) : (
                      <Siren className="size-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${selected.is_active
                            ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                            : "bg-white/10 text-emerald-100/70 border-white/15"
                          }`}
                      >
                        {selected.is_active ? (
                          <>
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                            LIVE EMERGENCY
                          </>
                        ) : (
                          "ARCHIVED"
                        )}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold capitalize text-emerald-100 border border-white/15">
                        {selected.type}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        {selected.name}
                      </h2>
                      <span className="text-xs text-emerald-200/50 font-medium hidden sm:inline">•</span>
                      <span className="text-xs text-emerald-100/80 font-medium hidden sm:flex items-center gap-1">
                        <Clock className="size-3.5 text-emerald-300/70" />
                        Started {new Date(selected.started_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Actions & Concurrent Event Switcher */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end shrink-0">
                  {/* Active Events Switcher Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
                      ACTIVE ({events.filter((e) => e.is_active).length}):
                    </span>
                    {events
                      .filter((e) => e.is_active)
                      .map((e) => {
                        const isSelected = e.id === selected?.id;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setSelection(e.id)}
                            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer border ${isSelected
                                ? "bg-emerald-500 text-neutral-950 border-emerald-300/40 shadow-md shadow-emerald-950/40 scale-105"
                                : "bg-white/10 text-white border-white/20 hover:bg-white/20 shadow-2xs"
                              }`}
                          >
                            <span
                              className={`size-2 rounded-full ${isSelected ? "bg-neutral-950 animate-ping" : "bg-emerald-400"
                                }`}
                            />
                            <span className="truncate max-w-[160px]">{e.name}</span>
                          </button>
                        );
                      })}
                  </div>

                  {/* History Select Dropdown */}
                  {events.filter((e) => !e.is_active).length > 0 ? (
                    <select
                      value={selected && !selected.is_active ? selected.id : ""}
                      onChange={(e) => e.target.value && setSelection(e.target.value)}
                      className="h-9 rounded-xl border border-emerald-700/60 bg-emerald-950/60 px-3 text-xs font-semibold text-emerald-100 shadow-2xs focus:border-emerald-400 focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-emerald-900 text-white">History Archive…</option>
                      {events
                        .filter((e) => !e.is_active)
                        .map((e) => (
                          <option key={e.id} value={e.id} className="bg-emerald-900 text-white">
                            ⚪ {e.name} (Ended)
                          </option>
                        ))}
                    </select>
                  ) : null}

                  {/* End Event Button */}
                  {selected?.is_active && canManageEvents ? (
                    <EndEventDialog
                      event={selected}
                      activeCount={activeCount}
                      pending={endMutation.isPending}
                      onConfirm={() => endMutation.mutate(selected.id)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* 3. Connected Underline Tabs Header Bar */}
          <div className="border-b border-neutral-200 bg-white">
            <div role="tablist" className="flex overflow-x-auto px-3">
              {/* Tab 1: Overview Metrics */}
              <button
                role="tab"
                aria-selected={tab === "overview"}
                onClick={() => setSelection(selected?.id ?? "", "overview")}
                className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all ${tab === "overview"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
              >
                <Activity aria-hidden className="size-4 shrink-0" />
                Overview Metrics
              </button>

              {/* Tab 2: Emergency Events */}
              <button
                role="tab"
                aria-selected={tab === "events"}
                onClick={() => setSelection(selected?.id ?? "", "events")}
                className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all ${tab === "events"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
              >
                <Siren aria-hidden className="size-4 shrink-0" />
                Emergency Events
                {events.length > 0 ? (
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] leading-none font-black text-emerald-800">
                    {events.length}
                  </span>
                ) : null}
              </button>

              {/* Tab 3: Response Map */}
              {canSeePii ? (
                <button
                  role="tab"
                  aria-selected={tab === "map"}
                  onClick={() => setSelection(selected?.id ?? "", "map")}
                  className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all ${tab === "map"
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                >
                  <Map aria-hidden className="size-4 shrink-0" />
                  Response Map
                </button>
              ) : null}

              {/* Tab 4: Safety Ledger */}
              <button
                role="tab"
                aria-selected={tab === "accounted-for"}
                onClick={() => setSelection(selected?.id ?? "", "accounted-for")}
                className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all ${tab === "accounted-for"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
              >
                <CircleCheck aria-hidden className="size-4 shrink-0" />
                Safety Ledger
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
                workspace={workspaceQuery.data}
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
                      Select an event to load its active workspace, safety ledger, and spatial response map.
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
                    rowActions={(row) => (
                      <Button
                        size="sm"
                        variant={row.id === selected?.id ? "secondary" : "outline"}
                        className={row.id === selected?.id ? "bg-emerald-100 text-emerald-900 font-bold border-emerald-200" : ""}
                        onClick={() => setSelection(row.id, "overview")}
                      >
                        {row.id === selected?.id ? "Active Workspace" : "Open Workspace"}
                      </Button>
                    )}
                  />
                </div>
              </div>
            ) : null}

            {/* Response Map Tab */}
            {tab === "map" && canSeePii ? (
              <div className="flex flex-col gap-4">
                {selected ? (
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-neutral-200 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-700">Active Map Context:</span>
                      <Badge tone={selected.is_active ? "danger" : "neutral"}>{selected.name}</Badge>
                      <span className="capitalize text-neutral-500">({selected.type})</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelection(selected.id, "events")}>
                      Change Event
                    </Button>
                  </div>
                ) : null}
                {workspaceQuery.isLoading ? (
                  <WorkspaceLoading label="Loading spatial response map and household locations…" />
                ) : workspaceQuery.isError ? (
                  <WorkspaceError
                    label="The response map could not be loaded."
                    onRetry={() => workspaceQuery.refetch()}
                  />
                ) : workspaceQuery.data ? (
                  <EmergencyResponseMap data={workspaceQuery.data} />
                ) : null}
              </div>
            ) : null}

            {/* Safety Ledger Tab */}
            {tab === "accounted-for" ? (
              <div className="flex flex-col gap-4">
                {selected ? (
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-neutral-200 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-700">Active Ledger Event:</span>
                      <Badge tone={selected.is_active ? "danger" : "neutral"}>{selected.name}</Badge>
                      <span className="capitalize text-neutral-500">({selected.type})</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelection(selected.id, "events")}>
                      Change Event
                    </Button>
                  </div>
                ) : null}
                {accountedQuery.isLoading ? (
                  <WorkspaceLoading label="Loading Accounted For safety ledger…" />
                ) : accountedQuery.isError ? (
                  <WorkspaceError
                    label="The selected event safety ledger could not be loaded."
                    onRetry={() => accountedQuery.refetch()}
                  />
                ) : accountedQuery.data ? (
                  <AccountedForPanel data={accountedQuery.data} />
                ) : null}
              </div>
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

function EndEventDialog({
  event,
  activeCount,
  pending,
  onConfirm,
}: {
  event: EmergencyEventOut;
  activeCount: number;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="danger" className="bg-rose-600 hover:bg-rose-700 font-bold" disabled={pending}>
          End Event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Emergency Event: {event.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {activeCount > 1
              ? `${activeCount - 1} other active event(s) remain live. Physical evacuation occupancy will be preserved.`
              : "This is the final active event. All open evacuation check-ins will be automatically checked out and center occupancy reset."}{" "}
            Historical safety records and walk-ins are safely preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Confirm & End Event
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

