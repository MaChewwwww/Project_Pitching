"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Clock,
  FileWarning,
  History,
  LifeBuoy,
  MessageSquare,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Rescue = {
  id: string;
  created_at: string;
  status: string;
  description: string;
  resolution_note: string | null;
};

type Incident = {
  id: string;
  created_at: string;
  status: string;
  type: string;
  description: string;
  resolution_note: string | null;
};

type Page<T> = { items: T[] };

export default function PortalHistoryPage() {
  const [filter, setFilter] = React.useState<"all" | "rescue" | "incident">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const rescueQuery = useQuery({
    queryKey: ["me", "rescue-requests"],
    queryFn: () => api.get<Page<Rescue>>("/me/rescue-requests").then((r) => r.data),
  });

  const reportsQuery = useQuery({
    queryKey: ["me", "incident-reports"],
    queryFn: () => api.get<Page<Incident>>("/me/incident-reports").then((r) => r.data),
  });

  const rescueItems = rescueQuery.data?.items ?? [];
  const reportItems = reportsQuery.data?.items ?? [];

  const combinedItems = [
    ...rescueItems.map((item) => ({
      ...item,
      kind: "rescue" as const,
      title: "Emergency Rescue Dispatch",
      subtitle: "Life-Safety Rescue Request",
    })),
    ...reportItems.map((item) => ({
      ...item,
      kind: "incident" as const,
      title: `Incident Report: ${item.type.replaceAll("_", " ")}`,
      subtitle: "Community Hazard Report",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredItems = combinedItems
    .filter((item) => (filter === "all" ? true : item.kind === filter))
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.resolution_note && item.resolution_note.toLowerCase().includes(q)) ||
        item.status.toLowerCase().includes(q)
      );
    });

  const resolvedCount = combinedItems.filter((i) =>
    ["resolved", "acknowledged"].includes(i.status.toLowerCase()),
  ).length;

  const activeCount = combinedItems.filter((i) =>
    ["pending", "dispatched", "in_progress"].includes(i.status.toLowerCase()),
  ).length;

  const statusToneMap: Record<
    string,
    { badge: string; dot: string; label: string }
  > = {
    pending: {
      badge: "border-amber-300 bg-amber-50 text-amber-900 font-black",
      dot: "bg-amber-500",
      label: "Pending Review",
    },
    dispatched: {
      badge: "border-sky-300 bg-sky-50 text-sky-900 font-black animate-pulse",
      dot: "bg-sky-500",
      label: "Team Dispatched",
    },
    in_progress: {
      badge: "border-blue-300 bg-blue-50 text-blue-900 font-black",
      dot: "bg-blue-600",
      label: "In Progress",
    },
    resolved: {
      badge: "border-emerald-300 bg-emerald-50 text-emerald-900 font-black",
      dot: "bg-emerald-600",
      label: "Resolved",
    },
    acknowledged: {
      badge: "border-emerald-300 bg-emerald-50 text-emerald-900 font-black",
      dot: "bg-emerald-600",
      label: "Acknowledged",
    },
    cancelled: {
      badge: "border-neutral-300 bg-neutral-100 text-neutral-600 font-bold",
      dot: "bg-neutral-400",
      label: "Cancelled",
    },
  };

  const isLoading = rescueQuery.isLoading || reportsQuery.isLoading;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={ClipboardList}
        title="Household History &"
        titleAccent="Activity Logs"
        description="Chronological record of emergency rescue calls, neighborhood hazard reports, and resolution notes from Barangay San Jose officers."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/portal/report">
                <FileWarning aria-hidden className="size-3.5 text-neutral-600" />
                <span>New Incident Report</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 1. Top Metrics Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric 1: Total Records */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <History className="size-6" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Total Logs
              </span>
              <h3 className="text-2xl font-black text-neutral-900 tabular-nums">
                {combinedItems.length}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium truncate">
                {activeCount > 0 ? `${activeCount} active request(s)` : "All records archived"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Rescue Requests */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700 shadow-2xs">
              <LifeBuoy className="size-6" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Rescue Requests
              </span>
              <h3 className="text-2xl font-black text-neutral-900 tabular-nums">
                {rescueItems.length}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium truncate">
                Emergency life-safety dispatches
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Incident Reports */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs">
              <FileWarning className="size-6" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Incident Reports
              </span>
              <h3 className="text-2xl font-black text-neutral-900 tabular-nums">
                {reportItems.length}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium truncate">
                {resolvedCount} resolved by operations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Unified Activity Feed Card Container ── */}
      <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
        {/* Container Header: Filters & Search */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 bg-neutral-50/70 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filter === "all"
                  ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600/30"
                  : "border border-neutral-300/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400",
              )}
            >
              All Activity ({combinedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("rescue")}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filter === "rescue"
                  ? "bg-red-700 text-white shadow-xs ring-2 ring-red-600/30"
                  : "border border-neutral-300/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400",
              )}
            >
              Rescue Requests ({rescueItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("incident")}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                filter === "incident"
                  ? "bg-amber-700 text-white shadow-xs ring-2 ring-amber-600/30"
                  : "border border-neutral-300/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400",
              )}
            >
              Incident Reports ({reportItems.length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records…"
              className="w-full h-9 rounded-full border border-neutral-300 bg-white pl-8 pr-3 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Container Body */}
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-32 rounded-2xl bg-slate-100" />
            <div className="h-32 rounded-2xl bg-slate-100" />
          </div>
        ) : rescueQuery.isError || reportsQuery.isError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <History className="size-10 text-amber-700" />
            <h3 className="mt-3 text-base font-black text-neutral-900">
              Activity history is temporarily unavailable
            </h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
              Your records have not been lost. Please try refreshing or check back in a few moments.
            </p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {filteredItems.map((item) => {
              const isRescue = item.kind === "rescue";
              const tone =
                statusToneMap[item.status.toLowerCase()] ?? statusToneMap.pending;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="p-5 sm:p-6 space-y-4 hover:bg-neutral-50/40 transition-colors"
                >
                  {/* Item Header: Icon, Type, Subtitle, Date, Status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-2xl font-bold shadow-2xs",
                          isRescue
                            ? "border border-red-200 bg-red-100 text-red-700"
                            : "border border-amber-200 bg-amber-100 text-amber-800",
                        )}
                      >
                        {isRescue ? (
                          <LifeBuoy className="size-5.5" />
                        ) : (
                          <FileWarning className="size-5.5" />
                        )}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-neutral-900 capitalize">
                            {item.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 font-medium mt-0.5">
                          <span className="text-neutral-500">{item.subtitle}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-neutral-400" />
                            {new Intl.DateTimeFormat("en-PH", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(item.created_at))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-2xs",
                        tone.badge,
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", tone.dot)} />
                      <span>{tone.label}</span>
                    </span>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Reported Details
                    </span>
                    <p className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-3.5 text-xs sm:text-sm leading-relaxed text-neutral-800 font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Officer Resolution Note Callout */}
                  {item.resolution_note ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 p-4 text-xs text-emerald-950 shadow-2xs">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <MessageSquare className="size-4" />
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                            Barangay Operations Resolution
                          </span>
                          <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-black text-emerald-950 uppercase">
                            Official Note
                          </span>
                        </div>
                        <p className="text-xs sm:text-[13px] leading-relaxed text-emerald-900 font-medium">
                          {item.resolution_note}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-neutral-400" />
                        <span>Logged in San Jose Emergency Database</span>
                      </span>
                      <span className="font-mono text-[10.5px]">
                        ID: {item.id.slice(0, 8)}…
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center space-y-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500 shadow-2xs">
              <ClipboardList className="size-7 text-neutral-600" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-neutral-900">
                {searchQuery ? "No Matching Records Found" : "No Household Activity Yet"}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {searchQuery
                  ? "Try searching with different keywords or clear your search term."
                  : "When your household submits an incident report or emergency rescue request, all logs and responder notes will appear here."}
              </p>
            </div>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="rounded-full px-5 text-xs font-bold"
              >
                Clear Search Filter
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-neutral-300 px-5 text-xs font-bold text-neutral-800"
                >
                  <Link href="/portal/report">
                    <FileWarning className="size-3.5" />
                    <span>Report an Incident</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full border border-red-600/30 bg-red-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-red-700"
                >
                  <Link href="/portal/rescue">
                    <LifeBuoy className="size-3.5" />
                    <span>Rescue Request</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
