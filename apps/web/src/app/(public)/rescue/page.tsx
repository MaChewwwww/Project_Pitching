import type { Metadata } from "next";

import { Attribution } from "@/components/common/attribution";
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
 * Hotlines render alongside the form, not below it — this column comes first
 * in the DOM so it sits above the form on mobile and beside it from `md` up.
 */
export default async function RescuePage() {
  const hotlines = await getHotlines();

  return (
    <>
      <PageHeader
        title="Emergency"
        titleAccent="Rescue Request"
        description="No account needed. Give your name, where you are, and what's happening."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Rescue" }]}
      />

      <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-8 md:grid-cols-2 md:px-6 md:py-12">
        <div className="flex flex-col gap-4">
          <HotlineList hotlines={hotlines} layout="stack" />
          <Attribution disclaimer={["no-rescue-promise", "warning-authority"]} />
        </div>
        <RescueRequestForm />
      </div>
    </>
  );
}
