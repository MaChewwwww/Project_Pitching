"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil } from "lucide-react";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { HAZARD_LEVELS } from "@/lib/map";

export default function PortalHazardMapPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });
  if (!household.data)
    return <div className="bg-primary-50 min-h-[50vh] animate-pulse" />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
            Household hazard context
          </p>
          <h1 className="mt-1 text-3xl font-extrabold">Flood hazard map</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            This map places your saved household location over the flood-hazard overlay.
            It does not replace instructions from emergency responders.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/portal/household/edit">
            <Pencil className="size-4" />
            Update location
          </Link>
        </Button>
      </div>
      <PortalHouseholdMap household={household.data} />
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-neutral-200 py-4 text-xs text-neutral-600">
        {HAZARD_LEVELS.map((level) => (
          <span key={level.level} className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: level.color }}
            />
            {level.label}: {level.depth}
          </span>
        ))}
        <a
          className="text-primary-700 ml-auto inline-flex items-center gap-1 font-bold underline"
          href="/hazard-map"
          target="_blank"
          rel="noreferrer"
        >
          Public flood map <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
