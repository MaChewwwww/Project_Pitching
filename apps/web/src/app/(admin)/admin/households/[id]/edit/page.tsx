"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { HouseholdWorkspace } from "@/app/(admin)/admin/households/new/page";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";

export default function EditHouseholdPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const householdQuery = useQuery({
    queryKey: ["admin", "household", id],
    queryFn: () =>
      api.get<HouseholdDetailOut>(`/admin/households/${id}`).then((r) => r.data),
  });

  if (householdQuery.isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">
        Loading household…
      </div>
    );
  }
  if (!householdQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        Household not found.
      </div>
    );
  }
  return <HouseholdWorkspace household={householdQuery.data} />;
}
