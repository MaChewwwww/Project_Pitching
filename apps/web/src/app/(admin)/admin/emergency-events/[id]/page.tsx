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
  { ssr: false, loading: () => <WorkspaceLoading label="Loading spatial response map…" /> },
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
      api.get<EmergencyEventDetailOut>(`/admin/emergency-events/${eventId}`).then((r) => r.data),
  });

  // 2. Fetch workspace data (for map and households stats)
  const workspaceQuery = useQuery({
    queryKey: ["admin", "emergency-workspace", eventId],
    queryFn: () =>
      api.get<EmergencyWorkspaceOut>(`/admin/emergency-events/${eventId}/workspace`).then((r) => r.data),
    enabled: canSeePii,
  });

  // 3. Fetch Safety Ledger entries
  const ledgerQuery = useQuery({
    queryKey: ["admin", "safety", "ledger", eventId, ledgerStatusFilter, ledgerAreaFilter],
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
    queryFn: () => api.get<PublicEvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
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
          <p className="text-sm font-semibold text-slate-700">Loading comprehensive event dossier…</p>
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
          <Button asChild className="mt-5 rounded-xl bg-slate-900 text-white font-bold text-xs">
            <Link href="/admin/emergency-events?tab=events">
              <ArrowLeft className="size-4 mr-2" /> Back to Emergency Events Directory
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Hero Incident Context Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#032e23] via-[#054333] to-[#085a44] p-6 sm:p-7 text-white shadow-md border border-emerald-800/40">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-950 shadow-lg ring-4 ring-white/10">
              {getHazardIcon(event.type)}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {event.is_active ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm border border-rose-400/40">
                    <span className="relative flex size-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-white" />
                    </span>
                    LIVE INCIDENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 text-slate-300 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-slate-700">
                    <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                    CONCLUDED & ARCHIVED
                  </span>
                )}

                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 bg-white/10 text-white">
                  {event.type}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-bold ml-1">
                  <Clock className="size-3.5 text-emerald-300 shrink-0" />
                  <span>Duration: {formatDuration(event.started_at, event.ended_at)}</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {event.name}
              </h1>

              <p className="text-xs text-emerald-200/90 flex flex-wrap items-center gap-2">
                <span>Declared: {new Date(event.started_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                {event.ended_at && (
                  <>
                    <span>·</span>
                    <span>Concluded: {new Date(event.ended_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
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

          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t border-emerald-800/40 lg:border-t-0">
            <div className="rounded-xl bg-black/25 backdrop-blur-md px-4 py-2 border border-white/10 text-right">
              <span className="block text-[10px] uppercase font-bold text-emerald-300/80">
                Audit Record ID
              </span>
              <span className="text-xs font-mono font-bold text-white truncate max-w-[200px] block">
                {event.id}
              </span>
            </div>

            {canManage ? (
              <Button
                onClick={() => setEditOpen(true)}
                size="sm"
                className="h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs gap-1.5 shadow-sm backdrop-blur-md cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Pencil className="size-3.5 text-emerald-200" />
                <span>Edit Event</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Top 5 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Safety & Check-in Rate */}
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Safety Confirmations
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-950">
              {stats?.total_safe_count ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium ml-1">
              / {stats?.total_checkins_count ?? 0} logged
            </span>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Evacuees Sheltered
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-800">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-950">
              {stats?.total_evacuees_count ?? 0}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Across {stats?.active_centers_used ?? 0} evacuation centers
            </p>
          </div>
        </div>

        {/* Metric 3: Rescue Operations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Rescue Queue
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-rose-100 text-rose-800">
              <LifeBuoy className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {stats?.open_rescue_requests_count ?? 0}
              </span>
              <span className="text-xs text-rose-600 font-bold">active</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {stats?.total_rescue_requests_count ?? 0} total requests triaged
            </p>
          </div>
        </div>

        {/* Metric 4: Field Hazard Incidents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Field Hazard Reports
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-950">
              {stats?.total_incident_reports_count ?? 0}
            </span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {stats?.verified_incident_reports_count ?? 0} verified by officers
            </p>
          </div>
        </div>

        {/* Metric 5: Unregistered Walk-Ins */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Walk-in Persons
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-teal-100 text-teal-800">
              <UserPlus className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-950">
              {stats?.total_unregistered_count ?? 0}
            </span>
            <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
              Handled during emergency
            </p>
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Dossier Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
          <div role="tablist" className="flex min-w-max p-1 gap-1">
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
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isSelected ? "text-emerald-700" : "text-slate-400")} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Safety & Check-in Ledger */}
        {currentTab === "ledger" ? (
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <CheckCircle2 className="size-4.5 text-emerald-600" />
                  Disaster Safety Check-in Stream & Audit Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete chronological audit of every safety confirmation, self check-in, and BHW field assessment for this emergency.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setBackfillOpen(true)}
                  className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Backfill Safety Entry</span>
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resident name, household ref, area, or notes..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <select
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs shrink-0 max-sm:w-full"
              >
                <option value="all">All Safety Statuses</option>
                <option value="safe">Safe Only</option>
                <option value="needs_rescue">Needs Rescue Only</option>
                <option value="unaccounted">Unaccounted Only</option>
              </select>

              <select
                value={ledgerAreaFilter}
                onChange={(e) => setLedgerAreaFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs shrink-0 max-sm:w-full"
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
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#04281e] text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp (PHT)</th>
                    <th className="py-3 px-4">Resident / Subject</th>
                    <th className="py-3 px-4">Household & Area</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Method & Source</th>
                    <th className="py-3 px-4">Location / Shelter</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ledgerQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Loading safety check-in records…
                      </td>
                    </tr>
                  ) : filteredLedgerItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No check-in entries found for this emergency event.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString("en-PH", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(item.timestamp).toLocaleDateString("en-PH", {
                              dateStyle: "medium",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
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
                        <td className="py-3 px-4 text-slate-600">
                          {item.household_reference_no ? (
                            <span className="font-semibold text-slate-900 block">
                              {item.household_reference_no}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unregistered</span>
                          )}
                          <span className="text-[11px] text-slate-500">{item.area_name ?? "Area Unassigned"}</span>
                        </td>
                        <td className="py-3 px-4">
                          {item.status === "safe" ? (
                            <Badge tone="success" className="font-bold text-[10px] uppercase">
                              Safe
                            </Badge>
                          ) : item.status === "needs_rescue" ? (
                            <Badge tone="danger" className="font-black text-[10px] uppercase animate-pulse">
                              Rescue
                            </Badge>
                          ) : (
                            <Badge tone="warning" className="font-bold text-[10px] uppercase">
                              Unaccounted
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-700">
                          <span className="font-medium">{item.set_method?.replace("_", " ") ?? "Assisted"}</span>
                          {item.notes && (
                            <span className="block text-[10px] text-slate-500 truncate max-w-[140px]" title={item.notes}>
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.evac_center_name ? (
                            <span className="font-semibold text-sky-800 flex items-center gap-1">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate max-w-[140px]">{item.evac_center_name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Home / Safe Place</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {item.set_by_name ?? "System / Resident"}
                        </td>
                        <td className="py-3 px-4 text-right">
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
                            className="h-7 px-2 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="size-3 mr-1" /> Journey
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
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Building2 className="size-4.5 text-sky-600" />
                  Evacuation Center Shelter Operations & Capacity
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shelter occupancies, center manifests, and resident check-in logs during this emergency.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(evacCentersQuery.data ?? []).map((center) => {
                const occupancy = center.occupancy ?? 0;
                const capacity = center.capacity ?? 0;
                const pct = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
                return (
                  <div
                    key={center.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4.5 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {center.facility.name}
                        </span>
                        <Badge tone={center.is_open ? "success" : "neutral"} className="text-[10px] font-bold">
                          {center.is_open ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        <span>{center.facility.address || center.facility.area_name}</span>
                      </p>

                      <div className="mt-4">
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">Current Occupancy</span>
                          <span className="font-black text-slate-900">
                            {occupancy} / {capacity || "Unlimited"}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
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
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <LifeBuoy className="size-4.5 text-rose-600" />
                  Emergency Rescue Queue & Dispatch Triage
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Citizen rescue distress calls and emergency dispatches logged during this event.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#04281e] text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Requester Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Location / Note</th>
                    <th className="py-3 px-4">People</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Officer</th>
                    <th className="py-3 px-4">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(rescuesQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No rescue calls recorded during this emergency event.
                      </td>
                    </tr>
                  ) : (
                    (rescuesQuery.data ?? []).map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide border shadow-2xs",
                              (req.priority ?? 3) >= 5
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : (req.priority ?? 3) === 4
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : (req.priority ?? 3) === 3
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200",
                            )}
                            title={`Triage Urgency: Priority ${req.priority ?? 3} of 5`}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full shrink-0",
                                (req.priority ?? 3) >= 5
                                  ? "bg-rose-600 animate-pulse"
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
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {req.requester_name}
                          {req.household_reference_no && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              HH: {req.household_reference_no}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{req.contact_number ?? "—"}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={req.location_note ?? req.description}>
                          {req.location_note ?? req.description}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{req.people_count ?? 1}</td>
                        <td className="py-3 px-4">
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
                            className="text-[10px] uppercase font-bold"
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {req.assigned_to_name ?? "Unassigned"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate" title={req.resolution_note ?? ""}>
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
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <AlertTriangle className="size-4.5 text-amber-600" />
                  Field Hazard & Damage Incident Reports
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Citizen hazard reports, fallen trees, flooded roads, and power infrastructure issues.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(incidentsQuery.data ?? []).length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                  No field hazard reports filed for this event.
                </div>
              ) : (
                (incidentsQuery.data ?? []).map((inc) => (
                  <div
                    key={inc.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone="warning" className="text-[10px] uppercase font-bold">
                          {inc.type.replace("_", " ")}
                        </Badge>
                        <Badge
                          tone={inc.status === "verified" ? "success" : inc.status === "dismissed" ? "neutral" : "danger"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {inc.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-800 font-semibold mt-2.5 line-clamp-3">
                        {inc.description}
                      </p>

                      {inc.location_note && (
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="size-3 shrink-0 text-slate-400" />
                          <span className="truncate">{inc.location_note}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Reported by {inc.reported_by_name ?? "Citizen"}</span>
                      <span>{new Date(inc.created_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* Tab 5: Spatial Response Map */}
        {currentTab === "map" && canSeePii ? (
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Map className="size-4.5 text-emerald-600" />
                  Spatial Response & Hazard Map
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private geographic distribution of affected households, evacuation centers, and field pins.
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
          <div className="p-5 sm:p-6 flex flex-col gap-6">
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-teal-50/40 to-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-teal-700" />
                  Offline Roster & Paper Manifest Ingestion Center
                </span>
                <h3 className="text-lg font-black text-slate-950 mt-1">
                  Post-Blackout Data Ingestion Hub
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  When electrical power or cellular data is restored after a disaster blackout, enter physical paper sign-in sheets, BHW field logs, and retroactive check-ins directly into the verified platform ledger.
                </p>
              </div>

              <Button
                onClick={() => setBackfillOpen(true)}
                className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shrink-0 gap-1.5"
              >
                <Plus className="size-4" />
                <span>Launch Backfill Wizard</span>
              </Button>
            </div>

            {/* Backfill Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <UserCheck className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    1. Household Safety Logs
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Input door-to-door verification sheets with retroactive timestamps.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-800 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <UserPlus className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    2. Unregistered Walk-Ins
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Log displaced non-residents and transient evacuees.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-800 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Building2 className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    3. Evacuation Manifests
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Digitize paper logbooks from school gymnasiums & covered courts.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between cursor-pointer group"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    4. Blackout Incident Reports
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
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
            queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", eventId] });
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
            queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "safety", "ledger"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] });
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
