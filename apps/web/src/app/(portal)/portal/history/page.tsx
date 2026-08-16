"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileWarning,
  History,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
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

  const rescueQuery = useQuery({
    queryKey: ["me", "rescue-requests"],
    queryFn: () =>
      api.get<Page<Rescue>>("/me/rescue-requests").then((r) => r.data),
  });

  const reportsQuery = useQuery({
    queryKey: ["me", "incident-reports"],
    queryFn: () =>
      api.get<Page<Incident>>("/me/incident-reports").then((r) => r.data),
  });

  const rescueItems = rescueQuery.data?.items ?? [];
  const reportItems = reportsQuery.data?.items ?? [];

  const combinedItems = [
    ...rescueItems.map((item) => ({
      ...item,
      kind: "rescue" as const,
      title: "Rescue Dispatch Request",
    })),
    ...reportItems.map((item) => ({
      ...item,
      kind: "incident" as const,
      title: `Incident Report: ${item.type.replaceAll("_", " ")}`,
    })),
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filteredItems =
    filter === "all"
      ? combinedItems
      : combinedItems.filter((i) => i.kind === filter);

  const statusToneMap: Record<string, { badge: string; ring: string }> = {
    pending: {
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      ring: "bg-amber-100 text-amber-800",
    },
    dispatched: {
      badge: "bg-sky-100 text-sky-800 border-sky-300 animate-pulse",
      ring: "bg-sky-100 text-sky-700",
    },
    in_progress: {
      badge: "bg-sky-100 text-sky-800 border-sky-300",
      ring: "bg-sky-100 text-sky-700",
    },
    resolved: {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      ring: "bg-emerald-100 text-emerald-700",
    },
    acknowledged: {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      ring: "bg-emerald-100 text-emerald-700",
    },
    cancelled: {
      badge: "bg-slate-100 text-slate-700 border-slate-300",
      ring: "bg-slate-100 text-slate-700",
    },
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={ClipboardList}
        title="Household History &"
        titleAccent="Activity Logs"
        description="Chronological record of emergency rescue calls, neighborhood hazard reports, and resolution notes from Barangay San Jose officers."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>Audit Trail</span>
          </span>
        }
      />

      {/* ── 1. Summary Metrics Strip ── */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
            Total Records
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-1">
            {combinedItems.length}
          </span>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-2xs">
          <span className="text-[10px] font-black tracking-wider text-red-800 uppercase">
            Rescue Calls
          </span>
          <span className="text-xl sm:text-2xl font-black text-red-950 tabular-nums mt-1">
            {rescueItems.length}
          </span>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
          <span className="text-[10px] font-black tracking-wider text-amber-800 uppercase">
            Incident Reports
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-950 tabular-nums mt-1">
            {reportItems.length}
          </span>
        </div>
      </section>

      {/* ── 2. Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            filter === "all"
              ? "bg-emerald-700 text-white shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          All Activity ({combinedItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("rescue")}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            filter === "rescue"
              ? "bg-red-700 text-white shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          Rescue Requests ({rescueItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("incident")}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            filter === "incident"
              ? "bg-amber-700 text-white shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          Incident Reports ({reportItems.length})
        </button>
      </div>

      {/* ── 3. Timeline Items List ── */}
      {rescueQuery.isLoading || reportsQuery.isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const isRescue = item.kind === "rescue";
            const tone =
              statusToneMap[item.status.toLowerCase()] ?? statusToneMap.pending;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-xs space-y-3.5"
              >
                {/* Header: Icon + Title + Status + Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-xs",
                        isRescue
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200",
                      )}
                    >
                      {isRescue ? (
                        <LifeBuoy className="size-5" />
                      ) : (
                        <FileWarning className="size-5" />
                      )}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 capitalize">
                        {item.title}
                      </h3>
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5 font-medium">
                        <Clock className="size-3" />
                        {new Intl.DateTimeFormat("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider",
                      tone.badge,
                    )}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>

                {/* Description Body */}
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal bg-neutral-50/60 p-3 rounded-xl border border-neutral-100">
                  {item.description}
                </p>

                {/* Officer Resolution Note */}
                {item.resolution_note ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                    <MessageSquare className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                        Barangay Officer Note:
                      </span>
                      <p className="mt-0.5 leading-relaxed font-medium">
                        {item.resolution_note}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-8 sm:p-12 text-center shadow-xs space-y-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <ClipboardList className="size-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            No Household History Found
          </h3>
          <p className="max-w-md text-xs text-neutral-500 leading-relaxed">
            When you submit a rescue dispatch or report a community hazard, your activity
            and responder resolution notes will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
