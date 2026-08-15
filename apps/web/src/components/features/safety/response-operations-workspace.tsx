"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  CircleDotDashed,
  Eye,
  MapPinned,
  Search,
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
      <div className="h-[380px] animate-pulse rounded-2xl bg-slate-900 lg:h-[520px]" />
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
      pending: "border-rose-200 bg-rose-50 text-rose-700",
      verified: "border-amber-200 bg-amber-50 text-amber-800",
      dispatched: "border-sky-200 bg-sky-50 text-sky-800",
      in_progress: "border-sky-200 bg-sky-50 text-sky-800",
      resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
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
  const [showHazard, setShowHazard] = React.useState(mode === "rescue");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

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

  const rows = React.useMemo(() => {
    const openStatuses =
      mode === "rescue"
        ? ["pending", "verified", "dispatched"]
        : ["pending", "verified", "in_progress"];
    const term = search.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => {
      const matchesStatus =
        status === "all" ||
        (status === "active"
          ? openStatuses.includes(item.status)
          : item.status === status);
      const matchesEvent =
        eventId === "all" ||
        (eventId === "unlinked" ? !item.event_id : item.event_id === eventId);
      const haystack = [
        titleOf(mode, item),
        item.description,
        item.location_note,
        item.event_name,
        "area_name" in item ? item.area_name : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && matchesEvent && (!term || haystack.includes(term));
    });
  }, [data?.items, eventId, mode, search, status]);

  const mapped = rows.filter((item) => item.location) as Array<
    ResponseItem & { location: NonNullable<ResponseItem["location"]> }
  >;
  const mapItems: ResponseMapItem[] = mapped.map((item, index) => ({
    id: item.id,
    title: titleOf(mode, item),
    status: label(item.status),
    location: item.location,
    label:
      mode === "rescue"
        ? String((item as RescueRequestOut).priority ?? "!")
        : String(index + 1),
    tone: statusTone(item.status),
  }));

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
  const primaryAction =
    current && current.status === "pending"
      ? "verified"
      : current && current.status === "verified"
        ? mode === "rescue"
          ? "dispatched"
          : "in_progress"
        : null;

  const updateStatus = (next: string) => {
    if (!current) return;
    if (next === "resolved") {
      const resolutionNote = window.prompt("Describe the completed response.");
      if (!resolutionNote?.trim()) return;
      patch.mutate({
        id: current.id,
        body: { status: "resolved", resolution_note: resolutionNote },
      });
      return;
    }
    if (next === "dismissed") {
      const dismissalReason = window.prompt("Why is this item being dismissed?");
      if (!dismissalReason?.trim()) return;
      patch.mutate({
        id: current.id,
        body: { status: "dismissed", dismissal_reason: dismissalReason },
      });
      return;
    }
    patch.mutate({ id: current.id, body: { status: next as never } });
  };

  const counts = {
    active: rows.filter((item) =>
      ["pending", "verified", "dispatched", "in_progress"].includes(item.status),
    ).length,
    mapped: mapped.length,
    unmapped: rows.length - mapped.length,
  };

  const heading = mode === "rescue" ? "Rescue Queue" : "Incident Reports";
  const description =
    mode === "rescue"
      ? "Verify and advance requests for help. Map pins and the worklist use the same filters."
      : "Verify, act on, and resolve resident reports. Every mapped report is available directly on the operational map.";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={heading} description={description} />
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative p-3 sm:p-4">
            <ResponseOperationsMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
            />
            <div className="absolute top-7 left-7 rounded-xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur-sm">
              <p className="text-[10px] font-bold tracking-[0.14em] text-emerald-300 uppercase">
                Live work area
              </p>
              <div className="mt-2 flex gap-3 text-xs">
                <span>
                  <b>{counts.active}</b> active
                </span>
                <span>
                  <b>{counts.mapped}</b> pinned
                </span>
              </div>
            </div>
          </div>
          <aside className="border-t border-emerald-100 bg-emerald-950 p-5 text-white xl:border-t-0 xl:border-l">
            <div className="flex items-center gap-2">
              <CircleDotDashed className="size-4 text-emerald-300" />
              <h2 className="text-sm font-bold">Worklist controls</h2>
            </div>
            <label className="relative mt-5 block">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-800" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests"
                className="h-10 w-full rounded-lg bg-white py-2 pr-3 pl-9 text-sm text-slate-900 ring-2 ring-transparent outline-none focus:ring-emerald-300"
              />
            </label>
            <div className="mt-4 space-y-3">
              <label className="block text-[10px] font-bold tracking-[.12em] text-emerald-300 uppercase">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-full bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active work</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {label(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="block pt-1 text-[10px] font-bold tracking-[.12em] text-emerald-300 uppercase">
                Emergency event
              </label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="h-10 w-full bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="unlinked">Unlinked records</SelectItem>
                  {events?.items.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setShowHazard((value) => !value)}
              className="mt-5 flex w-full items-center justify-between rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-xs font-semibold"
            >
              <span>Flood hazard layer</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  showHazard
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-slate-700 text-slate-200",
                )}
              >
                {showHazard ? "On" : "Off"}
              </span>
            </button>
            <div className="mt-5 border-t border-emerald-800 pt-4 text-xs text-emerald-100">
              <p>
                <b>{counts.unmapped}</b> item{counts.unmapped === 1 ? "" : "s"} without a
                map location.
              </p>
              <p className="mt-1 text-emerald-300">
                They remain visible in the worklist below.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-neutral-900">
              Filtered worklist
            </h2>
            <p className="text-xs text-neutral-500">
              {rows.length} matching record{rows.length === 1 ? "" : "s"} · newest first
            </p>
          </div>
          <MapPinned className="size-5 text-emerald-600" />
        </div>
        {isLoading ? (
          <div className="p-8 text-sm text-neutral-500">Loading operational records…</div>
        ) : isError ? (
          <div className="p-8">
            <p className="text-sm text-rose-700">The worklist could not be loaded.</p>
            <Button className="mt-3" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle className="mx-auto size-6 text-neutral-400" />
            <p className="mt-3 text-sm font-semibold text-neutral-700">
              No records match these controls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-emerald-950 text-[10px] tracking-[.12em] text-emerald-100 uppercase">
                <tr>
                  <th className="px-5 py-3">Report</th>
                  <th className="px-4 py-3">Event / area</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-neutral-100 transition hover:bg-emerald-50/40",
                      item.id === selectedId && "bg-emerald-50",
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-neutral-900">
                        {titleOf(mode, item)}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs text-neutral-500">
                        {item.description}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-neutral-800">
                        {item.event_name ?? "Not linked"}
                      </p>
                      <p className="mt-1 text-neutral-500">
                        {("location_area_name" in item && item.location_area_name) ||
                          item.area_name ||
                          "Area unknown"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {item.location
                        ? "Pinned on map"
                        : item.location_note || "No location shared"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px] font-bold",
                          badgeClass(item.status),
                        )}
                      >
                        {label(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {formatTime(item.updated_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <Eye className="size-3.5" />
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-neutral-100 pr-14">
            <SheetTitle>{current ? titleOf(mode, current) : "Loading record"}</SheetTitle>
            <SheetDescription>
              {current
                ? `${label(current.status)} · received ${formatTime(current.created_at)}`
                : ""}
            </SheetDescription>
          </SheetHeader>
          {current ? (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-bold",
                    badgeClass(current.status),
                  )}
                >
                  {label(current.status)}
                </span>
                {current.event_name ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {current.event_name}
                  </span>
                ) : (
                  <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500">
                    Unlinked event
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-[.12em] text-neutral-500 uppercase">
                  Reported concern
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-800">
                  {current.description}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-4 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Location</dt>
                  <dd className="mt-1 font-medium">
                    {current.location_note ??
                      (current.location ? "Map pin supplied" : "Not supplied")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Area</dt>
                  <dd className="mt-1 font-medium">
                    {("location_area_name" in current && current.location_area_name) ||
                      current.area_name ||
                      "Unknown"}
                  </dd>
                </div>
                {mode === "rescue" ? (
                  <>
                    <div>
                      <dt className="text-xs text-neutral-500">People affected</dt>
                      <dd className="mt-1 font-medium">
                        {(current as RescueRequestOut).people_count ?? "Not stated"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Priority</dt>
                      <dd className="mt-1 font-medium">
                        {(current as RescueRequestOut).priority ?? "To assess"}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-xs text-neutral-500">Reporter</dt>
                      <dd className="mt-1 font-medium">
                        {(current as IncidentReportOut).reported_by_name ??
                          "Resident / anonymous"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Type</dt>
                      <dd className="mt-1 font-medium">
                        {label((current as IncidentReportOut).type)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {"photo_url" in current && current.photo_url ? (
                <Image
                  src={current.photo_url}
                  alt="Evidence supplied with incident report"
                  width={800}
                  height={480}
                  unoptimized
                  className="max-h-72 w-full rounded-xl object-cover"
                />
              ) : null}
              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-[.12em] text-neutral-500 uppercase">
                  Record action
                </h3>
                <Select
                  value={current.event_id ?? "unlinked"}
                  onValueChange={(value) =>
                    patch.mutate({
                      id: current.id,
                      body: { event_id: value === "unlinked" ? null : value },
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlinked">No emergency event</SelectItem>
                    {events?.items.map((event) => (
                      <SelectItem value={event.id} key={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  {primaryAction ? (
                    <Button
                      onClick={() => updateStatus(primaryAction)}
                      disabled={patch.isPending}
                    >
                      <CheckCircle2 className="size-4" />
                      Mark {label(primaryAction)}
                    </Button>
                  ) : null}
                  {["verified", "dispatched", "in_progress"].includes(current.status) ? (
                    <Button
                      variant="success"
                      onClick={() => updateStatus("resolved")}
                      disabled={patch.isPending}
                    >
                      Resolve
                    </Button>
                  ) : null}
                  {!["resolved", "dismissed"].includes(current.status) ? (
                    <Button
                      variant="warning"
                      onClick={() => updateStatus("dismissed")}
                      disabled={patch.isPending}
                    >
                      <XCircle className="size-4" />
                      Dismiss
                    </Button>
                  ) : null}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-[.12em] text-neutral-500 uppercase">
                  Operational history
                </h3>
                <ol className="mt-3 space-y-3 border-l border-emerald-200 pl-4">
                  {detail?.history?.map((entry) => (
                    <li key={String(entry.id)} className="relative">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                      <p className="text-sm font-semibold text-neutral-800">
                        {entry.title}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatTime(entry.timestamp)}
                        {entry.actor_name ? ` · ${entry.actor_name}` : ""}
                      </p>
                      {entry.detail ? (
                        <p className="mt-1 text-xs text-neutral-600">{entry.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
