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
  FileWarning,
  Siren,
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
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Bell}
        title="Updates &"
        titleAccent="Notices"
        description="Official Barangay San Jose disaster advisories, river flood prompts, and status logs on your household requests."
        badge={
          unreadCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
              <span className="size-2 animate-ping rounded-full bg-red-600" />
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

      {/* ── Inbox control rail ── */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Bell className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black tracking-[0.14em] text-emerald-700 uppercase">
                    Your notice inbox
                  </p>
                  <h2 className="mt-0.5 text-lg font-black tracking-tight text-neutral-900">
                    {unreadCount > 0
                      ? `${unreadCount} notice${unreadCount === 1 ? "" : "s"} need your attention`
                      : "You are caught up"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Official advisories and updates to your requests stay here for easy
                    reference.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-700">
                  {allItems.length} total
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  {unreadCount} unread
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 bg-neutral-50/70 p-3 sm:px-5">
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
                All Notices ({allItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                  filter === "unread"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </CardContent>
        </Card>

        <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="size-4" />
            <span className="text-[10px] font-black tracking-[0.14em] uppercase">
              For urgent danger
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-neutral-900">
            Do not wait for an inbox update.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            Use the rescue request if a person is trapped, injured, or in immediate
            danger.
          </p>
          <Link
            href="/portal/rescue"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 hover:underline"
          >
            <Siren className="size-3.5" /> Ask for rescue{" "}
            <ChevronRight className="size-3.5" />
          </Link>
        </aside>
      </section>

      {/* ── Notifications List ── */}
      {notices.isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      ) : notices.isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center shadow-xs sm:p-12">
          <AlertTriangle className="size-8 text-amber-700" />
          <h3 className="mt-3 text-base font-black text-neutral-900">
            Notices are temporarily unavailable
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
            Try again shortly. For an urgent situation, use the rescue request or contact
            an official hotline.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 rounded-xl border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100"
          >
            <Link href="/portal/rescue">Ask for rescue</Link>
          </Button>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="relative space-y-3 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:bg-emerald-100 sm:before:left-6">
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
                  "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:p-5",
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
                        ? "border border-red-200 bg-red-100 text-red-700"
                        : isIncident
                          ? "border border-amber-200 bg-amber-100 text-amber-800"
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

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">
                          {notice.title}
                        </h3>
                        {isUnread ? (
                          <span className="size-2 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
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

                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
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
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-neutral-200/90 bg-white p-8 text-center shadow-xs sm:rounded-3xl sm:p-12">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <Bell className="size-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            {filter === "unread" ? "No Unread Notices" : "No Updates in Inbox"}
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-neutral-500">
            Emergency alerts, flood warnings, and resolution notes from Barangay San Jose
            officers will appear here.
          </p>
          {filter === "unread" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilter("all")}
              className="mt-2 rounded-xl font-bold"
            >
              View All Notices
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
