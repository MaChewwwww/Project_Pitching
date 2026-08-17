"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, CheckCircle2, Clock, History, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { api } from "@/lib/api/client";
import type { PortalEvacuationStatusOut } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

export function PortalEvacuationStatusCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "evacuation-status"],
    queryFn: () =>
      api.get<PortalEvacuationStatusOut>("/me/evacuation-status").then((r) => r.data),
  });

  if (isLoading || !data) return null;

  const { is_currently_evacuated, active_checkin, history } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Currently Checked-In Active Banner */}
      {is_currently_evacuated && active_checkin ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50 p-5 shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full bg-emerald-400/20 blur-2xl"
          />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-700/20 ring-4 ring-emerald-400/20">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Currently Sheltered
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 sm:text-lg">
                    {active_checkin.evac_center_name}
                  </h3>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-200/90 px-2.5 py-1 text-xs font-black text-emerald-900 shadow-2xs">
                <CheckCircle2 className="size-3.5 text-emerald-700" /> Active Stay
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-emerald-950/10 pt-3 text-xs font-medium text-neutral-700">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-700" />
                Checked in:{" "}
                <strong className="text-neutral-900">
                  {new Date(active_checkin.checked_in_at).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-700" />
                Emergency Event: <strong className="text-neutral-900">{active_checkin.event_name}</strong>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Evacuation History Card */}
      {history.length > 0 ? (
        <Card className="border-neutral-200/90 bg-white shadow-xs">
          <CardContent className="flex flex-col gap-3.5 p-5">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-neutral-900">
              <History className="size-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">
                Evacuation Shelter History
              </h4>
            </div>

            <div className="flex flex-col gap-2.5 divide-y divide-neutral-100">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 pt-2.5 first:pt-0"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {item.evac_center_name}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {item.event_name} • {item.person_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" />
                      In:{" "}
                      {new Date(item.checked_in_at).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {item.checked_out_at
                        ? ` — Out: ${new Date(item.checked_out_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                        : " (Currently Sheltered)"}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase",
                      item.checked_out_at
                        ? "border-neutral-200 bg-neutral-100 text-neutral-600"
                        : "border-emerald-300 bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {item.checked_out_at ? "Completed" : "Checked In"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
