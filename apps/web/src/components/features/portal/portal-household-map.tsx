"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";

import { HazardMap } from "@/components/features/map/hazard-map";
import { Button } from "@/components/common/button";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";

export function PortalHouseholdMap({
  household,
  preview = false,
}: {
  household: HouseholdDetailOut;
  preview?: boolean;
}) {
  if (!household.location) {
    return (
      <div className="border-y border-neutral-200 py-7 text-center">
        <MapPinned className="mx-auto size-7 text-neutral-400" />
        <p className="mt-3 text-sm font-semibold">
          Add your household location to view flood hazard context.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/portal/household/edit">Update household location</Link>
        </Button>
      </div>
    );
  }
  const [longitude, latitude] = household.location.coordinates;
  return (
    <div
      className={
        preview
          ? "border-primary-900/10 overflow-hidden rounded-2xl border"
          : "border-primary-900/10 overflow-hidden rounded-3xl border bg-white p-2 shadow-sm"
      }
    >
      <HazardMap
        className={preview ? "h-48 sm:h-56" : "h-[min(62vh,640px)]"}
        center={[latitude, longitude]}
        zoom={16}
        interactive={!preview}
        preserveStaticCenter={preview}
        householdMarker={{ position: [latitude, longitude], label: "Your household" }}
      />
    </div>
  );
}
