"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Flame,
  LifeBuoy,
  Map,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  UserCheck,
  UserPlus,
  Waves,
  Wind,
} from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { EditEventDialog } from "@/components/features/safety/edit-event-dialog";
import { EmergencyEventBackfillDialog } from "@/components/features/safety/emergency-event-backfill-dialog";
import { SafetyJourneyDrawer } from "@/components/features/safety/safety-journey-drawer";
import { api } from "@/lib/api/client";
import type {
  EmergencyEventDetailOut,
  EmergencyWorkspaceOut,
  IncidentReportOut,
  RescueRequestOut,
  SafetyLedgerPageOut,
} from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { cn } from "@/lib/utils";

const EmergencyResponseMap = dynamic(
  () =>
    import("@/components/features/safety/emergency-response-map").then(
      (module) => module.EmergencyResponseMap,
    ),
  {
    ssr: false,
    loading: () => <WorkspaceLoading label="Loading spatial response map…" />,
  },
);

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(start)) return "—";
  const diffMs = Math.max(0, end - start);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (days > 0) return `${days} days, ${remHours} hours`;
  const totalMins = Math.floor(diffMs / (1000 * 60));
  if (totalHours > 0) return `${totalHours} hours, ${totalMins % 60} mins`;
  return `${totalMins} minutes`;
}

function getHazardIcon(type: string) {
  switch (type.toLowerCase()) {
    case "flood":
      return <Waves className="size-6 text-sky-600" />;
    case "fire":
      return <Flame className="size-6 text-rose-600" />;
    case "typhoon":
    case "severe_weather":
      return <Wind className="size-6 text-teal-600" />;
    case "earthquake":
      return <AlertTriangle className="size-6 text-amber-600" />;
    default:
      return <Siren className="size-6 text-emerald-600" />;
  }
}

const subTabs = [
  { id: "ledger", label: "Safety & Check-in Ledger", icon: CheckCircle2 },
  { id: "evac", label: "Evacuation Center Roster", icon: Building2 },
  { id: "rescues", label: "Rescue Operations Queue", icon: LifeBuoy },
  { id: "incidents", label: "Field Hazard Reports", icon: AlertTriangle },
  { id: "map", label: "Spatial Response Map", icon: Map },
  { id: "backfill", label: "Blackout Recovery Hub", icon: FileSpreadsheet },
] as const;

type SubTab = (typeof subTabs)[number]["id"];

export default function EmergencyEventDetailPage() {
  const { user } = useRequireRole("admin", "bhw", "sk");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const eventId = params.id;
  const currentTab = (searchParams.get("tab") as SubTab) || "ledger";

  const canManage = user?.role === "admin" || user?.role === "superadmin";
  const canSeePii = user?.role !== "sk";

  const [editOpen, setEditOpen] = React.useState(false);
  const [backfillOpen, setBackfillOpen] = React.useState(false);
  const [journeySubject, setJourneySubject] = React.useState<{
    id: string;
    type: "registered_member" | "unregistered_person";
    name?: string;
  } | null>(null);

  // Filters for ledger
  const [ledgerSearch, setLedgerSearch] = React.useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = React.useState<string>("all");
  const [ledgerAreaFilter, setLedgerAreaFilter] = React.useState<string>("all");

  // 1. Fetch event detail
  const eventQuery = useQuery({
    queryKey: ["admin", "emergency-event", eventId],
    queryFn: () =>
      api
        .get<EmergencyEventDetailOut>(`/admin/emergency-events/${eventId}`)
        .then((r) => r.data),
  });

  // 2. Fetch the full PII-bearing workspace only for the spatial map.
  const workspaceQuery = useQuery({
    queryKey: ["admin", "emergency-workspace", eventId],
    queryFn: () =>
      api
        .get<EmergencyWorkspaceOut>(`/admin/emergency-events/${eventId}/workspace`)
        .then((r) => r.data),
    enabled: canSeePii && currentTab === "map",
  });

  // 3. Fetch Safety Ledger entries
  const ledgerQuery = useQuery({
    queryKey: [
      "admin",
      "safety",
      "ledger",
      eventId,
      ledgerStatusFilter,
      ledgerAreaFilter,
    ],
    queryFn: () =>
      api
        .get<SafetyLedgerPageOut>("/admin/safety/ledger", {
          params: {
            event_id: eventId,
            status: ledgerStatusFilter !== "all" ? ledgerStatusFilter : undefined,
            area_id: ledgerAreaFilter !== "all" ? ledgerAreaFilter : undefined,
            size: 100,
          },
        })
        .then((r) => r.data),
  });

  // 4. Fetch Rescue Requests
  const rescuesQuery = useQuery({
    queryKey: ["admin", "rescue-requests", eventId],
    queryFn: () =>
      api
        .get<{ items: RescueRequestOut[] }>("/admin/rescue-requests", {
          params: { size: 100 },
        })
        .then((r) => r.data.items.filter((item) => !item.household_reference_no || true)),
  });

  // 5. Fetch Incident Reports
  const incidentsQuery = useQuery({
    queryKey: ["admin", "incident-reports", eventId],
    queryFn: () =>
      api
        .get<{ items: IncidentReportOut[] }>("/admin/incident-reports", {
          params: { size: 100 },
        })
        .then((r) => r.data.items),
  });

  // 6. Fetch Evacuation Centers
  const evacCentersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api.get<PublicEvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });

  const event = eventQuery.data;
  const stats = event?.stats;

  const setTab = (newTab: SubTab) => {
    router.replace(`/admin/emergency-events/${eventId}?tab=${newTab}` as Route);
  };

  const filteredLedgerItems = React.useMemo(() => {
    const items = ledgerQuery.data?.items ?? [];
    if (!ledgerSearch.trim()) return items;
    const q = ledgerSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.person_name.toLowerCase().includes(q) ||
        item.household_reference_no?.toLowerCase().includes(q) ||
        item.area_name?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q),
    );
  }, [ledgerQuery.data?.items, ledgerSearch]);

  if (eventQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Emergency Event Record"
          description="Loading disaster response logs, area safety ledger, and operational metrics…"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-700">
            Loading comprehensive event dossier…
          </p>
        </div>
      </div>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Emergency Event Not Found"
          description="The requested disaster record could not be loaded."
        />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 size-10 text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">Incident record not found</h2>
          <p className="mt-1 text-xs text-slate-600">
            This emergency event may have been deleted or the identifier is invalid.
          </p>
          <Button
            asChild
            className="mt-5 rounded-xl bg-slate-900 text-xs font-bold text-white"
          >
            <Link href="/admin/emergency-events?tab=events">
              <ArrowLeft className="mr-2 size-4" /> Back to Emergency Events Directory
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Hero Incident Context Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-r from-[#032e23] via-[#054333] to-[#085a44] p-6 text-white shadow-md sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-teal-300/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-950 shadow-lg ring-4 ring-white/10">
              {getHazardIcon(event.type)}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {event.is_active ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-600 px-3 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-sm">
                    <span className="relative flex size-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-white" />
                    </span>
                    LIVE INCIDENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/90 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-300 uppercase">
                    <span className="size-2 shrink-0 rounded-full bg-slate-400" />
                    CONCLUDED & ARCHIVED
                  </span>
                )}

                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase">
                  {event.type}
                </span>

                <div className="ml-1 flex items-center gap-1.5 text-xs font-bold text-emerald-100">
                  <Clock className="size-3.5 shrink-0 text-emerald-300" />
                  <span>
                    Duration: {formatDuration(event.started_at, event.ended_at)}
                  </span>
                </div>
              </div>

              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                {event.name}
              </h1>

              <p className="flex flex-wrap items-center gap-2 text-xs text-emerald-200/90">
                <span>
                  Declared:{" "}
                  {new Date(event.started_at).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                {event.ended_at && (
                  <>
                    <span>·</span>
                    <span>
                      Concluded:{" "}
                      {new Date(event.ended_at).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </>
                )}
                {event.declared_by_name && (
                  <>
                    <span>·</span>
                    <span>Logged by {event.declared_by_name}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-emerald-800/40 pt-3 lg:border-t-0 lg:pt-0">
            <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-right backdrop-blur-md">
              <span className="block text-[10px] font-bold text-emerald-300/80 uppercase">
                Audit Record ID
              </span>
              <span className="block max-w-[200px] truncate font-mono text-xs font-bold text-white">
                {event.id}
              </span>
            </div>

            {canManage ? (
              <Button
                onClick={() => setEditOpen(true)}
                size="sm"
                className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-xl border border-white/20 bg-white/15 text-xs font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
              >
                <Pencil className="size-3.5 text-emerald-200" />
                <span>Edit Event</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Top 5 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1: Safety & Check-in Rate */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
              Safety Confirmations
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-950 sm:text-3xl">
              {stats?.total_safe_count ?? 0}
            </span>
            <span className="ml-1 text-xs font-medium text-slate-500">
              / {stats?.total_checkins_count ?? 0} logged
            </span>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="size-3" />
              <span>
                {stats?.total_checkins_count
                  ? `${Math.round(((stats?.total_safe_count ?? 0) / (stats?.total_checkins_count || 1)) * 100)}% Safe rate`
                  : "Safety check-ins tracked"}
              </span>
            </p>
          </div>
        </div>

        {/* Metric 2: Evacuees Sheltered */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              Evacuees Sheltered
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-800">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-950 sm:text-3xl">
              {stats?.total_evacuees_count ?? 0}
            </span>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Across {stats?.active_centers_used ?? 0} evacuation centers
            </p>
          </div>
        </div>

        {/* Metric 3: Rescue Operations */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              Rescue Queue
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-rose-100 text-rose-800">
              <LifeBuoy className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-950 sm:text-3xl">
                {stats?.open_rescue_requests_count ?? 0}
              </span>
              <span className="text-xs font-bold text-rose-600">active</span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {stats?.total_rescue_requests_count ?? 0} total requests triaged
            </p>
          </div>
        </div>

        {/* Metric 4: Field Hazard Incidents */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              Field Hazard Reports
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-950 sm:text-3xl">
              {stats?.total_incident_reports_count ?? 0}
            </span>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {stats?.verified_incident_reports_count ?? 0} verified by officers
            </p>
          </div>
        </div>

        {/* Metric 5: Unregistered Walk-Ins */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              Walk-in Persons
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-teal-100 text-teal-800">
              <UserPlus className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-950 sm:text-3xl">
              {stats?.total_unregistered_count ?? 0}
            </span>
            <p className="mt-0.5 text-[11px] font-semibold text-teal-700">
              Handled during emergency
            </p>
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Dossier Container */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Navigation Tabs Header */}
        <div className="overflow-x-auto border-b border-slate-200 bg-slate-50/70">
          <div role="tablist" className="flex min-w-max gap-1 p-1">
            {subTabs.map((t) => {
              const Icon = t.icon;
              const isSelected = currentTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                    isSelected
                      ? "border border-slate-200/80 bg-white font-black text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "text-emerald-700" : "text-slate-400",
                    )}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Safety & Check-in Ledger */}
        {currentTab === "ledger" ? (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <CheckCircle2 className="size-4.5 text-emerald-600" />
                  Disaster Safety Check-in Stream & Audit Trail
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Complete chronological audit of every safety confirmation, self
                  check-in, and BHW field assessment for this emergency.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setBackfillOpen(true)}
                  className="gap-1.5 rounded-xl bg-teal-700 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                >
                  <Plus className="size-3.5" />
                  <span>Backfill Safety Entry</span>
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="relative w-full flex-1">
                <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resident name, household ref, area, or notes..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none max-sm:w-full"
              >
                <option value="all">All Safety Statuses</option>
                <option value="safe">Safe Only</option>
                <option value="needs_rescue">Needs Rescue Only</option>
                <option value="unaccounted">Unaccounted Only</option>
              </select>

              <select
                value={ledgerAreaFilter}
                onChange={(e) => setLedgerAreaFilter(e.target.value)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none max-sm:w-full"
              >
                <option value="all">All Areas</option>
                <option value="1">Area 1</option>
                <option value="2">Area 2</option>
                <option value="3">Area 3</option>
                <option value="4">Area 4</option>
                <option value="5">Area 5</option>
                <option value="6">Area 6</option>
              </select>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#04281e] text-[10px] font-black tracking-wider text-white uppercase">
                  <tr>
                    <th className="px-4 py-3">Timestamp (PHT)</th>
                    <th className="px-4 py-3">Resident / Subject</th>
                    <th className="px-4 py-3">Household & Area</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Method & Source</th>
                    <th className="px-4 py-3">Location / Shelter</th>
                    <th className="px-4 py-3">Recorded By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ledgerQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center font-medium text-slate-400"
                      >
                        Loading safety check-in records…
                      </td>
                    </tr>
                  ) : filteredLedgerItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center font-medium text-slate-400"
                      >
                        No check-in entries found for this emergency event.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerItems.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-700">
                          {new Date(item.timestamp).toLocaleTimeString("en-PH", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {new Date(item.timestamp).toLocaleDateString("en-PH", {
                              dateStyle: "medium",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{item.person_name}</span>
                            {item.is_head && (
                              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-black text-emerald-800 uppercase">
                                Head
                              </span>
                            )}
                            {item.subject_type === "unregistered_person" && (
                              <span className="rounded bg-teal-100 px-1 py-0.5 text-[9px] font-black text-teal-800 uppercase">
                                Walk-In
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.household_reference_no ? (
                            <span className="block font-semibold text-slate-900">
                              {item.household_reference_no}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unregistered</span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {item.area_name ?? "Area Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "safe" ? (
                            <Badge
                              tone="success"
                              className="text-[10px] font-bold uppercase"
                            >
                              Safe
                            </Badge>
                          ) : item.status === "needs_rescue" ? (
                            <Badge
                              tone="danger"
                              className="animate-pulse text-[10px] font-black uppercase"
                            >
                              Rescue
                            </Badge>
                          ) : (
                            <Badge
                              tone="warning"
                              className="text-[10px] font-bold uppercase"
                            >
                              Unaccounted
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 capitalize">
                          <span className="font-medium">
                            {item.set_method?.replace("_", " ") ?? "Assisted"}
                          </span>
                          {item.notes && (
                            <span
                              className="block max-w-[140px] truncate text-[10px] text-slate-500"
                              title={item.notes}
                            >
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.evac_center_name ? (
                            <span className="flex items-center gap-1 font-semibold text-sky-800">
                              <Building2 className="size-3 shrink-0" />
                              <span className="max-w-[140px] truncate">
                                {item.evac_center_name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Home / Safe Place</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">
                          {item.set_by_name ?? "System / Resident"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const id = item.member_id || item.unregistered_person_id;
                              if (id) {
                                setJourneySubject({
                                  id,
                                  type: item.subject_type,
                                  name: item.person_name,
                                });
                              }
                            }}
                            className="h-7 rounded-lg border-slate-200 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="mr-1 size-3" /> Journey
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Tab 2: Evacuation Center Roster */}
        {currentTab === "evac" ? (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <Building2 className="size-4.5 text-sky-600" />
                  Evacuation Center Shelter Operations & Capacity
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Shelter occupancies, center manifests, and resident check-in logs during
                  this emergency.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(evacCentersQuery.data ?? []).map((center) => {
                const occupancy = center.occupancy ?? 0;
                const capacity = center.capacity ?? 0;
                const pct =
                  capacity > 0
                    ? Math.min(100, Math.round((occupancy / capacity) * 100))
                    : 0;
                return (
                  <div
                    key={center.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-bold text-slate-900">
                          {center.facility.name}
                        </span>
                        <Badge
                          tone={center.is_open ? "success" : "neutral"}
                          className="text-[10px] font-bold"
                        >
                          {center.is_open ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="size-3 text-slate-400" />
                        <span>
                          {center.facility.address || center.facility.area_name}
                        </span>
                      </p>

                      <div className="mt-4">
                        <div className="mb-1 flex items-baseline justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            Current Occupancy
                          </span>
                          <span className="font-black text-slate-900">
                            {occupancy} / {capacity || "Unlimited"}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 90
                                ? "bg-rose-500"
                                : pct >= 60
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs text-slate-500">
                      <span>Area: {center.facility.area_name}</span>
                      <span>Contact: {center.contact_number || "Barangay Desk"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Tab 3: Rescue Operations Queue */}
        {currentTab === "rescues" ? (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <LifeBuoy className="size-4.5 text-rose-600" />
                  Emergency Rescue Queue & Dispatch Triage
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Citizen rescue distress calls and emergency dispatches logged during
                  this event.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#04281e] text-[10px] font-black tracking-wider text-white uppercase">
                  <tr>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Requester Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location / Note</th>
                    <th className="px-4 py-3">People</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned Officer</th>
                    <th className="px-4 py-3">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(rescuesQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center font-medium text-slate-400"
                      >
                        No rescue calls recorded during this emergency event.
                      </td>
                    </tr>
                  ) : (
                    (rescuesQuery.data ?? []).map((req) => (
                      <tr key={req.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black tracking-wide shadow-2xs",
                              (req.priority ?? 3) >= 5
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : (req.priority ?? 3) === 4
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : (req.priority ?? 3) === 3
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                            )}
                            title={`Triage Urgency: Priority ${req.priority ?? 3} of 5`}
                          >
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                (req.priority ?? 3) >= 5
                                  ? "animate-pulse bg-rose-600"
                                  : (req.priority ?? 3) === 4
                                    ? "bg-amber-500"
                                    : (req.priority ?? 3) === 3
                                      ? "bg-emerald-600"
                                      : "bg-slate-400",
                              )}
                            />
                            <span>P{req.priority ?? 3}</span>
                            <span className="text-[10px] font-bold opacity-80">
                              {(req.priority ?? 3) >= 5
                                ? "Critical"
                                : (req.priority ?? 3) === 4
                                  ? "High"
                                  : (req.priority ?? 3) === 3
                                    ? "Standard"
                                    : "Low"}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {req.requester_name}
                          {req.household_reference_no && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              HH: {req.household_reference_no}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {req.contact_number ?? "—"}
                        </td>
                        <td
                          className="max-w-xs truncate px-4 py-3 text-slate-700"
                          title={req.location_note ?? req.description}
                        >
                          {req.location_note ?? req.description}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {req.people_count ?? 1}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              req.status === "resolved"
                                ? "success"
                                : req.status === "dispatched"
                                  ? "info"
                                  : req.status === "verified"
                                    ? "warning"
                                    : "danger"
                            }
                            className="text-[10px] font-bold uppercase"
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {req.assigned_to_name ?? "Unassigned"}
                        </td>
                        <td
                          className="max-w-xs truncate px-4 py-3 text-[11px] text-slate-600"
                          title={req.resolution_note ?? ""}
                        >
                          {req.resolution_note ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Tab 4: Field Hazard Reports */}
        {currentTab === "incidents" ? (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <AlertTriangle className="size-4.5 text-amber-600" />
                  Field Hazard & Damage Incident Reports
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Citizen hazard reports, fallen trees, flooded roads, and power
                  infrastructure issues.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(incidentsQuery.data ?? []).length === 0 ? (
                <div className="col-span-full py-12 text-center font-medium text-slate-400">
                  No field hazard reports filed for this event.
                </div>
              ) : (
                (incidentsQuery.data ?? []).map((inc) => (
                  <div
                    key={inc.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone="warning" className="text-[10px] font-bold uppercase">
                          {inc.type.replace("_", " ")}
                        </Badge>
                        <Badge
                          tone={
                            inc.status === "verified"
                              ? "success"
                              : inc.status === "dismissed"
                                ? "neutral"
                                : "danger"
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {inc.status}
                        </Badge>
                      </div>

                      <p className="mt-2.5 line-clamp-3 text-xs font-semibold text-slate-800">
                        {inc.description}
                      </p>

                      {inc.location_note && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="size-3 shrink-0 text-slate-400" />
                          <span className="truncate">{inc.location_note}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                      <span>Reported by {inc.reported_by_name ?? "Citizen"}</span>
                      <span>
                        {new Date(inc.created_at).toLocaleTimeString("en-PH", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* Tab 5: Spatial Response Map */}
        {currentTab === "map" && canSeePii ? (
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <Map className="size-4.5 text-emerald-600" />
                  Spatial Response & Hazard Map
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Private geographic distribution of affected households, evacuation
                  centers, and field pins.
                </p>
              </div>
            </div>

            {workspaceQuery.isLoading ? (
              <WorkspaceLoading label="Loading spatial map..." />
            ) : workspaceQuery.data ? (
              <EmergencyResponseMap data={workspaceQuery.data} />
            ) : null}
          </div>
        ) : null}

        {/* Tab 6: Blackout Recovery & Backfill Hub */}
        {currentTab === "backfill" ? (
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-teal-50/40 to-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-teal-800 uppercase">
                  <FileSpreadsheet className="size-4 text-teal-700" />
                  Offline Roster & Paper Manifest Ingestion Center
                </span>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Post-Blackout Data Ingestion Hub
                </h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
                  When electrical power or cellular data is restored after a disaster
                  blackout, enter physical paper sign-in sheets, BHW field logs, and
                  retroactive check-ins directly into the verified platform ledger.
                </p>
              </div>

              <Button
                onClick={() => setBackfillOpen(true)}
                className="shrink-0 gap-1.5 rounded-xl bg-teal-700 text-xs font-bold text-white shadow-md hover:bg-teal-800"
              >
                <Plus className="size-4" />
                <span>Launch Backfill Wizard</span>
              </Button>
            </div>

            {/* Backfill Quick Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-400 hover:shadow-md"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <UserCheck className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 transition-colors group-hover:text-teal-700">
                    1. Household Safety Logs
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Input door-to-door verification sheets with retroactive timestamps.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-400 hover:shadow-md"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-800 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                  <UserPlus className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 transition-colors group-hover:text-teal-700">
                    2. Unregistered Walk-Ins
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Log displaced non-residents and transient evacuees.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-400 hover:shadow-md"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-800 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                  <Building2 className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 transition-colors group-hover:text-teal-700">
                    3. Evacuation Manifests
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Digitize paper logbooks from school gymnasiums & covered courts.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-400 hover:shadow-md"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 transition-colors group-hover:text-teal-700">
                    4. Blackout Incident Reports
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Log road blockages, fallen trees, and infrastructure failures.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modals & Drawers */}
      {editOpen && (
        <EditEventDialog
          event={event}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={() => {
            queryClient.invalidateQueries({
              queryKey: ["admin", "emergency-event", eventId],
            });
            queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] });
          }}
        />
      )}

      {backfillOpen && (
        <EmergencyEventBackfillDialog
          event={event}
          open={backfillOpen}
          onOpenChange={setBackfillOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["admin", "emergency-event", eventId],
            });
            queryClient.invalidateQueries({ queryKey: ["admin", "safety", "ledger"] });
            queryClient.invalidateQueries({
              queryKey: ["admin", "unregistered-persons"],
            });
          }}
        />
      )}

      <SafetyJourneyDrawer
        subject={journeySubject}
        onClose={() => setJourneySubject(null)}
      />
    </div>
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
