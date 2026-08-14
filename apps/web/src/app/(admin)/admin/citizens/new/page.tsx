"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdOut, MemberUpdate, RegistryMemberOut } from "@/lib/api/registry-types";

export default function AddHouseholdMemberPage() {
  useRequireRole("admin", "bhw");
  const router = useRouter();
  const search = useSearchParams();
  const client = useQueryClient();

  const [householdId, setHouseholdId] = React.useState(search.get("household_id") ?? "");

  const households = useQuery({
    queryKey: ["admin", "households", "citizen-create"],
    queryFn: () =>
      api.get<{ items: HouseholdOut[] }>("/admin/households", { params: { size: 1000 } }).then((r) => r.data.items),
  });

  const create = useMutation({
    mutationFn: (body: MemberUpdate) => api.post<RegistryMemberOut>(`/admin/households/${householdId}/members`, body),
    onSuccess: (response) => {
      toast.success("Household member added successfully");
      client.invalidateQueries({ queryKey: ["admin", "citizens"] });
      client.invalidateQueries({ queryKey: ["admin", "citizens", "summary"] });
      client.invalidateQueries({ queryKey: ["admin", "households"] });
      router.push(`/admin/citizens/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw new Error(toDisplayError(error).detail);
    },
  });

  const selected = households.data?.find((item) => item.id === householdId);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AdminPageHeader
        title="Add Household Member"
        description="Create a complete citizen profile and place it in an existing registered household."
      />

      <Card className="border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-xs">
            <Home className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="household" className="text-sm font-bold text-neutral-900">
              Household Placement <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-neutral-500">The citizen inherits this household’s area and location context.</p>
          </div>
          <select
            id="household"
            value={householdId}
            onChange={(event) => setHouseholdId(event.target.value)}
            className="h-10 min-w-0 rounded-md border border-emerald-200/80 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-[420px]"
          >
            <option value="">Choose a Household</option>
            {(households.data ?? []).map((household) => (
              <option key={household.id} value={household.id}>
                {household.reference_no} · {household.head_name} · {household.area_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selected ? (
        <RegistryMemberForm
          submitLabel="Add Household Member"
          onSubmit={(values) => create.mutateAsync(values).then(() => undefined)}
          onCancel={() => router.push("/admin/citizens")}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-white p-12 text-center shadow-2xs">
          <UserRoundPlus className="mx-auto size-10 text-emerald-600" />
          <p className="mt-3 text-base font-bold text-neutral-900">Choose a Household to Begin</p>
          <p className="mt-1 text-sm text-neutral-500">
            A citizen must belong to a registered household before their profile can be saved.
          </p>
        </div>
      )}
    </div>
  );
}
