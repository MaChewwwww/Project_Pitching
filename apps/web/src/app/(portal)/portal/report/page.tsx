"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, CircleCheck, FileWarning, Sparkles } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { IncidentReportForm } from "@/components/features/safety/incident-report-form";

export default function PortalReportPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
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
        <Card className="border-emerald-300 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col items-center gap-3.5 p-8 text-center sm:p-10">
            <div className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-neutral-900">
              Incident Report Transmitted
            </h2>
            <p className="max-w-md text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Your geotagged incident report has been forwarded to Barangay San Jose
              disaster coordinators. Thank you for keeping our community safe.
            </p>
            <div className="pt-4 flex flex-wrap gap-2.5 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="rounded-xl font-bold text-xs"
              >
                Submit Another Report
              </Button>
              <Button asChild size="sm" className="rounded-xl font-bold text-xs">
                <Link href="/portal/history">View in History Logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 lg:p-7">
            <IncidentReportForm onDone={() => setSubmitted(true)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
