"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleCheck,
  FileWarning,
  History,
  LifeBuoy,
  MapPin,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { IncidentReportForm } from "@/components/features/safety/incident-report-form";

export default function PortalReportPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={FileWarning}
        title="Report an"
        titleAccent="Incident"
        description="Notify the Barangay San Jose operations desk of rising floodwaters, fallen trees, blocked evacuation routes, or electrical hazards."
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
                <span>View Report History</span>
              </Link>
            </Button>
          </div>
        }
      />

      {submitted ? (
        <Card className="overflow-hidden border-emerald-300 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3.5 p-8 text-center sm:p-10">
            <div className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-neutral-900">
              Incident Report Transmitted
            </h2>
            <p className="max-w-md text-xs leading-relaxed text-neutral-600 sm:text-sm">
              Your geotagged incident report has been forwarded to Barangay San Jose
              disaster coordinators. Thank you for keeping our community safe.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="h-10 rounded-full border-neutral-300 bg-white px-5 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Submit Another Report
              </Button>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-full border border-emerald-600/30 bg-emerald-700 px-5 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
              >
                <Link href="/portal/history">View in History Logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── 2-Column Responsive Layout (12-col grid like /rescue) ── */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          {/* ── PRIMARY LEFT COLUMN: Incident Report Form (7-8 cols) ── */}
          <div className="lg:col-span-7 xl:col-span-8">
            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="p-0">
                <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
                      <FileWarning className="size-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.14em] text-amber-800 uppercase">
                        Community Hazard Report
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-lg font-black tracking-tight text-neutral-900">
                        Tell the operations desk what you observe
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        Submit a geotagged hazard report to help barangay disaster teams mobilize assistance, clear roads, and monitor local risks.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                      <CircleCheck className="size-3.5 text-emerald-700" /> Authenticated Report
                    </span>
                    <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                      <MapPin className="size-3.5 text-emerald-700" /> Geotagged Map Pin
                    </span>
                    <span className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-2xs">
                      <ShieldAlert className="size-3.5 text-emerald-700" /> Photo Verification
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 lg:p-7">
                  <IncidentReportForm onDone={() => setSubmitted(true)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── SECONDARY RIGHT COLUMN: Rescue Callout, Next Steps, Hotlines (5-4 cols) ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Card 1: Immediate Danger / Direct Rescue Callout */}
            <div className="rounded-2xl border-2 border-red-400/50 bg-gradient-to-br from-red-50 to-rose-100/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-red-800">
                <LifeBuoy className="size-4 animate-spin-slow" />
                <span className="text-[10px] font-black tracking-[0.14em] uppercase">
                  Immediate Life Threat?
                </span>
              </div>
              <h2 className="mt-2 text-base font-black text-red-950">
                Request Emergency Rescue Instead
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-red-900/80">
                Use the rescue dispatch channel if family members are trapped, injured, or facing rapidly rising floodwaters at home.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 w-full cursor-pointer gap-2 rounded-xl bg-red-600 font-bold text-white shadow-xs hover:bg-red-700 text-xs active:scale-[0.98]"
              >
                <Link href="/portal/rescue">
                  <LifeBuoy className="size-3.5" />
                  <span>Submit Rescue Request</span>
                </Link>
              </Button>
            </div>

            {/* Card 2: What Happens Next */}
            <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="size-4" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    What Happens Next
                  </h3>
                </div>

                <ol className="space-y-3 text-xs leading-relaxed text-neutral-700">
                  <li className="flex gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      1
                    </span>
                    <span>
                      <strong className="text-neutral-900">Logged for Barangay Triage:</strong> Your geotagged report immediately alerts the BDRRMC incident desk.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      2
                    </span>
                    <span>
                      <strong className="text-neutral-900">Verification & Dispatch:</strong> Officers assess urgency and dispatch maintenance or clearing crews.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      3
                    </span>
                    <span>
                      <strong className="text-neutral-900">Resolution Tracking:</strong> Field notes and status updates appear in your Household History.
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Card 3: Direct Emergency Hotlines Directory */}
            <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
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
                        BDRRMC Operations
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
                        BFP Fire Station
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
          </div>
        </div>
      )}
    </div>
  );
}
