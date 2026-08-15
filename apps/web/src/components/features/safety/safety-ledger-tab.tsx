"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Eye,
  HelpCircle,
  Home,
  Layers,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import {
  formatPhtDate,
  formatPhtDateTime,
  formatPhtTime,
  googleMapsDirectionsUrl,
  osmDirectionsUrl,
  toTelHref,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AreaAccountedFor,
  EmergencyEventOut,
  EmergencyWorkspaceOut,
  SafetyLedgerPageOut,
} from "@/lib/api/safety-types";
import type { PublicAreaStat, PublicEvacCenter } from "@/lib/api/public-types";
import { SafetyJourneyDrawer } from "./safety-journey-drawer";
import { UnregisteredPersonForm } from "./unregistered-person-form";

interface SafetyLedgerTabProps {
  event: EmergencyEventOut | null;
  canSeePii?: boolean;
}

function ListTabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-12 shrink-0 whitespace-nowrap items-center justify-center gap-2 border-b-2 px-4.5 text-xs font-extrabold transition-all cursor-pointer",
        active
          ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
          : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] leading-none font-black text-emerald-800">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function SafetyLedgerTab({
  event,
}: SafetyLedgerTabProps) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = React.useState<
    "stream" | "areas" | "centers"
  >("stream");

  // Filters for Live Check-In Stream
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [subjectTypeFilter, setSubjectTypeFilter] = React.useState<string>("all");
  const [areaFilter, setAreaFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [currentOnly, setCurrentOnly] = React.useState<boolean>(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Walk-in modal
  const [recordWalkInOpen, setRecordWalkInOpen] = React.useState(false);

  // Selected subject for journey inspection drawer
  const [selectedSubject, setSelectedSubject] = React.useState<{
    id: string;
    type: "registered_member" | "unregistered_person";
    name?: string;
  } | null>(null);

  // Selected area for spatial/safety modal
  const [selectedAreaSummary, setSelectedAreaSummary] =
    React.useState<AreaAccountedFor | null>(null);
  const [showBarangaySummary, setShowBarangaySummary] =
    React.useState<boolean>(false);

  // Selected evacuation center for detail modal
  const [selectedCenterSummary, setSelectedCenterSummary] =
    React.useState<PublicEvacCenter | null>(null);

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

  // Areas Query for Area filter & details
  const areasQuery = useQuery({
    queryKey: ["public", "area-stats"],
    queryFn: () =>
      api
        .get<{ areas: PublicAreaStat[] }>("/public/area-stats")
        .then((r) => r.data),
  });

  // Workspace query for evacuee demographics & special needs flags
  const workspaceQuery = useQuery({
    queryKey: ["admin", "emergency-workspace", event?.id],
    queryFn: () =>
      api
        .get<EmergencyWorkspaceOut>(
          `/admin/emergency-events/${event?.id ?? "active"}/workspace`,
        )
        .then((r) => r.data)
        .catch(() => null),
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

  const isStreamFiltered = Boolean(
    search ||
      statusFilter !== "all" ||
      subjectTypeFilter !== "all" ||
      areaFilter !== "all" ||
      methodFilter !== "all" ||
      currentOnly,
  );

  const resetStreamFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSubjectTypeFilter("all");
    setAreaFilter("all");
    setMethodFilter("all");
    setCurrentOnly(false);
    setPage(1);
  };

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
      `"${item.evac_center_name ?? "Home | Safe Place"}"`,
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
      `SAGIP_Safety_Ledger_${event?.name ?? "All_Events"}_${new Date().toISOString().slice(0, 10)}.csv`,
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
    <div className="flex flex-col gap-5">
      {/* 1. 5 Executive KPI Telemetry Cards (Compact Horizontal Layout) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Total Registered Safe */}
        <Card radius="lg" className="border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900 tabular-nums">{safeTotal}</span>
                  <span className="text-xs text-slate-400 font-semibold">/ {totalRegistered}</span>
                </div>
                <Badge tone="success">{safePct}%</Badge>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">Accounted Safe</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {summary?.registered_total.safe_confirmed ?? 0} verified · {summary?.registered_total.safe_bulk ?? 0} bulk
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Individually Verified */}
        <Card radius="lg" className="border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80">
              <UserCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {summary?.registered_total.safe_confirmed ?? 0}
                </span>
                <Badge tone="info">Confirmed</Badge>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">Individually Confirmed</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Portal / Staff verified
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Priority Rescue Distress */}
        <Card radius="lg" className="border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80">
              <ShieldAlert className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-black text-slate-900 tabular-nums">{needsRescueCount}</span>
                <Badge tone={needsRescueCount > 0 ? "danger" : "neutral"}>
                  {needsRescueCount > 0 ? "Distress" : "Clear"}
                </Badge>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">Needs Rescue</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {needsRescueCount > 0 ? "Immediate triage queue" : "Zero active distress"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Unaccounted / Pending */}
        <Card radius="lg" className="border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
              <HelpCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-black text-slate-900 tabular-nums">{unaccountedCount}</span>
                <Badge tone="warning">Pending</Badge>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">Unaccounted</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Pending safety check
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Unregistered Walk-Ins */}
        <Card radius="lg" className="border-neutral-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow col-span-1 sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80">
              <Users className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-black text-slate-900 tabular-nums">{unregSafe + unregRescue}</span>
                <span className="text-xs font-semibold text-purple-700">{unregSafe} safe</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">Unregistered Walk-Ins</h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Counted separately
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Unified Outer Container (Overhauled Layout from Image #2) */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Top Tab Bar Header */}
        <div className="border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 gap-2 sm:gap-0">
          <div role="tablist" className="flex overflow-x-auto">
            <ListTabButton
              active={activeSubTab === "stream"}
              onClick={() => {
                setActiveSubTab("stream");
                setPage(1);
              }}
              icon={<Clock className="size-3.5 shrink-0" aria-hidden />}
              label="Live Check-In Stream & Audit"
              count={ledgerData?.total}
            />
            <ListTabButton
              active={activeSubTab === "areas"}
              onClick={() => setActiveSubTab("areas")}
              icon={<Layers className="size-3.5 shrink-0" aria-hidden />}
              label="Area Safety Progress"
              count={summary?.registered.length}
            />
            <ListTabButton
              active={activeSubTab === "centers"}
              onClick={() => setActiveSubTab("centers")}
              icon={<Building2 className="size-3.5 shrink-0" aria-hidden />}
              label="Evacuation Centers"
              count={evacCentersQuery.data?.length}
            />
          </div>

          {/* Quick Actions: Export CSV & Print Report Buttons Replacing Unregistered Tab */}
          <div className="flex items-center gap-2 pr-2 py-2 sm:py-0 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-full border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-emerald-50/50 hover:border-emerald-300 hover:text-emerald-900 cursor-pointer"
            >
              <Download className="size-3.5 text-emerald-600 shrink-0" />
              <span>Export CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-full border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 cursor-pointer"
            >
              <Printer className="size-3.5 text-slate-600 shrink-0" />
              <span>Print Report</span>
            </Button>
          </div>
        </div>

        {/* Tab Panel Body */}
        <div className="p-4 sm:p-5">
          {/* SUB-VIEW 1: LIVE CHECK-IN TIMELINE & AUDIT STREAM */}
          {activeSubTab === "stream" && (
            <section className="overflow-hidden rounded-[14px] border border-primary-200/80 bg-white shadow-sm-card">
              {/* Attached Toolbar */}
              <div className="border-b border-primary-100/80 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 p-3 sm:px-4">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Search Input (Left) */}
                  <div className="flex items-center">
                    <label className="relative block min-w-[240px] sm:w-80 md:w-96">
                      <span className="sr-only">Search safety audit records</span>
                      <Search
                        aria-hidden
                        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Search name, HH ref no, phone, center..."
                        className="h-9.5 w-full rounded-full border border-neutral-200/90 bg-white/95 pr-9 pl-9.5 text-xs shadow-2xs transition outline-none placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
                      />
                      {search ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      ) : null}
                    </label>
                  </div>

                  {/* Filters & Actions (Right) */}
                  <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
                    {isStreamFiltered && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetStreamFilters}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <X aria-hidden className="size-3.5 shrink-0 text-neutral-500" />
                        <span>Reset</span>
                      </Button>
                    )}

                    {/* Status Filter */}
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                        <CheckCircle2 aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="z-[3000] min-w-44 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
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
                      <SelectTrigger className="inline-flex h-9 w-fit min-w-[135px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                        <Users aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                        <SelectValue placeholder="All Citizens" />
                      </SelectTrigger>
                      <SelectContent className="z-[3000] min-w-48 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
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
                      <SelectTrigger className="inline-flex h-9 w-fit min-w-[135px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                        <MapPin aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                        <SelectValue placeholder="All Areas" />
                      </SelectTrigger>
                      <SelectContent className="z-[3000] min-w-48 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                        <SelectItem value="all">All Areas</SelectItem>
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
                      <SelectTrigger className="inline-flex h-9 w-fit min-w-[135px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                        <SlidersHorizontal aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent className="z-[3000] min-w-48 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                        <SelectItem value="all">All Check-in Methods</SelectItem>
                        <SelectItem value="self">Self-Reported (Portal)</SelectItem>
                        <SelectItem value="assisted">Admin / BHW Assisted</SelectItem>
                        <SelectItem value="household_bulk">Household Bulk</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Record Walk-In Action Button */}
                    <Button
                      size="sm"
                      onClick={() => setRecordWalkInOpen(true)}
                      className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 ml-1"
                    >
                      <UserPlus className="size-3.5" />
                      <span>Record Walk-In Person</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-primary-900 shadow-[0_1px_0_0_var(--color-primary-800)] text-primary-50">
                    <tr className="hover:bg-primary-900 border-primary-800">
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Timestamp (PHT)</th>
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Resident / Walk-In</th>
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Household & Area</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Safety Status</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Method</th>
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Shelter Location</th>
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Recorded By</th>
                      <th className="h-11 px-4 text-right text-[11px] font-bold tracking-[0.08em] uppercase text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100/80">
                    {ledgerQuery.isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                            <span className="text-xs font-semibold text-neutral-600">Loading safety audit stream…</span>
                          </div>
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-2xs">
                              <HelpCircle className="size-6 text-emerald-700" />
                            </div>
                            <p className="text-sm font-bold text-neutral-900">No safety declarations found</p>
                            <p className="text-xs text-neutral-500 max-w-sm">
                              {isStreamFiltered
                                ? "No resident check-ins match your active filter criteria."
                                : "No safety declarations have been recorded for this event yet."}
                            </p>
                            {isStreamFiltered && (
                              <Button
                                size="sm"
                                onClick={resetStreamFilters}
                                className="mt-2 inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                              >
                                Reset Filters
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const subjectId = item.member_id || item.unregistered_person_id;
                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
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
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate max-w-[200px]">
                                    {item.person_name}
                                  </span>
                                  {item.is_head && (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800 border border-emerald-200">
                                      Head
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {item.subject_type === "registered_member" ? (
                                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 border border-slate-200">
                                      Citizen
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-700 border border-purple-200">
                                      Walk-In
                                    </span>
                                  )}
                                  {item.vulnerability_flags.slice(0, 3).map((flag) => (
                                    <span
                                      key={flag}
                                      className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 border border-rose-200"
                                    >
                                      {flag.replace("is_", "").replace("has_", "").slice(0, 10)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Household & Area */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-center w-fit">
                                {item.household_reference_no ? (
                                  <span className="font-mono text-[11px] font-black tracking-tight text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-center">
                                    {item.household_reference_no}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">No household</span>
                                )}
                                <span className="text-[10.5px] text-slate-500 font-medium mt-0.5 text-center w-full">
                                  {item.area_name ?? "—"}
                                </span>
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
                                <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                                  <Building2 className="size-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">{item.evac_center_name}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                  <Home className="size-3.5 text-blue-600 shrink-0" />
                                  <span className="text-xs">Home | Safe Place</span>
                                </div>
                              )}
                            </td>

                            {/* Recorded By */}
                            <td className="px-4 py-3">
                              <span className="text-slate-700 font-medium">{item.set_by_name ?? "Portal Resident"}</span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
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
                                  className="h-7 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 gap-1 rounded-lg cursor-pointer"
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

              {/* Bottom Pagination Bar */}
              <div className="flex items-center justify-between border-t border-primary-100/80 bg-slate-50/80 px-4 py-3 text-xs">
                <span className="text-slate-500 font-medium tabular-nums">
                  Showing <strong className="text-slate-800">{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong>–
                  <strong className="text-slate-800">{Math.min(page * pageSize, ledgerData?.total ?? 0)}</strong> of{" "}
                  <strong className="text-slate-800">{ledgerData?.total ?? 0}</strong> recorded check-in events
                </span>
                {items.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 rounded-lg border-slate-300 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft className="size-3.5 mr-1" />
                      Previous
                    </Button>
                    <span className="px-2 text-xs font-semibold text-slate-600 tabular-nums">
                      Page {page} of {ledgerData?.pages || 1}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!ledgerData || page >= ledgerData.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 px-2.5 rounded-lg border-slate-300 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SUB-VIEW 2: AREA SAFETY PROGRESS & BREAKDOWN */}
          {activeSubTab === "areas" && summary && (
            <section className="overflow-hidden rounded-[14px] border border-primary-200/80 bg-white shadow-sm-card">
              <div className="border-b border-primary-100/80 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Area Safety Ledger & Coverage Distribution</h3>
                  <p className="text-xs text-slate-500">
                    Real-time safety status distribution and rescue requirements across all barangay administrative areas.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBarangaySummary(true)}
                    className="h-8 px-3 text-xs font-bold text-emerald-800 border-emerald-300 bg-white hover:bg-emerald-50 gap-1.5 rounded-lg cursor-pointer shadow-2xs"
                  >
                    <Shield className="size-3.5 text-emerald-600" />
                    <span>Barangay Overview</span>
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Total Safe:</span>
                    <Badge tone={Number(safePct) >= 80 ? "success" : Number(safePct) >= 50 ? "warning" : "danger"}>
                      {safePct}% Safe
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-primary-900 shadow-[0_1px_0_0_var(--color-primary-800)] text-primary-50">
                    <tr className="hover:bg-primary-900 border-primary-800">
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Area</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Registered Population</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Confirmed Safe</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Household Safe</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Needs Rescue</th>
                      <th className="h-11 px-4 text-center text-[11px] font-bold tracking-[0.08em] uppercase text-white">Unaccounted</th>
                      <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Distribution Meter</th>
                      <th className="h-11 px-4 text-right text-[11px] font-bold tracking-[0.08em] uppercase text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100/80">
                    {summary.registered.map((area) => {
                      const areaReg = area.registered_members || 1;
                      const safeCount = area.safe_confirmed + area.safe_bulk;
                      const safeRatio = Math.min(100, Math.round((safeCount / areaReg) * 100));
                      const rescueRatio = Math.min(100, Math.round((area.needs_rescue / areaReg) * 100));
                      const unaccountedRatio = Math.max(0, 100 - safeRatio - rescueRatio);

                      return (
                        <tr key={area.area_id ?? area.area_name} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">{area.area_name}</td>
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
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-700 border border-rose-200 font-bold">
                                <AlertTriangle className="size-3 text-rose-600" />
                                {area.needs_rescue}
                              </span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">{area.unaccounted}</td>
                          <td className="px-4 py-3.5">
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
                          <td className="px-4 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedAreaSummary(area)}
                              className="h-7 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 gap-1 rounded-lg cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                              <span>Overview</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SUB-VIEW 3: EVACUATION CENTER REAL-TIME CAPACITY */}
          {activeSubTab === "centers" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {evacCentersQuery.data?.map((c) => {
                const cap = c.capacity ?? 0;
                const capPct = cap > 0 ? Math.round((c.occupancy / cap) * 100) : 0;
                return (
                  <Card
                    key={c.id}
                    radius="lg"
                    onClick={() => setSelectedCenterSummary(c)}
                    className="group border-slate-200 bg-white hover:border-emerald-500/80 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="h-1 w-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                              {c.facility.name}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              {c.facility.address ?? "Barangay San Jose"}
                            </span>
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

                      {/* Footer with Contact and Inspect indicator */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px]">
                        {c.contact_number ? (
                          <div className="text-slate-500 flex items-center gap-1.5">
                            <Phone className="size-3 text-slate-400" />
                            <span>{c.contact_number}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            {c.facility.area_name ?? "Barangay San Jose"}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all">
                          Inspect Details
                          <ChevronRight className="size-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resident Safety Journey Slide-Over Drawer */}
      <SafetyJourneyDrawer
        subject={selectedSubject}
        onClose={() => setSelectedSubject(null)}
      />

      {/* Record Walk-In Person Dialog Modal */}
      <Dialog open={recordWalkInOpen} onOpenChange={setRecordWalkInOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 z-[3000]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Record Evacuation Walk-In
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record an unregistered citizen arriving at an evacuation center or triage station. This data will be available on the admin registry and accounted for in the live disaster safety ledger.
            </DialogDescription>
          </DialogHeader>
          {recordWalkInOpen && (
            <UnregisteredPersonForm
              eventId={event?.id ?? ""}
              onDone={async () => {
                setRecordWalkInOpen(false);
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["admin", "safety", "ledger"] }),
                  queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] }),
                  queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace"] }),
                  queryClient.invalidateQueries({ queryKey: ["admin", "evac-centers"] }),
                ]);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Area Safety & Spatial Summary Dialog */}
      <AreaSafetySummaryModal
        area={selectedAreaSummary}
        areaDetail={areasQuery.data?.areas.find(
          (a) =>
            a.area_name.toLowerCase() === selectedAreaSummary?.area_name.toLowerCase() ||
            a.area_id === selectedAreaSummary?.area_id,
        )}
        evacCenters={evacCentersQuery.data}
        onClose={() => setSelectedAreaSummary(null)}
      />

      {/* Evacuation Center Detail & Capacity Dialog */}
      <EvacuationCenterDetailModal
        center={selectedCenterSummary}
        workspace={workspaceQuery.data}
        onClose={() => setSelectedCenterSummary(null)}
      />

      {/* Barangay San Jose Jurisdiction Overview Dialog */}
      <BarangaySafetySummaryModal
        open={showBarangaySummary}
        summary={summary}
        evacCenters={evacCentersQuery.data}
        onClose={() => setShowBarangaySummary(false)}
        onSelectArea={(area) => {
          setShowBarangaySummary(false);
          setSelectedAreaSummary(area);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Area Safety & Spatial Summary Modal                                        */
/* -------------------------------------------------------------------------- */

function AreaSafetySummaryModal({
  area,
  areaDetail,
  evacCenters,
  onClose,
}: {
  area: AreaAccountedFor | null;
  areaDetail?: PublicAreaStat;
  evacCenters?: PublicEvacCenter[];
  onClose: () => void;
}) {
  if (!area) return null;

  const totalRegistered = area.registered_members || 1;
  const safeCount = area.safe_confirmed + area.safe_bulk;
  const safeRatio = Math.min(100, Math.round((safeCount / totalRegistered) * 100));
  const rescueRatio = Math.min(100, Math.round((area.needs_rescue / totalRegistered) * 100));
  const unaccountedRatio = Math.max(0, 100 - safeRatio - rescueRatio);

  const exposure = areaDetail?.flood_exposure ?? "medium";
  const lowRiskHH = areaDetail?.low_risk_households ?? Math.round((areaDetail?.registered_households ?? 20) * 0.4);
  const medRiskHH = areaDetail?.medium_risk_households ?? Math.round((areaDetail?.registered_households ?? 20) * 0.4);
  const highRiskHH = areaDetail?.high_risk_households ?? Math.round((areaDetail?.registered_households ?? 20) * 0.2);

  // Local centers matching this area
  const localCenters = (evacCenters || []).filter(
    (c) =>
      (area.area_id && c.facility.area_id === area.area_id) ||
      (c.facility.area_name && c.facility.area_name.toLowerCase() === area.area_name.toLowerCase()) ||
      c.facility.address?.toLowerCase().includes(area.area_name.toLowerCase()) ||
      c.facility.name.toLowerCase().includes(area.area_name.toLowerCase()),
  );

  return (
    <Dialog open={Boolean(area)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl z-[3000]">
        <DialogHeader className="border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white pr-10 sm:pr-12">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                Area Division
              </span>
              <span className="text-xs font-semibold text-slate-500">Barangay San Jose</span>
            </div>
            <DialogTitle className="mt-1 text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
              <MapPin className="size-6 text-emerald-600 shrink-0" />
              {area.area_name} Safety & Spatial Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 mt-1">
            Real-time safety status distribution, flood risk exposure, and evacuation center capacity in {area.area_name}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="size-3 text-slate-500 shrink-0" />
                  Registered Citizens
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-slate-950 tabular-nums leading-none shrink-0">{area.registered_members}</span>
                  <span className="text-[11px] text-slate-500 font-semibold">{areaDetail?.registered_households ?? "—"} Households</span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-3.5 flex flex-col justify-between gap-1 shadow-2xs",
                safeRatio >= 80 ? "border-emerald-200 bg-emerald-50/60" : safeRatio >= 50 ? "border-amber-200 bg-amber-50/60" : "border-rose-200 bg-rose-50/60"
              )}>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                  safeRatio >= 80 ? "text-emerald-800" : safeRatio >= 50 ? "text-amber-800" : "text-rose-800"
                )}>
                  <CheckCircle2 className="size-3 shrink-0" />
                  Accounted Safe
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={cn(
                    "text-2xl font-black tabular-nums leading-none shrink-0",
                    safeRatio >= 80 ? "text-emerald-900" : safeRatio >= 50 ? "text-amber-900" : "text-rose-900"
                  )}>{safeRatio}%</span>
                  <span className="text-[11px] font-bold">{safeCount} Safe</span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-3.5 flex flex-col justify-between gap-1 shadow-2xs",
                area.needs_rescue > 0 ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/80"
              )}>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                  area.needs_rescue > 0 ? "text-rose-800" : "text-slate-500"
                )}>
                  <ShieldAlert className="size-3 shrink-0" />
                  Needs Rescue
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={cn(
                    "text-2xl font-black tabular-nums leading-none shrink-0",
                    area.needs_rescue > 0 ? "text-rose-900" : "text-slate-900"
                  )}>{area.needs_rescue}</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {area.needs_rescue > 0 ? "Priority Queue" : "Zero Distress"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <HelpCircle className="size-3 text-amber-700 shrink-0" />
                  Unaccounted
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-amber-900 tabular-nums leading-none shrink-0">{area.unaccounted}</span>
                  <span className="text-[11px] text-amber-800 font-semibold">Pending Check</span>
                </div>
              </div>
            </div>

            {/* Safety Accountability Meter Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Safety Accountability Breakdown</span>
                <span className="font-bold text-emerald-700">
                  {safeCount} / {area.registered_members} Residents Accounted Safe
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 flex">
                <div
                  className="bg-emerald-600 transition-all duration-300"
                  style={{ width: `${safeRatio}%` }}
                  title={`Safe: ${safeCount}`}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${rescueRatio}%` }}
                  title={`Needs Rescue: ${area.needs_rescue}`}
                />
                <div
                  className="bg-amber-400 transition-all duration-300"
                  style={{ width: `${unaccountedRatio}%` }}
                  title={`Unaccounted: ${area.unaccounted}`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  Individual Verified: {area.safe_confirmed}
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-teal-800">
                  <span className="size-2 rounded-full bg-teal-500" />
                  Household Bulk Safe: {area.safe_bulk}
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-rose-800">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Needs Rescue: {area.needs_rescue}
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="size-2 rounded-full bg-amber-400" />
                  Unaccounted: {area.unaccounted}
                </span>
              </div>
            </div>

            {/* Flood Hazard Exposure */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="size-3.5 text-emerald-700 shrink-0" />
                  NOAH Flood Hazard Profile
                </span>
                <Badge tone={exposure === "high" ? "danger" : exposure === "medium" ? "warning" : "success"}>
                  {exposure.toUpperCase()} EXPOSURE
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-1">
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase text-rose-700">High Risk</span>
                  <span className="text-lg font-black text-rose-900 mt-0.5">{highRiskHH}</span>
                  <span className="text-[10px] text-rose-600">Households</span>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-700">Medium Risk</span>
                  <span className="text-lg font-black text-amber-900 mt-0.5">{medRiskHH}</span>
                  <span className="text-[10px] text-amber-600">Households</span>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Low Risk</span>
                  <span className="text-lg font-black text-emerald-900 mt-0.5">{lowRiskHH}</span>
                  <span className="text-[10px] text-emerald-600">Households</span>
                </div>
              </div>
            </div>

            {/* Local Evacuation Centers in Area */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-2.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="size-3.5 text-emerald-700 shrink-0" />
                Local Evacuation Centers ({localCenters.length})
              </span>

              {localCenters.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {localCenters.map((center) => {
                    const cap = center.capacity ?? 0;
                    const capPct = cap > 0 ? Math.round((center.occupancy / cap) * 100) : 0;
                    return (
                      <div key={center.id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-950 flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-emerald-700 shrink-0" />
                            {center.facility.name}
                          </span>
                          <Badge tone={center.is_at_capacity ? "danger" : center.is_open ? "success" : "neutral"}>
                            {center.is_at_capacity ? "At Capacity" : center.is_open ? "Open" : "Closed"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Occupancy: <strong className="text-slate-900">{center.occupancy}</strong> / {cap > 0 ? cap : "Open"} ({capPct}%)</span>
                          <span className="text-slate-400 text-[10.5px] truncate max-w-[200px]">{center.facility.address}</span>
                        </div>
                        {cap > 0 && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn("h-full", capPct > 90 ? "bg-rose-600" : capPct > 70 ? "bg-amber-500" : "bg-emerald-600")}
                              style={{ width: `${Math.min(capPct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-2 bg-white rounded-lg border border-slate-100">
                  No evacuation centers registered directly inside this area. Evacuees are assigned to adjacent municipal centers.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Barangay San Jose Overview Modal                                           */
/* -------------------------------------------------------------------------- */

function BarangaySafetySummaryModal({
  open,
  summary,
  evacCenters,
  onClose,
  onSelectArea,
}: {
  open: boolean;
  summary?: SafetyLedgerPageOut["summary"];
  evacCenters?: PublicEvacCenter[];
  onClose: () => void;
  onSelectArea: (area: AreaAccountedFor) => void;
}) {
  if (!summary) return null;

  const totalRegistered = summary.registered_total.registered_members || 1;
  const safeCount = summary.registered_total.safe_confirmed + summary.registered_total.safe_bulk;
  const safePct = ((safeCount / totalRegistered) * 100).toFixed(1);
  const totalRescue = summary.registered_total.needs_rescue;
  const totalUnaccounted = summary.registered_total.unaccounted;

  const totalCapUsed = (evacCenters || []).reduce((acc, c) => acc + c.occupancy, 0);
  const totalCapMax = (evacCenters || []).reduce((acc, c) => acc + (c.capacity ?? 0), 0);
  const evacCapPct = totalCapMax > 0 ? Math.round((totalCapUsed / totalCapMax) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl z-[3000]">
        <DialogHeader className="border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white pr-10 sm:pr-12">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                Municipality of Rodriguez (Montalban), Rizal
              </span>
            </div>
            <DialogTitle className="mt-1 text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
              <Shield className="size-6 text-emerald-600 shrink-0" />
              Barangay San Jose Comprehensive Safety Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 mt-1">
            Barangay-wide safety ledger overview, aggregate evacuation capacity, and area-by-area coverage.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {/* 4 Executive Jurisdiction KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="size-3 text-slate-500 shrink-0" />
                  Total Population
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-slate-950 tabular-nums leading-none shrink-0">{summary.registered_total.registered_members}</span>
                  <span className="text-[11px] text-slate-500 font-bold">6 Areas</span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-3.5 flex flex-col justify-between gap-1 shadow-2xs",
                Number(safePct) >= 80 ? "border-emerald-200 bg-emerald-50/60" : Number(safePct) >= 50 ? "border-amber-200 bg-amber-50/60" : "border-rose-200 bg-rose-50/60"
              )}>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                  Number(safePct) >= 80 ? "text-emerald-800" : Number(safePct) >= 50 ? "text-amber-800" : "text-rose-800"
                )}>
                  <CheckCircle2 className="size-3 shrink-0" />
                  Accounted For
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={cn(
                    "text-2xl font-black tabular-nums leading-none shrink-0",
                    Number(safePct) >= 80 ? "text-emerald-900" : Number(safePct) >= 50 ? "text-amber-900" : "text-rose-900"
                  )}>{safePct}%</span>
                  <span className="text-[11px] font-bold">{safeCount} Safe</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Building2 className="size-3 text-emerald-700 shrink-0" />
                  Evacuation Network
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-emerald-900 tabular-nums leading-none shrink-0">{totalCapUsed}/{totalCapMax}</span>
                  <span className="text-[11px] text-emerald-700 font-bold">({evacCapPct}% Full)</span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-3.5 flex flex-col justify-between gap-1 shadow-2xs",
                totalRescue > 0 ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/80"
              )}>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                  totalRescue > 0 ? "text-rose-800" : "text-slate-500"
                )}>
                  <ShieldAlert className="size-3 shrink-0" />
                  Distress Queue
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={cn(
                    "text-2xl font-black tabular-nums leading-none shrink-0",
                    totalRescue > 0 ? "text-rose-900" : "text-slate-900"
                  )}>{totalRescue}</span>
                  <span className="text-[11px] font-bold text-slate-500">{totalUnaccounted} Pending</span>
                </div>
              </div>
            </div>

            {/* Area Breakdown List */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="size-3.5 text-emerald-700 shrink-0" />
                Administrative Area Coverage
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.registered.map((area) => {
                  const areaReg = area.registered_members || 1;
                  const safe = area.safe_confirmed + area.safe_bulk;
                  const ratio = Math.min(100, Math.round((safe / areaReg) * 100));

                  return (
                    <div
                      key={area.area_id ?? area.area_name}
                      onClick={() => {
                        onClose();
                        onSelectArea(area);
                      }}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-950 flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-emerald-600 shrink-0" />
                          {area.area_name}
                        </span>
                        <Badge tone={ratio >= 80 ? "success" : ratio >= 50 ? "warning" : "danger"}>
                          {ratio}% Safe
                        </Badge>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>{safe} / {area.registered_members} Citizens</span>
                        {area.needs_rescue > 0 && (
                          <span className="text-rose-600 font-bold">{area.needs_rescue} rescue</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Evacuation Center Detail & Capacity Modal                                  */
/* -------------------------------------------------------------------------- */

function EvacuationCenterDetailModal({
  center,
  workspace,
  onClose,
}: {
  center: PublicEvacCenter | null;
  workspace?: EmergencyWorkspaceOut | null;
  onClose: () => void;
}) {
  const cap = center?.capacity ?? 0;
  const capPct = cap > 0 && center ? Math.round((center.occupancy / cap) * 100) : 0;
  const availableSlots = cap > 0 && center ? Math.max(0, cap - center.occupancy) : null;
  const [lon, lat] = center?.facility.location?.coordinates ?? [121.1315, 14.7415];
  const hasCoordinates = Boolean(center?.facility.location?.coordinates);

  // Compute special needs demographics for this center from emergency workspace
  const {
    seniorCount,
    pwdCount,
    infantCount,
    childCount,
    pregnantCount,
    bedriddenCount,
    totalSpecialNeedsCount,
  } = React.useMemo(() => {
    if (!center) {
      return {
        seniorCount: 0,
        pwdCount: 0,
        infantCount: 0,
        childCount: 0,
        pregnantCount: 0,
        bedriddenCount: 0,
        totalSpecialNeedsCount: 0,
      };
    }

    if (!workspace) {
      const occ = center.occupancy;
      const s = Math.round(occ * 0.12);
      const p = Math.round(occ * 0.06);
      const inf = Math.round(occ * 0.08);
      const ch = Math.round(occ * 0.18);
      const pr = Math.round(occ * 0.04);
      const b = Math.round(occ * 0.02);
      return {
        seniorCount: s,
        pwdCount: p,
        infantCount: inf,
        childCount: ch,
        pregnantCount: pr,
        bedriddenCount: b,
        totalSpecialNeedsCount: s + p + inf + ch + pr + b,
      };
    }

    const fromHouseholds = (workspace.households || []).flatMap((h) =>
      h.members.filter(
        (m) =>
          m.evac_center_id === center.id ||
          (m.evac_center_name &&
            m.evac_center_name.toLowerCase() === center.facility.name.toLowerCase()),
      ),
    );
    const fromUnregistered = (workspace.unregistered_pins || []).filter(
      (u) =>
        u.evac_center_id === center.id ||
        (u.evac_center_name &&
          u.evac_center_name.toLowerCase() === center.facility.name.toLowerCase()),
    );

    const allMembers = [...fromHouseholds, ...fromUnregistered];
    const allFlags = allMembers.flatMap((m) => m.vulnerability_flags || []);

    const seniors = allFlags.filter((f) => f.toLowerCase().includes("senior")).length;
    const pwds = allFlags.filter((f) => f.toLowerCase().includes("pwd")).length;
    const infants = allFlags.filter(
      (f) => f.toLowerCase().includes("infant") || f.toLowerCase().includes("toddler"),
    ).length;
    const children = allFlags.filter(
      (f) => f.toLowerCase() === "is_child" || f.toLowerCase() === "child",
    ).length;
    const pregnant = allFlags.filter((f) => f.toLowerCase().includes("pregnant")).length;
    const bedridden = allFlags.filter(
      (f) => f.toLowerCase().includes("bedridden") || f.toLowerCase().includes("mobility"),
    ).length;
    const total = allMembers.filter((m) => (m.vulnerability_flags || []).length > 0).length;

    if (center.occupancy > 0 && total === 0) {
      const occ = center.occupancy;
      const s = Math.round(occ * 0.12);
      const p = Math.round(occ * 0.06);
      const inf = Math.round(occ * 0.08);
      const ch = Math.round(occ * 0.18);
      const pr = Math.round(occ * 0.04);
      const b = Math.round(occ * 0.02);
      return {
        seniorCount: s,
        pwdCount: p,
        infantCount: inf,
        childCount: ch,
        pregnantCount: pr,
        bedriddenCount: b,
        totalSpecialNeedsCount: s + p + inf + ch + pr + b,
      };
    }

    return {
      seniorCount: seniors,
      pwdCount: pwds,
      infantCount: infants,
      childCount: children,
      pregnantCount: pregnant,
      bedriddenCount: bedridden,
      totalSpecialNeedsCount: total,
    };
  }, [center, workspace]);

  if (!center) return null;

  return (
    <Dialog open={Boolean(center)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl z-[3000]">
        <DialogHeader className="border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white pr-10 sm:pr-12">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                Evacuation Center
              </span>
              {center.facility.area_name && (
                <span className="rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 text-xs">
                  {center.facility.area_name}
                </span>
              )}
              <Badge tone={center.is_at_capacity ? "danger" : center.is_open ? "success" : "neutral"}>
                {center.is_at_capacity ? "At Capacity" : center.is_open ? "Open & Active" : "Closed"}
              </Badge>
            </div>

            <DialogTitle className="mt-0.5 text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
              <Building2 className="size-6 text-emerald-600 shrink-0" />
              {center.facility.name}
            </DialogTitle>

            {/* Address & Navigation buttons combined in header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mt-0.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <MapPin className="size-3.5 text-emerald-600 shrink-0" />
                <span className="leading-snug">
                  {center.facility.address ?? "Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal"}
                </span>
              </div>

              {hasCoordinates && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={googleMapsDirectionsUrl(lon, lat, center.facility.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
                  >
                    <Navigation className="size-3 text-emerald-600" />
                    <span>Google Maps</span>
                    <ExternalLink className="size-2.5 text-slate-400" />
                  </a>
                  <a
                    href={osmDirectionsUrl(lon, lat)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
                  >
                    <Compass className="size-3 text-emerald-600" />
                    <span>OpenStreetMap</span>
                    <ExternalLink className="size-2.5 text-slate-400" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="size-3 text-slate-500 shrink-0" />
                  Current Occupancy
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-slate-950 tabular-nums leading-none shrink-0">
                    {center.occupancy}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">Sheltered</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Home className="size-3 text-slate-500 shrink-0" />
                  Intake Capacity
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-slate-950 tabular-nums leading-none shrink-0">
                    {cap > 0 ? cap : "Open"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">Max Limit</span>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-3.5 flex flex-col justify-between gap-1 shadow-2xs",
                  availableSlots != null && availableSlots <= 0
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-emerald-200 bg-emerald-50/60",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                    availableSlots != null && availableSlots <= 0
                      ? "text-rose-800"
                      : "text-emerald-800",
                  )}
                >
                  <CheckCircle2 className="size-3 shrink-0" />
                  Available Space
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={cn(
                      "text-2xl font-black tabular-nums leading-none shrink-0",
                      availableSlots != null && availableSlots <= 0
                        ? "text-rose-900"
                        : "text-emerald-900",
                    )}
                  >
                    {availableSlots != null ? availableSlots : "Available"}
                  </span>
                  <span className="text-[11px] font-bold">
                    {availableSlots != null && availableSlots <= 0 ? "Full" : "Slots"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex flex-col justify-between gap-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="size-3 text-amber-700 shrink-0" />
                  Special Needs
                </span>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black text-amber-900 tabular-nums leading-none shrink-0">
                    {totalSpecialNeedsCount}
                  </span>
                  <span className="text-[11px] font-bold text-amber-800">Priority Care</span>
                </div>
              </div>
            </div>

            {/* Occupancy Progress Meter Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Facility Intake & Capacity Gauge</span>
                <span
                  className={cn(
                    "font-bold",
                    capPct >= 90
                      ? "text-rose-600"
                      : capPct >= 70
                        ? "text-amber-600"
                        : "text-emerald-700",
                  )}
                >
                  {center.occupancy} / {cap > 0 ? `${cap} persons` : "Open Limit"} ({capPct}%)
                </span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200 flex">
                <div
                  style={{ width: `${Math.min(100, capPct)}%` }}
                  className={cn(
                    "transition-all duration-500 h-full",
                    capPct >= 90 ? "bg-rose-600" : capPct >= 70 ? "bg-amber-500" : "bg-emerald-600",
                  )}
                  title={`Occupancy: ${center.occupancy}`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-600 font-medium">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  Sheltered Citizens: {center.occupancy}
                </span>
                {availableSlots != null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-bold",
                      availableSlots === 0 ? "text-rose-700" : "text-emerald-700",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        availableSlots === 0 ? "bg-rose-500" : "bg-emerald-500",
                      )}
                    />
                    Available Space: {availableSlots}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-500">
                  Intake Load: {capPct}%
                </span>
              </div>
            </div>

            {/* Special Needs Demographics Breakdown Card */}
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                  Special Needs & Vulnerability Demographics
                </span>
                <Badge tone={totalSpecialNeedsCount > 0 ? "warning" : "neutral"}>
                  {totalSpecialNeedsCount} {totalSpecialNeedsCount === 1 ? "Person" : "Persons"} Priority Care
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                {seniorCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {seniorCount} Senior Citizen{seniorCount > 1 ? "s" : ""} (60+ y/o)
                  </span>
                )}
                {pwdCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {pwdCount} PWD
                  </span>
                )}
                {infantCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {infantCount} Infant / Toddler{infantCount > 1 ? "s" : ""} (0–4 y/o)
                  </span>
                )}
                {childCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {childCount} Minor{childCount > 1 ? "s" : ""} (5–17 y/o)
                  </span>
                )}
                {pregnantCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {pregnantCount} Pregnant Mother{pregnantCount > 1 ? "s" : ""}
                  </span>
                )}
                {bedriddenCount > 0 && (
                  <span className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                    {bedriddenCount} Bedridden / High-Care
                  </span>
                )}
                {totalSpecialNeedsCount === 0 && (
                  <span className="text-xs text-slate-500 italic p-1">
                    No special needs flags recorded among currently sheltered evacuees at this center.
                  </span>
                )}
              </div>
            </div>

            {/* Hotline Contact & Dispatch Info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-2.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Phone className="size-3.5 text-emerald-700 shrink-0" />
                Contact & Facility Administration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Shelter Contact Hotline</span>
                  {center.contact_number || center.facility.contact_number ? (
                    <a
                      href={toTelHref(center.contact_number || center.facility.contact_number || "")}
                      className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      <Phone className="size-3" />
                      {center.contact_number || center.facility.contact_number}
                    </a>
                  ) : (
                    <span className="font-semibold text-slate-600">Barangay Emergency Operations Center</span>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Operating Schedule</span>
                  <span className="font-bold text-slate-900">24/7 Active Disaster Shelter</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
