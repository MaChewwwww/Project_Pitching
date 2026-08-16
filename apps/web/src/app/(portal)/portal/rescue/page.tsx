"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy, Phone, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/common/button";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { RescueRequestForm } from "@/components/common/rescue-request-form";

export default function PortalRescuePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={LifeBuoy}
        title="Emergency Rescue"
        titleAccent="Dispatch"
        description="Share your exact coordinates and trapped family situation. This logs an immediate triage pin for Barangay San Jose rescue boats and response teams."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-0.5 text-xs font-black text-red-800 shadow-2xs">
            <span className="size-2 rounded-full bg-red-600 animate-ping" />
            <span>Emergency Life-Safety Dispatch</span>
          </span>
        }
      />

      {/* ── Direct Hotlines Urgent Callout ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-50 to-rose-100/60 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
            <Phone className="size-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-800">
              Immediate Critical Life Threat?
            </span>
            <p className="text-xs font-bold text-neutral-900">
              Direct Hotline: (02) 8942-0123 / 0917-812-3456 (24/7 BDRRMC Operations)
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="self-start sm:self-auto rounded-xl bg-red-600 font-black text-white hover:bg-red-700 text-xs"
        >
          <a href="tel:0289420123">Call Hotline Now</a>
        </Button>
      </div>

      {/* ── Rescue Request Form ── */}
      <RescueRequestForm endpoint="/me/rescue-requests" />
    </div>
  );
}
