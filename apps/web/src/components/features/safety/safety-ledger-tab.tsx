"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  HelpCircle,
  History,
  Home,
  Layers,
  Phone,
  Printer,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { formatPhtDate, formatPhtDateTime, formatPhtTime } from "@/lib/format";
import type {
  EmergencyEventOut,
  SafetyLedgerPageOut,
} from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";
import { SafetyJourneyDrawer } from "./safety-journey-drawer";

interface SafetyLedgerTabProps {
  event: EmergencyEventOut | null;
  events: EmergencyEventOut[];
  onSelectEvent: (eventId: string) => void;
  canSeePii?: boolean;
}

export function SafetyLedgerTab({
  event,
  events,
  onSelectEvent,
}: SafetyLedgerTabProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "stream" | "areas" | "centers" | "unregistered"
  >("stream");

  // Filters
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [subjectTypeFilter, setSubjectTypeFilter] = React.useState<string>("all");
  const [areaFilter, setAreaFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [currentOnly, setCurrentOnly] = React.useState<boolean>(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Selected subject for journey inspection drawer
  const [selectedSubject, setSelectedSubject] = React.useState<{
    id: string;
    type: "registered_member" | "unregistered_person";
    name?: string;
  } | null>(null);

  // Safety Ledger API Query
  const ledgerQuery = useQuery({
    queryKey: [
      "admin",
      "safety",
      "ledger",
      event?.id,
      statusFilter,
      areaFilter,
      subjectTypeFilter,
      methodFilter,
      search,
      currentOnly,
      page,
    ],
    queryFn: () =>
      api
        .get<SafetyLedgerPageOut>("/admin/safety/ledger", {
          params: {
            event_id: event?.id,
            status: statusFilter !== "all" ? statusFilter : undefined,
            area_id: areaFilter !== "all" ? areaFilter : undefined,
            subject_type: subjectTypeFilter !== "all" ? subjectTypeFilter : undefined,
            set_method: methodFilter !== "all" ? methodFilter : undefined,
            search: search.trim() ? search.trim() : undefined,
            current_only: currentOnly,
            page,
            size: pageSize,
          },
        })
        .then((res) => res.data),
  });

  // Evacuation Centers Query for Center breakdown
  const evacCentersQuery = useQuery({
    queryKey: ["admin", "evac-centers"],
    queryFn: () =>
      api.get<PublicEvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });

  // Areas Query for Area filter
  const areasQuery = useQuery({
    queryKey: ["public", "area-stats"],
    queryFn: () =>
      api
        .get<{ areas: { area_id: string; area_name: string }[] }>("/public/area-stats")
        .then((r) => r.data),
  });

  const ledgerData = ledgerQuery.data;
  const summary = ledgerData?.summary;
  const items = ledgerData?.items ?? [];

  // Summary Metrics calculations
  const totalRegistered = summary?.registered_total.registered_members || 1;
  const safeTotal =
    (summary?.registered_total.safe_confirmed ?? 0) +
    (summary?.registered_total.safe_bulk ?? 0);
  const safePct = ((safeTotal / totalRegistered) * 100).toFixed(1);
  const needsRescueCount = summary?.registered_total.needs_rescue ?? 0;
  const unaccountedCount = summary?.registered_total.unaccounted ?? 0;
  const unregSafe = summary?.unregistered_safe ?? 0;
  const unregRescue = summary?.unregistered_needs_rescue ?? 0;

  // Export CSV generator
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error("No ledger items to export.");
      return;
    }
    const headers = [
      "Timestamp (PHT)",
      "Subject Type",
      "Full Name",
      "Role",
      "Household Ref",
      "Area",
      "Contact Number",
      "Safety Status",
      "Check-In Method",
      "Evacuation Center",
      "Recorded By",
      "Vulnerability Tags",
      "Is Current Status",
    ];

    const rows = items.map((item) => [
      `"${formatPhtDateTime(item.timestamp)}"`,
      `"${item.subject_type === "registered_member" ? "Registered Citizen" : "Unregistered Walk-In"}"`,
      `"${item.person_name}"`,
      `"${item.is_head ? "Household Head" : "Member"}"`,
      `"${item.household_reference_no ?? "—"}"`,
      `"${item.area_name ?? "—"}"`,
      `"${item.contact_number ?? "—"}"`,
      `"${item.status.toUpperCase()}"`,
      `"${item.set_method ?? "—"}"`,
      `"${item.evac_center_name ?? "Home / Shelter in Place"}"`,
      `"${item.set_by_name ?? "System / Self"}"`,
      `"${item.vulnerability_flags.join("; ")}"`,
      `"${item.is_current ? "Yes" : "Superseded"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `SAGIP_Safety_Ledger_${event?.name ?? "All_Events"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Safety Ledger CSV exported successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Banner & Operational Switcher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <History className="size-5 text-emerald-600" />
              Disaster Safety Ledger & Audit Log
            </h2>
            {event ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                  {event.name}
                </span>
                <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {event.type}
                </span>
                {event.is_active ? (
                  <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                    Live Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Concluded
                  </span>
                )}
              </div>
            ) : (
              <Badge tone="neutral">All Emergency Events Scope</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time audit stream of resident safety declarations, assisted check-ins, shelter triage, and rescue tickets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Quick Select */}
          <Select
            value={event?.id ?? "all"}
            onValueChange={(val) => onSelectEvent(val)}
          >
            <SelectTrigger className="h-9 w-fit min-w-[170px] rounded-xl border-slate-300 bg-slate-50 text-xs font-bold text-slate-800">
              <Calendar className="size-3.5 text-slate-500 mr-1.5" />
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent className="z-[3000] min-w-[240px] rounded-xl bg-white border-slate-200 shadow-lg">
              <SelectItem value="all" className="cursor-pointer py-2">
                <span className="font-semibold text-slate-800">All Emergency Events</span>
              </SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id} className="cursor-pointer py-2">
                  <span className="font-medium text-slate-900 truncate max-w-[170px]">{e.name}</span>
                  <span className="text-[10px] text-slate-400 ml-2">({e.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 rounded-xl border-slate-300 text-xs font-bold hover:bg-slate-50"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="h-9 gap-1.5 rounded-xl border-slate-300 text-xs font-bold hover:bg-slate-50"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* 2. 5 Executive KPI Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* KPI 1: Total Registered Safe */}
        <Card radius="lg" className="border-emerald-200/80 bg-emerald-50/30">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="size-4" />
              </span>
              <Badge tone="success">{safePct}% Safe</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-800 tabular-nums">{safeTotal}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {totalRegistered}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">Total Accounted Safe</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {summary?.registered_total.safe_confirmed ?? 0} verified · {summary?.registered_total.safe_bulk ?? 0} bulk
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Individually Verified */}
        <Card radius="lg" className="border-teal-200/80 bg-teal-50/30">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-800 border border-teal-200">
                <UserCheck className="size-4" />
              </span>
              <Badge tone="info">Confirmed</Badge>
            </div>
            <div>
              <span className="text-2xl font-black text-teal-800 tabular-nums">
                {summary?.registered_total.safe_confirmed ?? 0}
              </span>
              <h4 className="text-xs font-bold text-slate-800">Individually Confirmed</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Portal / Staff verified</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Priority Rescue Distress */}
        <Card radius="lg" className="border-rose-200/80 bg-rose-50/30">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <ShieldAlert className="size-4" />
              </span>
              <Badge tone={needsRescueCount > 0 ? "danger" : "neutral"}>
                {needsRescueCount > 0 ? "Priority Distress" : "Clear"}
              </Badge>
            </div>
            <div>
              <span className="text-2xl font-black text-rose-800 tabular-nums">{needsRescueCount}</span>
              <h4 className="text-xs font-bold text-slate-800">Needs Rescue</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Immediate triage queue</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Unaccounted / Pending */}
        <Card radius="lg" className="border-amber-200/80 bg-amber-50/30">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                <HelpCircle className="size-4" />
              </span>
              <Badge tone="warning">Pending</Badge>
            </div>
            <div>
              <span className="text-2xl font-black text-amber-800 tabular-nums">{unaccountedCount}</span>
              <h4 className="text-xs font-bold text-slate-800">Unaccounted</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Pending safety check</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Unregistered Walk-Ins (FR-SAF-013) */}
        <Card radius="lg" className="border-purple-200/80 bg-purple-50/30 col-span-2 sm:col-span-1">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
                <Users className="size-4" />
              </span>
              <Badge tone="info">FR-SAF-013</Badge>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-900 tabular-nums">{unregSafe + unregRescue}</span>
                <span className="text-xs text-purple-700 font-semibold">({unregSafe} safe)</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">Unregistered Walk-Ins</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Counted separately</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Sub-View Segmented Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1">
        <button
          onClick={() => {
            setActiveSubTab("stream");
            setPage(1);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "stream"
              ? "bg-[#064e3b] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Clock className="size-3.5 shrink-0" />
          <span>Live Check-In Stream & Audit</span>
        </button>

        <button
          onClick={() => setActiveSubTab("areas")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "areas"
              ? "bg-[#064e3b] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers className="size-3.5 shrink-0" />
          <span>Area Safety Progress</span>
        </button>

        <button
          onClick={() => setActiveSubTab("centers")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "centers"
              ? "bg-[#064e3b] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Building2 className="size-3.5 shrink-0" />
          <span>Evacuation Centers</span>
        </button>

        <button
          onClick={() => setActiveSubTab("unregistered")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "unregistered"
              ? "bg-[#064e3b] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Users className="size-3.5 shrink-0" />
          <span>Unregistered Walk-Ins</span>
        </button>
      </div>

      {/* 4. Sub-View Content */}

      {/* SUB-VIEW 1: LIVE CHECK-IN TIMELINE & AUDIT STREAM */}
      {activeSubTab === "stream" && (
        <div className="flex flex-col gap-4">
          {/* Multi-Faceted Filter & Search Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {/* Search input */}
              <div className="relative col-span-1 sm:col-span-2">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search resident name, HH ref no, phone, or center…"
                  className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="z-[3000] rounded-xl bg-white border-slate-200 shadow-lg">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="safe">Declared Safe</SelectItem>
                  <SelectItem value="needs_rescue">Needs Rescue</SelectItem>
                  <SelectItem value="unaccounted">Unaccounted</SelectItem>
                </SelectContent>
              </Select>

              {/* Subject Type Filter */}
              <Select
                value={subjectTypeFilter}
                onValueChange={(val) => {
                  setSubjectTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="All Citizens" />
                </SelectTrigger>
                <SelectContent className="z-[3000] rounded-xl bg-white border-slate-200 shadow-lg">
                  <SelectItem value="all">All Resident Types</SelectItem>
                  <SelectItem value="registered_member">Registered Citizens</SelectItem>
                  <SelectItem value="unregistered_person">Unregistered Walk-Ins</SelectItem>
                </SelectContent>
              </Select>

              {/* Area Filter */}
              <Select
                value={areaFilter}
                onValueChange={(val) => {
                  setAreaFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent className="z-[3000] rounded-xl bg-white border-slate-200 shadow-lg">
                  <SelectItem value="all">All Areas / Sitios</SelectItem>
                  {areasQuery.data?.areas.map((a) => (
                    <SelectItem key={a.area_id} value={a.area_id}>
                      {a.area_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Method Filter */}
              <Select
                value={methodFilter}
                onValueChange={(val) => {
                  setMethodFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent className="z-[3000] rounded-xl bg-white border-slate-200 shadow-lg">
                  <SelectItem value="all">All Check-in Methods</SelectItem>
                  <SelectItem value="self">Self-Reported (Portal)</SelectItem>
                  <SelectItem value="assisted">Admin / BHW Assisted</SelectItem>
                  <SelectItem value="household_bulk">Household Bulk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sub-options: Active only toggle & count */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={currentOnly}
                  onChange={(e) => {
                    setCurrentOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700">Show only latest / active status per person</span>
              </label>
              <span className="font-bold text-slate-600">
                {ledgerData?.total ?? 0} Recorded Check-in Events
              </span>
            </div>
          </div>

          {/* Ledger Activity Stream Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-[#064e3b] text-white uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp (PHT)</th>
                    <th className="px-4 py-3.5">Resident / Walk-In</th>
                    <th className="px-4 py-3.5">Household & Area</th>
                    <th className="px-4 py-3.5 text-center">Safety Status</th>
                    <th className="px-4 py-3.5 text-center">Method</th>
                    <th className="px-4 py-3.5">Shelter Location</th>
                    <th className="px-4 py-3.5">Recorded By</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ledgerQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <span className="text-xs font-semibold">Loading safety audit stream…</span>
                        </div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <HelpCircle className="size-8 text-slate-300" />
                          <p className="text-sm font-bold text-slate-700">No safety declarations found</p>
                          <p className="text-xs text-slate-400">Try clearing filters or search keywords.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const subjectId = item.member_id || item.unregistered_person_id;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Timestamp */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatPhtTime(item.timestamp)}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {formatPhtDate(item.timestamp)}
                              </span>
                            </div>
                          </td>

                          {/* Resident Name & Demographics */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
                                {item.person_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate max-w-[180px]">
                                    {item.person_name}
                                  </span>
                                  {item.is_head && (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1 py-0.2 text-[9px] font-bold uppercase text-emerald-800 border border-emerald-200">
                                      Head
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] text-slate-400">
                                    {item.subject_type === "registered_member" ? "Citizen" : "Walk-in"}
                                  </span>
                                  {item.vulnerability_flags.slice(0, 2).map((flag) => (
                                    <span
                                      key={flag}
                                      className="inline-flex items-center rounded bg-rose-50 px-1 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200"
                                    >
                                      {flag.replace("is_", "").replace("has_", "").slice(0, 7)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Household & Area */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              {item.household_reference_no ? (
                                <span className="font-semibold text-slate-800">{item.household_reference_no}</span>
                              ) : (
                                <span className="text-slate-400 font-normal">No household</span>
                              )}
                              <span className="text-[10px] text-slate-500 font-medium">{item.area_name ?? "—"}</span>
                            </div>
                          </td>

                          {/* Triage Status */}
                          <td className="px-4 py-3 text-center">
                            {item.status === "safe" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                                <CheckCircle2 className="size-3" />
                                Safe
                              </span>
                            ) : item.status === "needs_rescue" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                                <ShieldAlert className="size-3" />
                                Rescue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                <HelpCircle className="size-3" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Method */}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                              {item.set_method ? item.set_method.replace("_", " ") : "Assisted"}
                            </span>
                          </td>

                          {/* Shelter Location */}
                          <td className="px-4 py-3">
                            {item.evac_center_name ? (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <Building2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span className="font-semibold truncate max-w-[170px]">{item.evac_center_name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Home className="size-3.5 text-slate-300 shrink-0" />
                                <span className="text-[11px]">Home / In Place</span>
                              </div>
                            )}
                          </td>

                          {/* Recorded By */}
                          <td className="px-4 py-3">
                            <span className="text-slate-700 font-medium">{item.set_by_name ?? "Portal Resident"}</span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            {subjectId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setSelectedSubject({
                                    id: subjectId,
                                    type: item.subject_type,
                                    name: item.person_name,
                                  })
                                }
                                className="h-7 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 gap-1 rounded-lg"
                              >
                                <Eye className="size-3.5" />
                                <span>Journey</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {ledgerData && ledgerData.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs">
                <span className="text-slate-500">
                  Showing page <strong className="text-slate-800">{ledgerData.page}</strong> of{" "}
                  <strong className="text-slate-800">{ledgerData.pages}</strong> ({ledgerData.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg border-slate-300 text-xs font-bold"
                  >
                    <ChevronLeft className="size-3.5 mr-1" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= ledgerData.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 px-2.5 rounded-lg border-slate-300 text-xs font-bold"
                  >
                    Next
                    <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: AREA SAFETY PROGRESS & BREAKDOWN */}
      {activeSubTab === "areas" && summary && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Area Safety Ledger & Coverage</h3>
              <p className="text-xs text-slate-500">
                Detailed real-time safety status distribution across all barangay administrative areas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Registered Coverage:</span>
              <Badge tone={Number(safePct) >= 80 ? "success" : Number(safePct) >= 50 ? "warning" : "danger"}>
                {safePct}% Safe
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-[#064e3b] text-white uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3.5">Area</th>
                  <th className="px-4 py-3.5 text-center">Registered Population</th>
                  <th className="px-4 py-3.5 text-center">Confirmed Safe</th>
                  <th className="px-4 py-3.5 text-center">Household Safe</th>
                  <th className="px-4 py-3.5 text-center">Needs Rescue</th>
                  <th className="px-4 py-3.5 text-center">Unaccounted</th>
                  <th className="px-5 py-3.5">Safety Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.registered.map((area) => {
                  const areaReg = area.registered_members || 1;
                  const safeCount = area.safe_confirmed + area.safe_bulk;
                  const safeRatio = Math.min(100, Math.round((safeCount / areaReg) * 100));
                  const rescueRatio = Math.min(100, Math.round((area.needs_rescue / areaReg) * 100));
                  const unaccountedRatio = Math.max(0, 100 - safeRatio - rescueRatio);

                  return (
                    <tr key={area.area_id ?? area.area_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{area.area_name}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-800 tabular-nums">
                        {area.registered_members}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-600 tabular-nums">
                        {area.safe_confirmed}
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-teal-600 tabular-nums">
                        {area.safe_bulk}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-rose-600 tabular-nums">
                        {area.needs_rescue > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-700 border border-rose-200">
                            <AlertTriangle className="size-3 text-rose-600" />
                            {area.needs_rescue}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">{area.unaccounted}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 w-44">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                            <div
                              style={{ width: `${safeRatio}%` }}
                              className="bg-emerald-500 transition-all duration-500"
                              title={`Safe: ${safeRatio}%`}
                            />
                            <div
                              style={{ width: `${rescueRatio}%` }}
                              className="bg-rose-500 transition-all duration-500"
                              title={`Rescue: ${rescueRatio}%`}
                            />
                            <div
                              style={{ width: `${unaccountedRatio}%` }}
                              className="bg-amber-400/80 transition-all duration-500"
                              title={`Unaccounted: ${unaccountedRatio}%`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                            <span className="text-emerald-700">{safeRatio}% safe</span>
                            {area.needs_rescue > 0 && (
                              <span className="text-rose-600 font-bold">{area.needs_rescue} rescue</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: EVACUATION CENTER REAL-TIME CAPACITY */}
      {activeSubTab === "centers" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evacCentersQuery.data?.map((c) => {
            const cap = c.capacity ?? 0;
            const capPct = cap > 0 ? Math.round((c.occupancy / cap) * 100) : 0;
            return (
              <Card key={c.id} radius="lg" className="border-slate-200 bg-white hover:shadow-md transition-all">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{c.facility.name}</h4>
                        <span className="text-[11px] text-slate-400">{c.facility.address ?? "Barangay San Jose"}</span>
                      </div>
                    </div>
                    {c.is_open ? (
                      <Badge tone="success">Open</Badge>
                    ) : (
                      <Badge tone="neutral">Closed</Badge>
                    )}
                  </div>

                  {/* Occupancy Meter */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Occupancy</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {c.occupancy} / {c.capacity ?? "∞"} ({capPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${Math.min(100, capPct)}%` }}
                        className={`h-full transition-all duration-500 ${
                          capPct >= 90 ? "bg-rose-500" : capPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  {c.contact_number && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <Phone className="size-3 text-slate-400" />
                      <span>{c.contact_number}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* SUB-VIEW 4: UNREGISTERED PERSONS SEPARATE LEDGER (FR-SAF-013) */}
      {activeSubTab === "unregistered" && (
        <Card radius="lg" className="border-amber-200/80 bg-amber-50/40">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                  <Users className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-900">
                      Unregistered Persons Ledger (FR-SAF-013)
                    </h3>
                    <Badge tone="warning">Counted Separately</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Unregistered individuals and field walk-ins are tracked separately to preserve official registry coverage statistics.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-white px-4 py-2.5 border border-amber-200/70 shadow-sm shrink-0">
                <div className="text-center">
                  <span className="block text-xs font-semibold text-slate-500">Walk-In Safe</span>
                  <span className="text-base font-bold text-emerald-600">{unregSafe}</span>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div className="text-center">
                  <span className="block text-xs font-semibold text-slate-500">Needs Rescue</span>
                  <span className="text-base font-bold text-rose-600">{unregRescue}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resident Safety Journey Slide-Over Drawer */}
      <SafetyJourneyDrawer
        subject={selectedSubject}
        onClose={() => setSelectedSubject(null)}
      />
    </div>
  );
}
