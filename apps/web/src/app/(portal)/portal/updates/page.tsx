"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  ExternalLink,
  FileWarning,
  Info,
  ShieldCheck,
  Siren,
  Sparkles,
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
  const filteredItems =
    filter === "unread" ? allItems.filter((n) => !n.read_at) : allItems;

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Bell}
        title="Updates &"
        titleAccent="Notices"
        description="Official Barangay San Jose disaster advisories, river flood prompts, and status logs on your household requests."
        badge={
          unreadCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
              <span className="size-2 rounded-full bg-red-600 animate-ping" />
              <span>{unreadCount} Unread Notice(s)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
              <Check className="size-3 text-emerald-700" />
              <span>Inbox Up to Date</span>
            </span>
          )
        }
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
              className="rounded-xl border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
            >
              <CheckCheck className="size-3.5" />
              <span>{readAll.isPending ? "Marking…" : "Mark all as read"}</span>
            </Button>
          ) : null
        }
      />

      {/* ── Filter Pills Bar ── */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
        <div className="flex items-center gap-2">
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
            All Notices ({allItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              filter === "unread"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* ── Notifications List ── */}
      {notices.isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((notice) => {
            const isUnread = !notice.read_at;
            const isAlert = notice.type.includes("alert") || notice.type.includes("emergency");
            const isIncident = notice.type.includes("incident") || notice.type.includes("report");

            return (
              <div
                key={notice.id}
                className={cn(
                  "group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-xs",
                  isUnread
                    ? "border-emerald-300 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-2xs"
                    : "border-neutral-200/90 bg-white",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-xs",
                      isAlert
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : isIncident
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : isUnread
                            ? "bg-emerald-600 text-white shadow-emerald-700/20"
                            : "bg-neutral-100 text-neutral-600",
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

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">
                          {notice.title}
                        </h3>
                        {isUnread ? (
                          <span className="size-2 rounded-full bg-emerald-600" />
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

                    <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                      {notice.body}
                    </p>

                    {notice.link_path ? (
                      <div className="mt-3">
                        <Link
                          href={(notice.link_path ?? "/portal") as never}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          <span>View related page</span>
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-8 sm:p-12 text-center shadow-xs space-y-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <Bell className="size-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            {filter === "unread" ? "No Unread Notices" : "No Updates in Inbox"}
          </h3>
          <p className="max-w-md text-xs text-neutral-500 leading-relaxed">
            Emergency alerts, flood warnings, and resolution notes from Barangay San Jose
            officers will appear here.
          </p>
          {filter === "unread" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilter("all")}
              className="rounded-xl font-bold mt-2"
            >
              View All Notices
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
