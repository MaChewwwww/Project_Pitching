"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Clock,
  FileWarning,
  History,
  LifeBuoy,
  MessageSquare,
  Sparkles,
} from "lucide-react";

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
      title: "Rescue Dispatch Request",
    })),
    ...reportItems.map((item) => ({
      ...item,
      kind: "incident" as const,
      title: `Incident Report: ${item.type.replaceAll("_", " ")}`,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredItems =
    filter === "all" ? combinedItems : combinedItems.filter((i) => i.kind === filter);

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

      {/* ── Activity overview ── */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-xs">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <History className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[0.14em] text-emerald-700 uppercase">
                Your response record
              </p>
              <h2 className="mt-0.5 text-lg font-black tracking-tight text-neutral-900">
                Every request, report, and officer update in one place
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Records remain available so your household can track the response through
                resolution.
              </p>
            </div>
          </div>
          <span className="self-start rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-700">
            {combinedItems.length} total record{combinedItems.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid divide-y divide-neutral-100 border-t border-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 p-4 sm:px-6">
            <span className="grid size-8 place-items-center rounded-lg bg-red-100 text-red-700">
              <LifeBuoy className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-wider text-neutral-500 uppercase">
                Rescue requests
              </p>
              <p className="text-xl font-black text-neutral-900 tabular-nums">
                {rescueItems.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 sm:px-6">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <FileWarning className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-wider text-neutral-500 uppercase">
                Incident reports
              </p>
              <p className="text-xl font-black text-neutral-900 tabular-nums">
                {reportItems.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Filter Pills ── */}
      <div className="flex flex-col gap-3 border-b border-neutral-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-neutral-900">Activity timeline</h2>
          <p className="text-xs text-neutral-500">
            Filter your household&apos;s operational records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              filter === "all"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
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
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
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
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            Incident Reports ({reportItems.length})
          </button>
        </div>
      </div>

      {/* ── 3. Timeline Items List ── */}
      {rescueQuery.isLoading || reportsQuery.isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
      ) : rescueQuery.isError || reportsQuery.isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center shadow-xs sm:p-12">
          <History className="size-8 text-amber-700" />
          <h3 className="mt-3 text-base font-black text-neutral-900">
            Activity history is temporarily unavailable
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
            Your records have not been removed. Please try again shortly.
          </p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="relative space-y-3.5 before:absolute before:top-6 before:bottom-6 before:left-5 before:w-px before:bg-emerald-100 sm:before:left-6">
          {filteredItems.map((item) => {
            const isRescue = item.kind === "rescue";
            const tone =
              statusToneMap[item.status.toLowerCase()] ?? statusToneMap.pending;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="group relative flex flex-col justify-between space-y-3.5 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                {/* Header: Icon + Title + Status + Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-xs",
                        isRescue
                          ? "border border-red-200 bg-red-100 text-red-700"
                          : "border border-amber-200 bg-amber-100 text-amber-800",
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
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-400">
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
                      "rounded-full border px-2.5 py-0.5 text-[10.5px] font-black tracking-wider uppercase",
                      tone.badge,
                    )}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>

                {/* Description Body */}
                <p className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 text-xs leading-relaxed font-normal text-neutral-700 sm:text-sm">
                  {item.description}
                </p>

                {/* Officer Resolution Note */}
                {item.resolution_note ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    <div>
                      <span className="block text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
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
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-neutral-200/90 bg-white p-8 text-center shadow-xs sm:rounded-3xl sm:p-12">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <ClipboardList className="size-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            No Household History Found
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-neutral-500">
            When you submit a rescue dispatch or report a community hazard, your activity
            and responder resolution notes will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
