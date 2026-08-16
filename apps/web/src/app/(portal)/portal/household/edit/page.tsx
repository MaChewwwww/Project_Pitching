"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Home, Pencil, Plus, Sparkles, UsersRound } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { RegistryHouseholdForm } from "@/components/features/admin/registry-household-form";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  HouseholdDetailOut,
  HouseholdUpdate,
  MemberUpdate,
} from "@/lib/api/registry-types";

interface Area {
  id: string;
  name: string;
}

export default function PortalHouseholdEditPage() {
  useRequireRole("head");
  const router = useRouter();
  const client = useQueryClient();
  const [adding, setAdding] = React.useState(false);

  const householdQuery = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const areasQuery = useQuery({
    queryKey: ["public", "areas"],
    queryFn: () => api.get<Area[]>("/public/areas").then((r) => r.data),
  });

  const updateHousehold = useMutation({
    mutationFn: (body: HouseholdUpdate) => api.patch("/me/household", body),
    onSuccess: () => {
      toast.success("Household details updated");
      client.invalidateQueries({ queryKey: ["me", "household"] });
    },
    onError: (error) => {
      throw new Error(toDisplayError(error).detail);
    },
  });

  const updateMember = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MemberUpdate }) =>
      api.patch(`/me/household/members/${id}`, body),
    onSuccess: () => {
      toast.success("Citizen profile updated");
      client.invalidateQueries({ queryKey: ["me", "household"] });
    },
    onError: (error) => {
      throw new Error(toDisplayError(error).detail);
    },
  });

  const addMember = useMutation({
    mutationFn: (body: MemberUpdate) => api.post("/me/household/members", body),
    onSuccess: () => {
      toast.success("Citizen added to your household");
      setAdding(false);
      client.invalidateQueries({ queryKey: ["me", "household"] });
    },
    onError: (error) => {
      throw new Error(toDisplayError(error).detail);
    },
  });

  const household = householdQuery.data;

  if (householdQuery.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="h-72 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600 shadow-xs">
        Complete onboarding before editing your household.
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Pencil}
        title="Edit Household"
        titleAccent="Details"
        description="Update your address, pinpoint coordinates on the map, and manage household members for emergency records."
        backHref="/portal/household"
        backLabel="Back to Household"
      />

      {/* ── 1. Household Address & Location Form Card ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Home className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Household Details & Map Location
                </h2>
                <p className="text-xs text-neutral-500">
                  Drag the map pin to update your coordinates and automatically detect your
                  area and flood proximity.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-200/90 px-3 py-1 rounded-full shadow-2xs">
              <Sparkles className="size-3 text-emerald-600" />
              <span>Reference #{household.reference_no}</span>
            </span>
          </div>

          <RegistryHouseholdForm
            household={household}
            areas={areasQuery.data ?? []}
            protectedHead
            onSubmit={(values) =>
              updateHousehold.mutateAsync(values).then(() => undefined)
            }
            onCancel={() => router.push("/portal/household")}
          />
        </CardContent>
      </Card>

      {/* ── 2. Household Citizens Management Section ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <UsersRound className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Household Citizens ({household.members.length})
                </h2>
                <p className="text-xs text-neutral-500">
                  Update personal support flags, health conditions, and relationship roles.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={adding ? "secondary" : "primary"}
              onClick={() => setAdding((val) => !val)}
              className={
                adding
                  ? "h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-xs font-bold"
                  : "h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.98]"
              }
            >
              <Plus aria-hidden className="size-3.5 stroke-[2.5]" />
              <span>{adding ? "Cancel Adding" : "Add Household Member"}</span>
            </Button>
          </div>

          {adding ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 shadow-xs animate-in fade-in-50 duration-200">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-emerald-950">
                  Add New Household Member
                </h3>
                <p className="text-xs text-emerald-700">
                  Fill in birth date, sex, and health needs.
                </p>
              </div>
              <RegistryMemberForm
                submitLabel="Add Household Member"
                onSubmit={(values) =>
                  addMember.mutateAsync(values).then(() => undefined)
                }
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : null}

          {/* Members List */}
          <div className="space-y-4">
            {household.members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-neutral-200/90 bg-neutral-50/40 p-4 sm:p-5 shadow-2xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-emerald-700 text-xs font-bold text-white">
                      {member.full_name?.trim().charAt(0).toUpperCase() || "M"}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">
                        {member.full_name}
                      </p>
                      <span className="text-xs text-neutral-500 font-medium">
                        {member.relationship_to_head ||
                          (member.is_head ? "Household Head" : "Family Member")}
                      </span>
                    </div>
                  </div>

                  {member.is_head ? (
                    <span className="rounded-full bg-emerald-100 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                      Household Head
                    </span>
                  ) : null}
                </div>

                <RegistryMemberForm
                  initial={member}
                  protectedName={Boolean(member.is_head)}
                  submitLabel="Save Profile Changes"
                  onSubmit={(values) =>
                    updateMember
                      .mutateAsync({ id: member.id, body: values })
                      .then(() => undefined)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
