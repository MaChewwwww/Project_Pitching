"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { RescueRequestForm } from "@/components/common/rescue-request-form";

export default function PortalRescuePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-danger text-xs font-extrabold tracking-[.16em] uppercase">
          Emergency support
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Ask for rescue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          Share your current situation and location. This records your request for
          barangay review; call emergency hotlines when you have an immediate
          life-threatening emergency.
        </p>
      </div>
      <RescueRequestForm endpoint="/me/rescue-requests" />
      <Link
        href="/help"
        className="text-primary-700 inline-flex min-h-11 items-center gap-2 text-sm font-bold underline"
      >
        <LifeBuoy className="size-4" />
        Open emergency hotlines
      </Link>
    </div>
  );
}
