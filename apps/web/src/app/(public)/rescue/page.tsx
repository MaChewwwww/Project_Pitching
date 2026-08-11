import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { HotlineList } from "@/components/common/hotline-list";
import { PageHeader } from "@/components/common/page-header";
import { RescueRequestForm } from "@/components/common/rescue-request-form";
import { getHotlines } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Ask for rescue",
  description:
    "Ask for rescue without an account. Give your name, a pin or a description of where you are, and what's happening.",
};

/**
 * FR-SAF-008/009/017 — no login wall, ever (BR-5.9: requiring registration
 * before rescue would be the single worst design error in this platform).
 *
 * Hotlines render alongside the form in symmetrical elevated card containers.
 */
export default async function RescuePage() {
  const hotlines = await getHotlines();

  return (
    <>
      <PageHeader
        title="Emergency"
        titleAccent="Rescue Request"
        description="No account needed. Provide your details, map location, and situation for immediate emergency response."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Rescue" }]}
      />

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
          {/* LEFT COLUMN: Emergency Call Directory Card */}
          <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm flex flex-col h-full overflow-hidden">
            <CardContent className="p-4 sm:p-5 flex flex-col gap-4 h-full">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                    <PhoneCall aria-hidden className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-h4 font-bold text-neutral-900">Direct Emergency Hotlines</h2>
                    <p className="text-caption font-medium text-neutral-500">Tap phone button for instant 1-click call</p>
                  </div>
                </div>
                <span className="text-[10.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shrink-0">
                  24/7 Active
                </span>
              </div>

              {/* Hotline List Stack */}
              <div className="flex-1 overflow-y-auto pr-0.5">
                <HotlineList hotlines={hotlines} layout="stack" />
              </div>

              {/* Card Footer: Disclaimer */}
              <div className="pt-3 border-t border-neutral-100 mt-auto">
                <Attribution disclaimer={["no-rescue-promise", "warning-authority"]} />
              </div>
            </CardContent>
          </Card>

          {/* RIGHT COLUMN: Emergency Rescue Request Form Card */}
          <RescueRequestForm />
        </div>
      </div>
    </>
  );
}
