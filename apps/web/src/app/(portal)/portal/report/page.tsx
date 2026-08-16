"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleCheck,
  FileWarning,
  LifeBuoy,
  MapPin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { IncidentReportForm } from "@/components/features/safety/incident-report-form";

export default function PortalReportPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="w-full max-w-6xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={FileWarning}
        title="Report an"
        titleAccent="Incident"
        description="Notify the Barangay San Jose operations desk of rising floodwaters, fallen trees, blocked evacuation routes, or electrical hazards."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-100/90 px-3 py-0.5 text-xs font-black text-amber-900 shadow-2xs">
            <Sparkles className="size-3 text-amber-700" />
            <span>Community Hazard Desk</span>
          </span>
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
                className="rounded-xl text-xs font-bold"
              >
                Submit Another Report
              </Button>
              <Button asChild size="sm" className="rounded-xl text-xs font-bold">
                <Link href="/portal/history">View in History Logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
            <CardContent className="p-0">
              <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <FileWarning className="size-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-[0.14em] text-amber-800 uppercase">
                      Community hazard report
                    </p>
                    <h2 className="mt-0.5 text-lg font-black tracking-tight text-neutral-900">
                      Tell the operations desk what you can see
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                      Include a clear description and a map pin or location note. A photo
                      helps officers verify the situation.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700">
                    <CircleCheck className="size-3.5 text-emerald-700" /> What happened
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700">
                    <MapPin className="size-3.5 text-emerald-700" /> Where it happened
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700">
                    <ShieldAlert className="size-3.5 text-emerald-700" /> Photo if safe
                  </span>
                </div>
              </div>
              <div className="p-5 sm:p-6 lg:p-7">
                <IncidentReportForm onDone={() => setSubmitted(true)} />
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-red-800">
                <LifeBuoy className="size-4" />
                <span className="text-[10px] font-black tracking-[0.14em] uppercase">
                  Immediate danger?
                </span>
              </div>
              <h2 className="mt-2 text-base font-black text-red-950">
                Request rescue instead
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-red-900/80">
                Use rescue for a trapped person, injury, rising water at home, or any
                situation that needs direct assistance.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 w-full rounded-xl bg-red-600 text-xs font-black text-white hover:bg-red-700"
              >
                <Link href="/portal/rescue">
                  <LifeBuoy className="size-3.5" /> Ask for rescue
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="text-[10px] font-black tracking-[0.14em] text-emerald-800 uppercase">
                What happens next
              </p>
              <ol className="mt-3 space-y-3 text-xs leading-relaxed text-neutral-700">
                <li className="flex gap-2.5">
                  <span className="font-black text-emerald-700">01</span>
                  <span>Your report is logged for barangay review.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-black text-emerald-700">02</span>
                  <span>Officers may verify it and coordinate a response.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-black text-emerald-700">03</span>
                  <span>Updates and resolution notes appear in your history.</span>
                </li>
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
