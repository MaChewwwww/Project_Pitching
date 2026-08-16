"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, UsersRound } from "lucide-react";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { HouseholdSafetyLine } from "@/components/features/portal/household-safety-line";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";

export default function PortalHouseholdPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });
  if (!household.data)
    return <div className="bg-primary-50 min-h-[40vh] animate-pulse" />;
  const data = household.data;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
            Your household
          </p>
          <h1 className="mt-1 text-3xl font-extrabold">{data.reference_no}</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {data.street_address ?? "No street address recorded"} ·{" "}
            {data.area_name ?? "Area not set"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/portal/household/members/new">
              <Plus className="size-4" />
              Add member
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portal/household/edit">
              <Pencil className="size-4" />
              Edit details
            </Link>
          </Button>
        </div>
      </div>
      <section className="border-primary-900/10 border-y py-6">
        <div className="mb-5 flex items-center gap-2">
          <UsersRound className="text-primary-700 size-5" />
          <h2 className="text-xl font-extrabold">People in your household</h2>
        </div>
        <HouseholdSafetyLine members={data.members} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Household location</h2>
        <PortalHouseholdMap household={data} preview />
      </section>
    </div>
  );
}
