"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock,
  HeartPulse,
  HelpCircle,
  LogOut,
  MapPin,
  Phone,
  ShieldAlert,
  Siren,
  X,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { TimelineSkeleton } from "@/components/common/portal-loading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api/client";
import { formatPhtDateTime } from "@/lib/format";
import type { PersonSafetyJourneyOut } from "@/lib/api/safety-types";

interface SafetyJourneyDrawerProps {
  subject: {
    id: string;
    type: "registered_member" | "unregistered_person";
    name?: string;
  } | null;
  onClose: () => void;
}

export function SafetyJourneyDrawer({ subject, onClose }: SafetyJourneyDrawerProps) {
  const isOpen = Boolean(subject);

  const journeyQuery = useQuery({
    queryKey: ["admin", "safety", "history", subject?.type, subject?.id],
    queryFn: () =>
      api
        .get<PersonSafetyJourneyOut>(
          `/admin/safety/history/${subject!.type}/${subject!.id}`,
        )
        .then((res) => res.data),
    enabled: isOpen && Boolean(subject?.id),
  });

  const data = journeyQuery.data;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="z-[2500] flex h-full w-full flex-col gap-0 border-l border-slate-200 bg-slate-50 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {/* Drawer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 flex-col pr-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="truncate text-base leading-tight font-black text-slate-900">
                {data?.full_name ?? subject?.name ?? "Resident Safety Journey"}
              </SheetTitle>
              {data?.is_head && (
                <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800 uppercase">
                  Head
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
              <span>
                {subject?.type === "registered_member"
                  ? "Registered Citizen"
                  : "Unregistered Walk-In"}
              </span>
              {data?.household_reference_no && (
                <>
                  <span>·</span>
                  <span className="font-bold text-slate-700">
                    {data.household_reference_no}
                  </span>
                </>
              )}
              {data?.area_name && (
                <>
                  <span>·</span>
                  <span>{data.area_name}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="shrink-0 cursor-pointer rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Body Scroll Area with Custom Scrollbar */}
        <ScrollArea type="always" className="custom-scrollbar h-full min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {journeyQuery.isFetching ? (
              <TimelineSkeleton label="Loading resident timeline" rows={4} />
            ) : journeyQuery.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 text-center">
                <ShieldAlert className="mx-auto mb-2 size-8 text-rose-500" />
                <h4 className="text-sm font-bold text-rose-900">
                  Failed to load journey
                </h4>
                <p className="mt-1 text-xs text-rose-600">
                  Unable to retrieve historical safety records.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={() => journeyQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : data ? (
              <>
                {/* Profile Summary Card */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Current Status
                    </span>
                    {data.current_status === "safe" ? (
                      <Badge tone="success">Confirmed Safe</Badge>
                    ) : data.current_status === "needs_rescue" ? (
                      <Badge tone="danger">Needs Rescue</Badge>
                    ) : (
                      <Badge tone="warning">Unaccounted</Badge>
                    )}
                  </div>

                  {data.current_evac_center_name && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-900">
                      <Building2 className="size-4 shrink-0 text-emerald-700" />
                      <span>
                        Sheltered at:{" "}
                        <strong className="text-emerald-950">
                          {data.current_evac_center_name}
                        </strong>
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-2 text-xs">
                    {data.household_reference_no && (
                      <div className="flex flex-col">
                        <span className="text-[10.5px] font-medium text-slate-400">
                          Household Ref
                        </span>
                        <span className="font-bold text-slate-800">
                          {data.household_reference_no}
                        </span>
                      </div>
                    )}
                    {data.area_name && (
                      <div className="flex flex-col">
                        <span className="text-[10.5px] font-medium text-slate-400">
                          Area
                        </span>
                        <span className="font-bold text-slate-800">{data.area_name}</span>
                      </div>
                    )}
                    {data.contact_number && (
                      <div className="col-span-2 flex flex-col">
                        <span className="text-[10.5px] font-medium text-slate-400">
                          Contact Number
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Phone className="size-3 text-slate-400" />
                          {data.contact_number}
                        </span>
                      </div>
                    )}
                    {data.address && (
                      <div className="col-span-2 flex flex-col">
                        <span className="text-[10.5px] font-medium text-slate-400">
                          Location / Note
                        </span>
                        <span className="flex items-start gap-1 font-bold text-slate-800">
                          <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                          {data.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vulnerability Tags */}
                  {data.vulnerability_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                      {data.vulnerability_flags.map((flag) => (
                        <span
                          key={flag}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase"
                        >
                          <HeartPulse className="size-2.5" />
                          {flag.replace("is_", "").replace("has_", "").replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Timeline */}
                <div className="flex flex-col gap-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-500 uppercase">
                    <Clock className="size-3.5 text-slate-400" />
                    Emergency Audit Timeline ({data.timeline.length})
                  </h4>

                  {data.timeline.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                      No status mutations recorded yet for this person.
                    </div>
                  ) : (
                    <div className="relative space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-slate-200">
                      {data.timeline.map((entry, index) => {
                        const isLatest = index === 0;
                        return (
                          <div key={entry.id || index} className="group relative">
                            {/* Timeline dot */}
                            <div
                              className={`absolute top-1 -left-6 grid size-5 place-items-center rounded-full border bg-white shadow-2xs ${
                                entry.status === "safe"
                                  ? "border-emerald-500 text-emerald-600"
                                  : entry.status === "needs_rescue"
                                    ? "border-rose-500 bg-rose-50 text-rose-600"
                                    : entry.type === "evac_checkin"
                                      ? "border-sky-500 text-sky-600"
                                      : "border-slate-300 text-slate-400"
                              }`}
                            >
                              {entry.status === "safe" ? (
                                <CheckCircle2 className="size-3" />
                              ) : entry.status === "needs_rescue" ? (
                                <ShieldAlert className="size-3" />
                              ) : entry.type === "evac_checkin" ? (
                                <Building2 className="size-3" />
                              ) : entry.type === "evac_checkout" ? (
                                <LogOut className="size-3" />
                              ) : entry.type === "rescue_request" ? (
                                <Siren className="size-3" />
                              ) : (
                                <HelpCircle className="size-3" />
                              )}
                            </div>

                            {/* Event Card */}
                            <div
                              className={`rounded-xl border bg-white p-3 shadow-2xs transition-all ${isLatest ? "border-emerald-200/90 ring-2 ring-emerald-500/10" : "border-slate-200"}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-bold text-slate-900">
                                  {entry.title}
                                </span>
                                <span className="shrink-0 text-right text-[10px] font-semibold whitespace-nowrap text-slate-400 tabular-nums">
                                  {formatPhtDateTime(entry.timestamp)}
                                </span>
                              </div>
                              <p className="mt-1 text-[11.5px] leading-snug text-slate-600">
                                {entry.description}
                              </p>

                              {entry.actor_name && (
                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10.5px] text-slate-400">
                                  <span>Recorded by:</span>
                                  <span className="font-semibold text-slate-700">
                                    {entry.actor_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
