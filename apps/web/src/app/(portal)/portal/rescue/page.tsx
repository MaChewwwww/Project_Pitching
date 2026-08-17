"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  CircleCheck,
  Flame,
  HeartPulse,
  History,
  LifeBuoy,
  MapPin,
  Phone,
  PhoneCall,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { RescueRequestForm } from "@/components/common/rescue-request-form";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

export default function PortalRescuePage() {
  const { user } = useAuth();

  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const hhData = household.data;

  // Build prefilled values from authenticated resident profile
  const initialValues = React.useMemo(() => {
    if (!hhData && !user) return undefined;
    const coords = hhData?.location?.coordinates;
    const lat = coords ? coords[1] : undefined;
    const lng = coords ? coords[0] : undefined;

    return {
      requester_name: user?.full_name || hhData?.head_name || "",
      contact_number: hhData?.contact_number || "",
      people_count: hhData?.members?.length
        ? String(hhData.members.length)
        : undefined,
      location: lat !== undefined && lng !== undefined ? { lat, lng } : null,
      location_note: hhData
        ? `${hhData.street_address || ""} · ${hhData.area_name || ""}`.trim()
        : "",
    };
  }, [hhData, user]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={LifeBuoy}
        title="Emergency Rescue"
        titleAccent="Dispatch"
        description="Request immediate emergency boat extraction, medical evacuation, or trapped resident triage from Barangay San Jose BDRRMC command center."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
            <span className="size-2 rounded-full bg-red-600 animate-ping" />
            <span>Priority Emergency Queue</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/portal/history">
                <History aria-hidden className="size-3.5 text-neutral-600" />
                <span>View Request History</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/portal/safety">
                <ShieldCheck aria-hidden className="size-3.5 text-emerald-600" />
                <span>Safety Check-In</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Top Urgent Hotline Alert Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-red-500/40 bg-gradient-to-r from-red-900 via-rose-900 to-red-950 p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-red-700 shadow-xs">
            <Phone className="size-5.5 animate-pulse" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-red-200">
                Critical Life Threat?
              </span>
              <span className="rounded-full bg-red-600/80 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider text-white">
                Direct Line
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm font-black text-white">
              BDRRMC Command: (02) 8942-0123 / 0917-812-3456
            </p>
            <p className="text-[11px] text-rose-200/90">
              For instant dispatch while in active phone coverage, dial directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 max-sm:w-full">
          <Button
            asChild
            size="sm"
            className="w-full sm:w-auto rounded-full bg-white px-5 font-black text-red-950 shadow-md hover:bg-neutral-100 text-xs h-10 active:scale-[0.98]"
          >
            <a href="tel:0289420123" className="flex items-center gap-2">
              <PhoneCall className="size-3.5 text-red-700" />
              <span>Call Operations</span>
            </a>
          </Button>
        </div>
      </div>

      {/* ── 2-Column Responsive Layout (12-col grid like /report & /rescue) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        {/* ── PRIMARY LEFT COLUMN: Rescue Request Form (7-8 cols) ── */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
            <CardContent className="p-0">
              <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700 shadow-2xs">
                    <LifeBuoy className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black tracking-[0.14em] text-red-800 uppercase">
                        Emergency Rescue Dispatch
                      </p>
                    </div>
                    <h2 className="mt-0.5 text-base sm:text-lg font-black tracking-tight text-neutral-900">
                      Request Urgent Extraction or Evacuation Boat
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                      Pre-filled with your registered household coordinates (#{hhData?.reference_no ?? "—"}) to accelerate rescue boat triage and field responder dispatch.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                    <CircleCheck className="size-3.5 text-emerald-700" /> Authenticated Resident
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                    <MapPin className="size-3.5 text-emerald-700" /> GPS Geotagged Location
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                    <ShieldAlert className="size-3.5 text-emerald-700" /> High-Priority Dispatch
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 lg:p-7">
                <RescueRequestForm
                  endpoint="/me/rescue-requests"
                  badgeLabel="Authenticated Resident"
                  title="Rescue Dispatch Ticket"
                  subtitle="Forwarded immediately to San Jose Disaster Command & Rescue Boats"
                  defaultValues={initialValues}
                  isResidentPortal={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SECONDARY RIGHT COLUMN: Quick Guide, Protocol, Hotlines, Survival Tips (5-4 cols) ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Card 1: Emergency Quick Guide */}
          <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-primary-50/40 shadow-xs portal-card-hover">
            <CardContent className="p-4 sm:p-5 flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                  <Zap aria-hidden className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                    Emergency Quick Guide
                  </h3>
                  <p className="text-[11.5px] font-medium text-emerald-800">
                    Which channel should you use?
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 text-xs">
                <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-3 flex items-start gap-2.5 shadow-2xs">
                  <span className="grid size-6 place-items-center rounded-md bg-rose-100 text-rose-700 shrink-0 font-bold text-[11px]">
                    📞
                  </span>
                  <div>
                    <span className="font-bold text-neutral-900 block leading-tight">
                      Immediate Life Threat?
                    </span>
                    <span className="text-neutral-600 text-[11.5px] leading-snug block mt-0.5">
                      Dial any hotline directly. Fastest method when you have active cellular coverage.
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-3 flex items-start gap-2.5 shadow-2xs">
                  <span className="grid size-6 place-items-center rounded-md bg-emerald-100 text-emerald-800 shrink-0 font-bold text-[11px]">
                    📍
                  </span>
                  <div>
                    <span className="font-bold text-neutral-900 block leading-tight">
                      Trapped or Need Rescue Boat?
                    </span>
                    <span className="text-neutral-600 text-[11.5px] leading-snug block mt-0.5">
                      Submit this form. Pinning your GPS location directs rescue boats directly to your residence.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: What Happens Next / Triage Protocol */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden portal-card-hover">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="size-4" />
                </span>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Rescue Protocol & Triage
                </h3>
              </div>

              <ol className="space-y-3 text-xs leading-relaxed text-neutral-700">
                <li className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    1
                  </span>
                  <span>
                    <strong className="text-neutral-900">Priority Triage:</strong> Verified households with recorded PWDs, seniors, pregnant, or infants are given immediate priority.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    2
                  </span>
                  <span>
                    <strong className="text-neutral-900">Craft Mobilization:</strong> BDRRMC assigns rescue boats, amphibious vehicles, and medical first responders to your zone.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    3
                  </span>
                  <span>
                    <strong className="text-neutral-900">Live Status Tracking:</strong> Dispatch logs and resolution timestamps are recorded in your Household History.
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Card 3: 24/7 Direct Emergency Hotlines */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden portal-card-hover">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <PhoneCall className="size-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-900">
                    Emergency Hotlines
                  </h3>
                </div>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  24/7 Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <a
                  href="tel:0289420123"
                  className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 transition-colors hover:bg-emerald-50/50 hover:border-emerald-300"
                >
                  <div>
                    <span className="font-bold text-neutral-900 block text-xs">
                      BDRRMC Operations Center
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      (02) 8942-0123 / 0917-812-3456
                    </span>
                  </div>
                  <span className="rounded-lg bg-white border border-neutral-200 px-2 py-1 text-[11px] font-bold text-emerald-700 shadow-2xs">
                    Call
                  </span>
                </a>

                <a
                  href="tel:0289411111"
                  className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 transition-colors hover:bg-emerald-50/50 hover:border-emerald-300"
                >
                  <div>
                    <span className="font-bold text-neutral-900 block text-xs">
                      PNP San Jose Substation
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      (02) 8941-1111
                    </span>
                  </div>
                  <span className="rounded-lg bg-white border border-neutral-200 px-2 py-1 text-[11px] font-bold text-emerald-700 shadow-2xs">
                    Call
                  </span>
                </a>

                <a
                  href="tel:0289482222"
                  className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 transition-colors hover:bg-emerald-50/50 hover:border-emerald-300"
                >
                  <div>
                    <span className="font-bold text-neutral-900 block text-xs">
                      BFP Fire & Rescue
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      (02) 8948-2222
                    </span>
                  </div>
                  <span className="rounded-lg bg-white border border-neutral-200 px-2 py-1 text-[11px] font-bold text-emerald-700 shadow-2xs">
                    Call
                  </span>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Vital Flooding Survival Guidance */}
          <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 shadow-xs overflow-hidden portal-card-hover">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2.5">
                <div className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300/60">
                  <AlertTriangle className="size-3.5" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Vital Survival Guidance
                </h3>
              </div>

              <ul className="space-y-2 text-xs leading-relaxed text-amber-950/90 font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 mt-0.5">•</span>
                  <span><strong>Move to high ground:</strong> Stay on the second floor or safe elevated roofline if ground floor floods.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 mt-0.5">•</span>
                  <span><strong>Power off:</strong> Switch off main breaker and gas tank if safe to do so before water rises.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 mt-0.5">•</span>
                  <span><strong>Keep Go-Bag ready:</strong> Keep emergency Go-Bags and whistles accessible for rescue boat signaling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 mt-0.5">•</span>
                  <span><strong>Do not wade:</strong> Never attempt to swim across fast-moving street currents or open drainage canals.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
