"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  FileWarning,
  LifeBuoy,
  Radio,
  Search,
  Siren,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  title: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
  type: string;
};
type NoticePage = { items: Notice[] };

export default function PortalUpdatesPage() {
  const client = useQueryClient();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const notices = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => api.get<NoticePage>("/me/notifications").then((r) => r.data),
  });

  const readAll = useMutation({
    mutationFn: () => api.post("/me/notifications/read-all"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });

  const allItems = notices.data?.items ?? [];
  const unreadCount = allItems.filter((n) => !n.read_at).length;

  const filteredItems = allItems
    .filter((n) => (filter === "unread" ? !n.read_at : true))
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Bell}
        title="Updates &"
        titleAccent="Notices"
        description="Official Barangay San Jose disaster advisories, river flood prompts, and status logs on your household requests."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {unreadCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
              >
                <CheckCheck aria-hidden className="size-3.5 text-neutral-600" />
                <span>{readAll.isPending ? "Marking…" : "Mark all as read"}</span>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
              >
                <Link href="/portal/weather">
                  <Waves aria-hidden className="size-3.5 text-neutral-600" />
                  <span>River & Weather Watch</span>
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* ── 12-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        {/* ── PRIMARY LEFT COLUMN: Unified Notices Container (7-8 cols) ── */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
            {/* 1. Container Header: Filters & Search Toolbar */}
            <div className="flex flex-col gap-3 border-b border-neutral-100 bg-neutral-50/70 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Filter Pills */}
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
                  All Notices ({allItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={cn(
                    "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                    filter === "unread"
                      ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600/30"
                      : "border border-neutral-300/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400",
                  )}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notices…"
                  className="w-full h-9 rounded-full border border-neutral-300 bg-white pl-8 pr-3 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* 2. Container Body: Notifications Timeline */}
            {notices.isLoading ? (
              <div className="p-6 space-y-3 animate-pulse">
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
              </div>
            ) : notices.isError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
                <AlertTriangle className="size-10 text-amber-700" />
                <h3 className="mt-3 text-base font-black text-neutral-900">
                  Notices are temporarily unavailable
                </h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
                  Please try again shortly. For urgent situations, submit a direct rescue ticket or call the barangay hotline.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                >
                  <Link href="/portal/rescue">Ask for Rescue</Link>
                </Button>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {filteredItems.map((notice) => {
                  const isUnread = !notice.read_at;
                  const isAlert =
                    notice.type.includes("alert") || notice.type.includes("emergency");
                  const isIncident =
                    notice.type.includes("incident") || notice.type.includes("report");

                  return (
                    <div
                      key={notice.id}
                      className={cn(
                        "p-4 sm:p-5 transition-colors hover:bg-neutral-50/60",
                        isUnread && "bg-emerald-50/25",
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-2xl font-bold shadow-2xs",
                            isAlert
                              ? "border border-red-200 bg-red-100 text-red-700"
                              : isIncident
                                ? "border border-amber-200 bg-amber-100 text-amber-800"
                                : isUnread
                                  ? "bg-emerald-600 text-white shadow-emerald-700/20"
                                  : "border border-neutral-200 bg-neutral-100 text-neutral-600",
                          )}
                        >
                          {isAlert ? (
                            <Siren className="size-5" />
                          ) : isIncident ? (
                            <FileWarning className="size-5" />
                          ) : (
                            <Bell className="size-5" />
                          )}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-neutral-900">
                                {notice.title}
                              </h3>
                              {isUnread ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[10px] font-black uppercase text-emerald-800">
                                  New
                                </span>
                              ) : null}
                            </div>

                            <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                              <Clock className="size-3" />
                              {new Intl.DateTimeFormat("en-PH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(notice.created_at))}
                            </span>
                          </div>

                          <p className="text-xs sm:text-[13px] leading-relaxed text-neutral-600">
                            {notice.body}
                          </p>

                          {notice.link_path ? (
                            <div className="pt-1.5">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-neutral-300 bg-white px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 hover:border-emerald-400 shadow-2xs"
                              >
                                <Link href={(notice.link_path ?? "/portal") as never}>
                                  <span>View Details & Actions</span>
                                  <ChevronRight className="size-3.5 text-emerald-700" />
                                </Link>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center space-y-3">
                <div className="grid size-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500 shadow-2xs">
                  <Bell className="size-7 text-neutral-600" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-neutral-900">
                    {filter === "unread" ? "You're All Caught Up!" : "No Updates in Inbox"}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {filter === "unread"
                      ? "There are no unread disaster advisories or ticket updates. Check back during active weather events."
                      : "Emergency alerts, flood warnings, and resolution notes from Barangay San Jose officers will appear here."}
                  </p>
                </div>
                {filter === "unread" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFilter("all")}
                    className="rounded-full px-5 text-xs font-bold"
                  >
                    View All Notices
                  </Button>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        {/* ── SECONDARY RIGHT COLUMN: Inbox Stats, Danger Banner, Channels Guide (4-5 cols) ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Card 1: Inbox Status Card */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <Bell className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                    Inbox Summary
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Official Broadcast Records
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3">
                  <span className="text-[10px] font-black uppercase text-neutral-400 block">
                    Total
                  </span>
                  <span className="text-xl font-black text-neutral-900 tabular-nums">
                    {allItems.length}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">
                    Unread
                  </span>
                  <span className="text-xl font-black text-emerald-900 tabular-nums">
                    {unreadCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Immediate Danger / Direct Rescue Callout */}
          <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="size-4 text-amber-700" />
              <span className="text-[10px] font-black tracking-[0.14em] uppercase">
                Life-Safety Advisory
              </span>
            </div>
            <h4 className="mt-2 text-sm font-black text-neutral-900">
              Do not wait for an inbox update during flash floods.
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600">
              If water is entering your home or family members need immediate medical or boat assistance, submit a direct rescue ticket.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-3.5 w-full cursor-pointer gap-2 rounded-xl bg-red-600 font-bold text-white shadow-xs hover:bg-red-700 text-xs active:scale-[0.98]"
            >
              <Link href="/portal/rescue">
                <LifeBuoy className="size-3.5" />
                <span>Submit Rescue Request</span>
              </Link>
            </Button>
          </div>

          {/* Card 3: Advisory Channels Guide */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Radio className="size-4" />
                </span>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Community Alert Channels
                </h3>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <p>
                    <strong className="text-neutral-900">In-App Notices:</strong> Direct updates for safety check-ins and incident resolution.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <p>
                    <strong className="text-neutral-900">River Sirens:</strong> Physical sirens trigger at 15.0m Warning and 16.5m Evacuation water levels.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <p>
                    <strong className="text-neutral-900">BDRRMC Desk:</strong> Active staff monitoring Phase 1 to Phase 4 areas 24/7.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
