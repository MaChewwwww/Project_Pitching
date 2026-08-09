"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { IncidentReportForm } from "@/components/features/safety/incident-report-form";

/**
 * FR-SAF-015 — authenticated incident reporting. `PortalGate` guarantees a
 * household exists by the time this renders; no household state is needed
 * beyond that, since a report attaches to the reporting user, not their
 * household.
 */
export default function PortalReportPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Report an"
        titleAccent="incident"
        description="Flooding, fire, a fallen tree, a blocked road — let the barangay know what you're seeing."
      />

      {submitted ? (
        <Card className="border-success-border bg-success-bg">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <CircleCheck aria-hidden className="text-success size-8" />
            <p className="text-h4 text-success">Report submitted</p>
            <p className="text-body-sm text-neutral-700">
              The barangay will review it. Thank you for reporting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <IncidentReportForm onDone={() => setSubmitted(true)} />
      )}

      <Link
        href="/portal"
        className="text-body-sm text-primary-700 font-semibold underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
