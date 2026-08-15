"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  Clock,
  Eye,
  FileText,
  Filter,
  Layers,
  MapPin,
  MapPinOff,
  Maximize2,
  Phone,
  Radio,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Truck,
  User,
  Waves,
  X,
  XCircle,
} from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import type { Page } from "@/lib/api/public-types";
import type {
  EmergencyEventOut,
  IncidentReportDetailOut,
  IncidentReportOut,
  IncidentReportPatch,
  IncidentStatus,
  RescueRequestDetailOut,
  RescueRequestOut,
  RescueRequestPatch,
  RescueRequestStatus,
} from "@/lib/api/safety-types";
import { cn } from "@/lib/utils";
import type { ResponseMapItem } from "./response-operations-map";

const ResponseOperationsMap = dynamic(
  () =>
    import("./response-operations-map").then((module) => module.ResponseOperationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-2xl bg-slate-900 sm:h-[500px] lg:h-[580px]" />
    ),
  },
);

type ResponseItem = RescueRequestOut | IncidentReportOut;
type ResponseDetail = RescueRequestDetailOut | IncidentReportDetailOut;
type Mode = "rescue" | "incident";

const rescueStatuses: RescueRequestStatus[] = [
  "pending",
  "verified",
  "dispatched",
  "resolved",
  "dismissed",
];
const incidentStatuses: IncidentStatus[] = [
  "pending",
  "verified",
  "in_progress",
  "resolved",
  "dismissed",
];

const SAN_JOSE_AREAS = [
  "Area 1",
  "Area 2",
  "Area 3",
  "Area 4",
  "Area 5",
  "Area 6",
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(value: string | null | undefined) {
  return value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unlinked";
}

function statusTone(status: string) {
  if (status === "resolved") return "emerald";
  if (status === "dismissed") return "slate";
  if (status === "in_progress" || status === "dispatched") return "sky";
  if (status === "verified") return "amber";
  return "rose";
}

function badgeClass(status: string) {
  return (
    {
      pending: "border-rose-300 bg-rose-50 text-rose-700",
      verified: "border-amber-300 bg-amber-50 text-amber-800",
      dispatched: "border-sky-300 bg-sky-50 text-sky-800",
      in_progress: "border-sky-300 bg-sky-50 text-sky-800",
      resolved: "border-emerald-300 bg-emerald-50 text-emerald-800",
      dismissed: "border-slate-200 bg-slate-100 text-slate-600",
    }[status] ?? "border-neutral-200 bg-neutral-50 text-neutral-700"
  );
}

function titleOf(mode: Mode, item: ResponseItem) {
  return mode === "rescue"
    ? (item as RescueRequestOut).requester_name
    : label((item as IncidentReportOut).type);
}

export function ResponseOperationsWorkspace({ mode }: { mode: Mode }) {
  const client = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [eventId, setEventId] = React.useState("all");
  const [selectedArea, setSelectedArea] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [showHazard, setShowHazard] = React.useState(true);
  const [showAreas, setShowAreas] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = React.useState<string | null>(null);

  const endpoint =
    mode === "rescue" ? "/admin/rescue-requests" : "/admin/incident-reports";
  const queryKey = ["admin", mode, "operations"];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get<Page<ResponseItem>>(endpoint, { params: { size: 1000 } })
        .then((response) => response.data),
    refetchInterval: 15_000,
  });

  const { data: events } = useQuery({
    queryKey: ["admin", "emergency-events", "for-response-workspace"],
    queryFn: () =>
      api
        .get<Page<EmergencyEventOut>>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data),
  });

  const { data: detail } = useQuery({
    queryKey: ["admin", mode, "detail", selectedId],
    enabled: !!selectedId,
    queryFn: () =>
      api
        .get<ResponseDetail>(`${endpoint}/${selectedId}`)
        .then((response) => response.data),
  });

  const allItems = React.useMemo(() => data?.items ?? [], [data?.items]);

  // Top metric stats computed over all items in dataset
  const activeStatuses = React.useMemo(
    () =>
      mode === "rescue"
        ? ["pending", "verified", "dispatched"]
        : ["pending", "verified", "in_progress"],
    [mode],
  );

  const stats = React.useMemo(() => {
    const active = allItems.filter((i) => activeStatuses.includes(i.status));
    const pending = allItems.filter((i) => i.status === "pending");
    const inProgress = allItems.filter((i) =>
      ["dispatched", "in_progress"].includes(i.status),
    );
    const resolved = allItems.filter((i) => i.status === "resolved");
    const mapped = allItems.filter((i) => Boolean(i.location));
    const unmapped = allItems.length - mapped.length;

    const p1Count =
      mode === "rescue"
        ? allItems.filter((i) => (i as RescueRequestOut).priority === 1).length
        : 0;
    const p2Count =
      mode === "rescue"
        ? allItems.filter((i) => (i as RescueRequestOut).priority === 2).length
        : 0;

    return {
      total: allItems.length,
      active: active.length,
      pending: pending.length,
      inProgress: inProgress.length,
      resolved: resolved.length,
      mapped: mapped.length,
      unmapped,
      p1Count,
      p2Count,
    };
  }, [activeStatuses, allItems, mode]);

  // Filtered rows for the operational table & map view
  const rows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesStatus =
        status === "all" ||
        (status === "active"
          ? activeStatuses.includes(item.status)
          : item.status === status);

      const matchesEvent =
        eventId === "all" ||
        (eventId === "unlinked" ? !item.event_id : item.event_id === eventId);

      const itemArea =
        ("location_area_name" in item && item.location_area_name) ||
        ("area_name" in item ? item.area_name : null);
      const matchesArea =
        selectedArea === "all" || itemArea === selectedArea;

      const matchesPriority =
        mode !== "rescue" ||
        priorityFilter === "all" ||
        String((item as RescueRequestOut).priority) === priorityFilter;

      const contact =
        "contact_number" in item ? item.contact_number : null;
      const haystack = [
        titleOf(mode, item),
        item.description,
        item.location_note,
        item.event_name,
        itemArea,
        contact,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesEvent &&
        matchesArea &&
        matchesPriority &&
        (!term || haystack.includes(term))
      );
    });
  }, [activeStatuses, allItems, eventId, mode, priorityFilter, search, selectedArea, status]);

  const mapped = rows.filter((item) => item.location) as Array<
    ResponseItem & { location: NonNullable<ResponseItem["location"]> }
  >;

  const mapItems: ResponseMapItem[] = mapped.map((item, index) => {
    const itemArea =
      ("location_area_name" in item && item.location_area_name) ||
      ("area_name" in item ? item.area_name : null);
    const priority = mode === "rescue" ? (item as RescueRequestOut).priority : null;
    return {
      id: item.id,
      title: titleOf(mode, item),
      status: label(item.status),
      location: item.location,
      label:
        mode === "rescue"
          ? String(priority ?? "!")
          : String(index + 1),
      tone: statusTone(item.status),
      areaName: itemArea,
      priority,
    };
  });

  const patch = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RescueRequestPatch | IncidentReportPatch;
    }) => api.patch(`${endpoint}/${id}`, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
      await client.invalidateQueries({ queryKey: ["admin", mode, "detail", selectedId] });
    },
  });

  const current = detail ?? rows.find((item) => item.id === selectedId) ?? null;
  const statuses = mode === "rescue" ? rescueStatuses : incidentStatuses;

  const updateStatus = (next: string) => {
    if (!current) return;
    if (next === "resolved") {
      const resolutionNote = window.prompt("Describe the completed response / resolution:");
      if (!resolutionNote?.trim()) return;
      patch.mutate({
        id: current.id,
        body: { status: "resolved", resolution_note: resolutionNote },
      });
      return;
    }
    if (next === "dismissed") {
      const dismissalReason = window.prompt("Reason for dismissal / false alarm:");
      if (!dismissalReason?.trim()) return;
      patch.mutate({
        id: current.id,
        body: { status: "dismissed", dismissal_reason: dismissalReason },
      });
      return;
    }
    patch.mutate({ id: current.id, body: { status: next as never } });
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("active");
    setEventId("all");
    setSelectedArea("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters = Boolean(
    search ||
      status !== "active" ||
      eventId !== "all" ||
      selectedArea !== "all" ||
      priorityFilter !== "all",
  );

  const heading = mode === "rescue" ? "Rescue Operations Queue" : "Incident Reports Console";
  const description =
    mode === "rescue"
      ? "Live rescue queue for triage, emergency dispatch, and responder mobilization across Barangay San Jose."
      : "Citizen and officer incident reporting center. Review verified reports, triage field responses, and resolve hazards.";

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* -------------------------------------------------------------------- */}
      {/* Page Header                                                          */}
      {/* -------------------------------------------------------------------- */}
      <AdminPageHeader
        title={heading}
        description={description}
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="size-2 animate-ping rounded-full bg-emerald-500" />
              Live Polling (15s)
            </span>
          </div>
        }
      />

      {/* -------------------------------------------------------------------- */}
      {/* Top Metric Cards Strip                                               */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Active Backlog */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">
              Active Queue
            </span>
            <Radio className="size-4 text-rose-600 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-950 tabular-nums">
              {stats.active}
            </span>
            {mode === "rescue" && (stats.p1Count > 0 || stats.p2Count > 0) ? (
              <div className="flex gap-1 text-[10px] font-bold">
                {stats.p1Count > 0 ? (
                  <span className="rounded bg-rose-600 px-1.5 py-0.5 text-white">
                    {stats.p1Count} P1
                  </span>
                ) : null}
                {stats.p2Count > 0 ? (
                  <span className="rounded bg-amber-500 px-1.5 py-0.5 text-white">
                    {stats.p2Count} P2
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-xs font-medium text-rose-700">Open Workload</span>
            )}
          </div>
        </div>

        {/* Pending Triage */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
              Pending Review
            </span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-950 tabular-nums">
              {stats.pending}
            </span>
            <span className="text-xs font-medium text-amber-700">Needs Triage</span>
          </div>
        </div>

        {/* In Progress / Dispatched */}
        <div className="flex flex-col justify-between rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-sky-800 uppercase">
              {mode === "rescue" ? "Dispatched" : "In Progress"}
            </span>
            {mode === "rescue" ? (
              <Truck className="size-4 text-sky-600" />
            ) : (
              <ShieldAlert className="size-4 text-sky-600" />
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-sky-950 tabular-nums">
              {stats.inProgress}
            </span>
            <span className="text-xs font-medium text-sky-700">Field Active</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
              Resolved
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-950 tabular-nums">
              {stats.resolved}
            </span>
            <span className="text-xs font-medium text-emerald-700">Completed</span>
          </div>
        </div>

        {/* Pinned Coordinates */}
        <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Spatial Coverage
            </span>
            <MapPin className="size-4 text-slate-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {stats.mapped}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {stats.unmapped} unmapped
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Map & Operational Controls Panel                                     */}
      {/* -------------------------------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Map canvas container */}
          <div className="relative p-3 sm:p-4">
            <ResponseOperationsMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
              showAreas={showAreas}
              onSelectArea={(area) => setSelectedArea(area)}
              mode={mode}
            />

            {/* Quick map status banner */}
            <div className="absolute top-6 left-6 rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-white shadow-2xl backdrop-blur-md">
              <p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                Interactive Operations Map
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" />
                  {rows.length} Visible Records
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">
                  <b>{mapItems.length}</b> Pinned
                </span>
              </div>
            </div>
          </div>

          {/* Control Sidebar (Right Column) */}
          <aside className="border-t border-emerald-900/60 bg-emerald-950 p-5 text-white xl:border-t-0 xl:border-l">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-emerald-400" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-white">
                  Filters & Layers
                </h2>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 rounded bg-emerald-900 px-2 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-700 hover:bg-emerald-800 hover:text-white transition"
                >
                  <RotateCcw className="size-2.5" />
                  Reset
                </button>
              ) : null}
            </div>

            {/* Search Input */}
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={mode === "rescue" ? "Search requester, phone..." : "Search reports, notes..."}
                className="h-10 w-full rounded-xl bg-white pr-3 pl-9 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Dropdown Filters */}
            <div className="mt-4 space-y-3">
              {/* Status */}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-emerald-800 bg-white text-xs font-semibold text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Queue (Open items)</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area / Sitio Filter */}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                  Sitio / Area
                </label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-emerald-800 bg-white text-xs font-semibold text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas (Barangay-wide)</SelectItem>
                    {SAN_JOSE_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Emergency Event */}
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                  Emergency Event
                </label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-emerald-800 bg-white text-xs font-semibold text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="unlinked">Unlinked Records</SelectItem>
                    {events?.items.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority filter (for rescue) */}
              {mode === "rescue" ? (
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                    Urgency Priority
                  </label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-emerald-800 bg-white text-xs font-semibold text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="1">Priority 1 (Critical)</SelectItem>
                      <SelectItem value="2">Priority 2 (High)</SelectItem>
                      <SelectItem value="3">Priority 3 (Moderate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {/* Map Layer Toggles */}
            <div className="mt-5 border-t border-emerald-800/80 pt-4">
              <p className="mb-2 text-[10px] font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                <Layers className="size-3.5" />
                Map Layers
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowHazard((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-700/80 bg-emerald-900/60 px-3 py-2 text-xs font-semibold transition hover:bg-emerald-900"
                >
                  <span className="flex items-center gap-1.5">
                    <Waves className="size-3.5 text-amber-400" />
                    Flood Hazard (5-Year)
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      showHazard
                        ? "bg-emerald-400 text-emerald-950"
                        : "bg-slate-800 text-slate-300",
                    )}
                  >
                    {showHazard ? "On" : "Off"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAreas((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-700/80 bg-emerald-900/60 px-3 py-2 text-xs font-semibold transition hover:bg-emerald-900"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="size-3.5 text-emerald-400" />
                    Area List (Sitios)
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      showAreas
                        ? "bg-emerald-400 text-emerald-950"
                        : "bg-slate-800 text-slate-300",
                    )}
                  >
                    {showAreas ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Unmapped summary helper */}
            <div className="mt-5 rounded-xl bg-emerald-900/50 p-3 text-xs text-emerald-200 border border-emerald-800/60">
              <p className="font-semibold text-white">
                {countsSubtitle(stats.unmapped)}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-300/80">
                All records are actionable in the table below regardless of coordinates.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Filtered Operational Worklist Table                                  */}
      {/* -------------------------------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 bg-neutral-50/50">
          <div>
            <h2 className="font-heading text-lg font-bold text-neutral-900">
              Filtered Records Worklist
            </h2>
            <p className="text-xs text-neutral-500">
              {rows.length} record{rows.length === 1 ? "" : "s"} matching active filters · newest first
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
              {rows.length} displayed
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            <CircleDotDashed className="mx-auto size-6 animate-spin text-emerald-600 mb-2" />
            Loading operational worklist…
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto size-6 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-rose-700">The worklist could not be loaded.</p>
            <Button className="mt-3" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto size-8 text-neutral-300 mb-2" />
            <p className="text-sm font-bold text-neutral-700">
              No operational records match these filters.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Try adjusting the status, area, or search query in the controls above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-emerald-950 text-[10.5px] font-bold tracking-wider text-emerald-100 uppercase">
                <tr>
                  <th className="px-5 py-3.5">
                    {mode === "rescue" ? "Requester & Details" : "Report & Description"}
                  </th>
                  <th className="px-4 py-3.5">
                    {mode === "rescue" ? "Priority" : "Category"}
                  </th>
                  <th className="px-4 py-3.5">Location & Area</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Submitted / Event</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((item) => {
                  const isSelected = item.id === selectedId;
                  const itemArea =
                    ("location_area_name" in item && item.location_area_name) ||
                    ("area_name" in item ? item.area_name : null);
                  const contactNumber =
                    "contact_number" in item ? item.contact_number : null;
                  const photoUrl =
                    "photo_url" in item ? item.photo_url : null;
                  const priority =
                    mode === "rescue" ? (item as RescueRequestOut).priority : null;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-emerald-50/40",
                        isSelected && "bg-emerald-50/80 font-medium",
                      )}
                    >
                      {/* Name / Title */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          {photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightboxPhoto(photoUrl)}
                              className="group relative size-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 hover:ring-2 hover:ring-emerald-500"
                              title="View photo attachment"
                            >
                              <Image
                                src={photoUrl}
                                alt="Incident attachment"
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="size-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                              {mode === "rescue" ? (
                                <User className="size-4" />
                              ) : (
                                <FileText className="size-4" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 truncate">
                              {titleOf(mode, item)}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 max-w-sm">
                              {item.description || "No description provided."}
                            </p>
                            {contactNumber ? (
                              <a
                                href={`tel:${contactNumber}`}
                                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                <Phone className="size-3" />
                                {contactNumber}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Priority / Category */}
                      <td className="px-4 py-3.5 text-xs">
                        {mode === "rescue" ? (
                          priority === 1 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-800">
                              <span className="size-1.5 rounded-full bg-rose-600" />
                              P1 Critical
                            </span>
                          ) : priority === 2 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                              <span className="size-1.5 rounded-full bg-amber-600" />
                              P2 High
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 font-bold text-sky-800">
                              <span className="size-1.5 rounded-full bg-sky-600" />
                              P3 Moderate
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-semibold text-neutral-800">
                            {label((item as IncidentReportOut).type)}
                          </span>
                        )}
                      </td>

                      {/* Location & Area */}
                      <td className="px-4 py-3.5 text-xs">
                        <p className="font-semibold text-neutral-800">
                          {itemArea || "Area Unknown"}
                        </p>
                        <p className="mt-0.5 text-neutral-500 truncate max-w-xs">
                          {item.location_note || "No specific note"}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          {item.location ? (
                            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-emerald-700">
                              <MapPin className="size-3" /> Pinned on map
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-slate-400">
                              <MapPinOff className="size-3" /> Unmapped
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs",
                            badgeClass(item.status),
                          )}
                        >
                          {item.status === "resolved" ? (
                            <CheckCircle2 className="size-3" />
                          ) : item.status === "pending" ? (
                            <Clock className="size-3" />
                          ) : (
                            <Activity className="size-3" />
                          )}
                          {label(item.status)}
                        </span>
                      </td>

                      {/* Submitted & Event */}
                      <td className="px-4 py-3.5 text-xs text-neutral-600">
                        <p className="font-medium">{formatTime(item.created_at)}</p>
                        <p className="mt-0.5 text-neutral-400 truncate max-w-xs">
                          {item.event_name ? `Event: ${item.event_name}` : "General Dispatch"}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={isSelected ? "primary" : "outline"}
                          onClick={() => setSelectedId(item.id)}
                          className="h-8 text-xs font-bold"
                        >
                          Triage & Review
                          <ChevronRight className="ml-1 size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Triage & Detail Sheet Drawer                                         */}
      {/* -------------------------------------------------------------------- */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900">
          <SheetHeader className="border-b border-neutral-100 bg-emerald-950 p-5 sm:p-6 text-white shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase">
                {mode === "rescue" ? "Rescue Request Record" : "Incident Report Record"}
              </span>
              {current ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    badgeClass(current.status),
                  )}
                >
                  {label(current.status)}
                </span>
              ) : null}
            </div>
            <SheetTitle className="mt-2 text-xl font-black text-white">
              {current ? titleOf(mode, current) : "Loading details…"}
            </SheetTitle>
            <SheetDescription className="text-xs text-emerald-200/80">
              {current?.event_name ? `Associated with ${current.event_name}` : "Unlinked incident record"}
            </SheetDescription>
          </SheetHeader>

          {current ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-sm">
              {/* Photo attachment if present */}
              {"photo_url" in current && current.photo_url ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  <div className="relative h-56 w-full cursor-pointer" onClick={() => setLightboxPhoto(current.photo_url)}>
                    <Image
                      src={current.photo_url}
                      alt="Incident attachment"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
                      <Maximize2 className="size-3" />
                      Expand Photo
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Citizen / Contact Information */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-2">
                  Requester & Contact
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      {"requester_name" in current
                        ? current.requester_name
                        : current.reported_by_name || "Anonymous Resident"}
                    </span>
                    {"contact_number" in current && current.contact_number ? (
                      <a
                        href={`tel:${current.contact_number}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <Phone className="size-3.5" />
                        Call {current.contact_number}
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">No phone provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Location details */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-2">
                  Location & Spatial Data
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500">Sitio / Area:</span>
                    <p className="font-bold text-neutral-900">
                      {("location_area_name" in current && current.location_area_name) ||
                        current.area_name ||
                        "Area Unknown"}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Coordinates:</span>
                    <p className="font-bold text-neutral-900">
                      {current.location
                        ? `${current.location.coordinates[1].toFixed(5)}, ${current.location.coordinates[0].toFixed(5)}`
                        : "No coordinates recorded"}
                    </p>
                  </div>
                </div>
                {current.location_note ? (
                  <div className="mt-2.5 border-t border-neutral-200/60 pt-2 text-xs">
                    <span className="text-neutral-500">Landmarks / Note:</span>
                    <p className="mt-0.5 font-medium text-neutral-800">{current.location_note}</p>
                  </div>
                ) : null}
              </div>

              {/* Description */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-1.5">
                  Report Description
                </p>
                <p className="text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap">
                  {current.description || "No specific details provided."}
                </p>
              </div>

              {/* Resolution / Dismissal Notes if present */}
              {current.resolution_note ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs">
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-700" />
                    Resolution Note
                  </p>
                  <p className="mt-1 text-emerald-800 leading-relaxed">{current.resolution_note}</p>
                  {current.resolved_at ? (
                    <p className="mt-1 text-[10px] text-emerald-600 font-semibold">
                      Resolved: {formatTime(current.resolved_at)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {"dismissal_reason" in current && current.dismissal_reason ? (
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-xs">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <XCircle className="size-4 text-slate-600" />
                    Dismissal Reason
                  </p>
                  <p className="mt-1 text-slate-700 leading-relaxed">{current.dismissal_reason}</p>
                </div>
              ) : null}

              {/* Lifecycle Triage Actions */}
              <div className="mt-auto border-t border-neutral-100 pt-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-1">
                  Operational Lifecycle Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {current.status === "pending" ? (
                    <Button
                      variant="secondary"
                      className="bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300 font-bold"
                      onClick={() => updateStatus("verified")}
                    >
                      <CheckCircle2 className="mr-1.5 size-4 text-amber-700" />
                      Verify Request
                    </Button>
                  ) : null}

                  {current.status === "verified" ? (
                    <Button
                      variant="primary"
                      className="bg-sky-600 text-white hover:bg-sky-700 font-bold"
                      onClick={() => updateStatus(mode === "rescue" ? "dispatched" : "in_progress")}
                    >
                      <Truck className="mr-1.5 size-4" />
                      {mode === "rescue" ? "Dispatch Team" : "Mark In Progress"}
                    </Button>
                  ) : null}

                  {current.status !== "resolved" && current.status !== "dismissed" ? (
                    <Button
                      variant="primary"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                      onClick={() => updateStatus("resolved")}
                    >
                      <CheckCircle2 className="mr-1.5 size-4" />
                      Mark Resolved
                    </Button>
                  ) : null}

                  {current.status !== "dismissed" && current.status !== "resolved" ? (
                    <Button
                      variant="outline"
                      className="text-rose-700 border-rose-200 hover:bg-rose-50 font-bold"
                      onClick={() => updateStatus("dismissed")}
                    >
                      <XCircle className="mr-1.5 size-4 text-rose-600" />
                      Dismiss
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-neutral-400">
              Select a record to inspect its operational timeline.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* -------------------------------------------------------------------- */}
      {/* Lightbox Modal for Photo Attachments                                 */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={Boolean(lightboxPhoto)} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
        <DialogContent className="w-full max-w-4xl p-1 bg-slate-950 border-slate-800 text-white overflow-hidden rounded-2xl">
          <div className="relative h-[70vh] w-full">
            {lightboxPhoto ? (
              <Image
                src={lightboxPhoto}
                alt="Full resolution incident photo"
                fill
                className="object-contain"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900 border-t border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">Incident Field Capture</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLightboxPhoto(null)}
              className="text-white border-slate-700 hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function countsSubtitle(unmappedCount: number) {
  if (unmappedCount === 0) return "All records have spatial coordinates.";
  if (unmappedCount === 1) return "1 record is missing map coordinates.";
  return `${unmappedCount} records are missing map coordinates.`;
}
