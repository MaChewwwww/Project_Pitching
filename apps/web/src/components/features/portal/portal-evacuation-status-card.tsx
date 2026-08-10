"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, CheckCircle2, History, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { api } from "@/lib/api/client";
import type { PortalEvacuationStatusOut } from "@/lib/api/public-types";

export function PortalEvacuationStatusCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "evacuation-status"],
    queryFn: () =>
      api.get<PortalEvacuationStatusOut>("/admin/portal/evacuation-status").then((r) => r.data),
  });

  if (isLoading || !data) return null;

  const { is_currently_evacuated, active_checkin, history } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Currently Checked-In Active Banner */}
      {is_currently_evacuated && active_checkin ? (
        <Card className="border-2 border-emerald-500 bg-emerald-50/80 shadow-md">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <span className="text-overline font-extrabold tracking-wider text-emerald-800 uppercase">
                    Currently Evacuated
                  </span>
                  <h3 className="text-h3 font-extrabold text-neutral-900 leading-tight">
                    {active_checkin.evac_center_name}
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-900 shrink-0">
                <CheckCircle2 className="size-3.5 text-emerald-700" /> Active Stay
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-700 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-emerald-600" />
                Checked in: {new Date(active_checkin.checked_in_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <span className="flex items-center gap-1 font-bold text-neutral-900">
                <MapPin className="size-3.5 text-emerald-600" />
                Event: {active_checkin.event_name}
              </span>
              <span className="text-neutral-600">
                Resident: <strong>{active_checkin.person_name}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Evacuation History Card */}
      {history.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-neutral-900 border-b border-neutral-100 pb-2.5">
              <History className="size-4 text-emerald-600" />
              <h4 className="text-sm font-bold">Evacuation & Check-In History</h4>
            </div>

            <div className="flex flex-col gap-2.5 divide-y divide-neutral-100">
              {history.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-neutral-900">
                      {item.evac_center_name}
                    </span>
                    <span className="text-[11px] text-neutral-600">
                      {item.event_name} • {item.person_name}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      In: {new Date(item.checked_in_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      {item.checked_out_at
                        ? ` — Out: ${new Date(item.checked_out_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                        : " (Currently checked in)"}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.checked_out_at ? "bg-neutral-100 text-neutral-600" : "bg-emerald-100 text-emerald-800"}`}>
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
