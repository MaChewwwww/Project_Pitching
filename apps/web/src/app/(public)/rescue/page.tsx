import type { Metadata } from "next";
import { AlertTriangle, PhoneCall, ShieldAlert, Zap } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { HotlineList } from "@/components/common/hotline-list";
import { PageHeader } from "@/components/common/page-header";
import { RescueRequestForm } from "@/components/common/rescue-request-form";
import { getHotlines } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Emergency Rescue Assistance",
  description:
    "Ask for rescue without an account. Give your name, a pin or a description of where you are, and what's happening.",
};

/**
 * FR-SAF-008/009/017 — no login wall, ever (BR-5.9: requiring registration
 * before rescue would be the single worst design error in this platform).
 *
 * Form is positioned on the primary left column for quick access, flanked by
 * direct emergency phone channels and response guidance on the right.
 */
export default async function RescuePage() {
  const hotlines = await getHotlines();

  return (
    <>
      <PageHeader
        title="Emergency"
        titleAccent="Rescue Request"
        description="No account needed. Provide your details, map location, and situation for immediate emergency response dispatch."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Rescue" }]}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* PRIMARY LEFT COLUMN: Emergency Rescue Request Form (7 columns) */}
          <div className="lg:col-span-7 xl:col-span-7">
            <RescueRequestForm />
          </div>

          {/* SECONDARY RIGHT COLUMN: Hotlines & Response Guidance (5 columns) */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6">
            {/* Quick Response Guidance Banner */}
            <Card radius="xl" className="border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-primary-50/40 shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                    <Zap aria-hidden className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">Emergency Quick Guide</h3>
                    <p className="text-[11.5px] font-medium text-emerald-800">Which channel should you use?</p>
                  </div>
                </div>

                <div className="grid gap-2.5 text-xs">
                  <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-3 flex items-start gap-2.5 shadow-2xs">
                    <span className="grid size-6 place-items-center rounded-md bg-rose-100 text-rose-700 shrink-0 font-bold text-[11px]">📞</span>
                    <div>
                      <span className="font-bold text-neutral-900 block leading-tight">Immediate Life Threat?</span>
                      <span className="text-neutral-600 text-[11.5px] leading-snug block mt-0.5">
                        Tap any hotline below to dial directly. Fastest channel when you have active cellular signal.
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-3 flex items-start gap-2.5 shadow-2xs">
                    <span className="grid size-6 place-items-center rounded-md bg-emerald-100 text-emerald-800 shrink-0 font-bold text-[11px]">📍</span>
                    <div>
                      <span className="font-bold text-neutral-900 block leading-tight">Trapped or Need Rescue Triage?</span>
                      <span className="text-neutral-600 text-[11.5px] leading-snug block mt-0.5">
                        Fill out the form on the left. Pinning your GPS map position logs exact location for rescue boats.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Direct Emergency Hotlines Directory Card */}
            <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm flex flex-col overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      <PhoneCall aria-hidden className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="text-h4 font-bold text-neutral-900">Direct Emergency Hotlines</h2>
                      <p className="text-caption font-medium text-neutral-500">Tap phone icon for instant 1-click call</p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    24/7 Active
                  </span>
                </div>

                {/* Hotline List Stack */}
                <div className="min-w-0">
                  <HotlineList hotlines={hotlines} layout="stack" />
                </div>
              </CardContent>
            </Card>

            {/* Card Footer: Disclaimer & Authority Attribution */}
            <Card radius="xl" className="border-neutral-200/70 bg-neutral-50/50 shadow-2xs">
              <CardContent className="p-4">
                <Attribution disclaimer={["no-rescue-promise", "warning-authority"]} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

