"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api/client";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

interface AdminNotificationsPopoverProps {
  compact?: boolean;
}

export function AdminNotificationsPopover({
  compact = false,
}: AdminNotificationsPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const activeEventsQuery = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((response) => response.data),
    refetchInterval: 30000,
  });

  const activeEvents = activeEventsQuery.data ?? [];
  const alertCount = activeEvents.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Admin Operational Notifications"
          className={cn(
            "relative grid place-items-center transition-all cursor-pointer",
            compact
              ? "size-8 rounded-lg text-white hover:bg-white/10"
              : "size-9 rounded-xl border border-neutral-200/90 bg-white text-neutral-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
          )}
        >
          <Bell className="size-4" />
          {alertCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 rounded-2xl border border-neutral-200/90 bg-white p-0 shadow-2xl z-[2000] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Bell className="size-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                Operational Alerts
              </h3>
              <p className="text-[10.5px] text-neutral-500">
                Live disaster & incident notifications
              </p>
            </div>
          </div>

          {alertCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-black text-red-800">
              <span className="size-1.5 rounded-full bg-red-600 animate-ping" />
              {alertCount} Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              <CheckCircle2 className="size-3 text-emerald-700" />
              Normal
            </span>
          )}
        </div>

        {/* Content List */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
          {activeEvents.length > 0 ? (
            activeEvents.map((evt) => (
              <div
                key={evt.id}
                className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/90 to-rose-50/50 p-3.5 space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-red-600 text-white shadow-2xs">
                      <Siren className="size-3.5 animate-pulse" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                      Active Emergency Declared
                    </span>
                  </div>
                  <span className="rounded-full bg-white border border-red-200 px-2 py-0.5 font-mono text-[9.5px] font-bold text-red-800 uppercase">
                    {evt.type}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black text-neutral-900">
                    {evt.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Clock className="size-3 text-neutral-400" />
                    Started: {new Date(evt.started_at).toLocaleString("en-PH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-red-200/60">
                  <span className="text-[10.5px] font-semibold text-red-800">
                    BDRRMC Command Desk
                  </span>
                  <Button
                    asChild
                    size="sm"
                    className="h-7 rounded-lg bg-red-600 px-2.5 text-[11px] font-bold text-white hover:bg-red-700 shadow-2xs"
                  >
                    <Link
                      href={`/admin/emergency-events/${evt.id}` as any}
                      onClick={() => setOpen(false)}
                    >
                      Open Event
                      <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center space-y-2">
              <div className="mx-auto grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
                <ShieldCheck className="size-5 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-neutral-900">
                All Operations Normal
              </p>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                No active emergency declarations or critical rescue tickets currently pending in Barangay San Jose.
              </p>
            </div>
          )}

          {/* Quick Hub Jump Links */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-2.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-1">
              Response Management
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                href="/admin/emergency-events"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white p-2 font-bold text-neutral-800 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs"
              >
                <Siren className="size-3.5 text-emerald-700" />
                <span className="truncate">Emergency Events</span>
              </Link>
              <Link
                href="/admin/evacuation-centers"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white p-2 font-bold text-neutral-800 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs"
              >
                <LifeBuoy className="size-3.5 text-sky-700" />
                <span className="truncate">Evac Centers</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="border-t border-neutral-100 bg-neutral-50/90 px-4 py-2.5 text-center">
          <Link
            href="/admin/emergency-events"
            onClick={() => setOpen(false)}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 transition-colors inline-flex items-center gap-1"
          >
            <span>View Full Operations Console</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
