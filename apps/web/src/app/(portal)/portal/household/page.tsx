"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Droplets,
  Edit,
  Home,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

function computeAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split("-");
  if (parts.length === 3) {
    const birthYear = parseInt(parts[0], 10);
    if (!Number.isNaN(birthYear)) {
      const currentYear = 2026;
      return Math.max(0, currentYear - birthYear);
    }
  }
  return null;
}

export default function PortalHouseholdPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  if (household.isLoading || !household.data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="h-48 rounded-3xl bg-slate-100" />
        <div className="h-72 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const data = household.data;
  const members = data.members || [];

  const proximityMap: Record<
    string,
    { label: string; tone: string; badge: string; risk: string }
  > = {
    very_near: {
      label: "Very Near: 1 km below",
      tone: "border-red-200 bg-red-50/50 text-red-950",
      badge: "bg-red-100 text-red-700 border-red-300",
      risk: "High Flood Hazard Classification",
    },
    near: {
      label: "Near: 1 – 5 km",
      tone: "border-amber-200 bg-amber-50/50 text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      risk: "Medium Flood Hazard Classification",
    },
    far: {
      label: "Far: 6 km or more",
      tone: "border-emerald-200 bg-emerald-50/50 text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      risk: "Low Flood Hazard Classification",
    },
  };

  const proximity = proximityMap[data.waterway_proximity ?? ""] || proximityMap.far;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={UsersRound}
        title="Household & Citizens"
        titleAccent="Registry"
        description="Official Barangay San Jose household profile, registered family members, and vulnerability records."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>Reference #{data.reference_no}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
            >
              <Link href="/portal/household/members/new">
                <Plus className="size-3.5" />
                Add Citizen
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs font-bold shadow-xs">
              <Link href="/portal/household/edit">
                <Pencil className="size-3.5" />
                Edit Household
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 1. Household Profile Overview Card ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Home className="size-4" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Household Information
              </h2>
            </div>
            <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {data.reference_no}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Head of Household
              </span>
              <p className="text-sm font-bold text-neutral-900">{data.head_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Area / Purok
              </span>
              <p className="text-sm font-bold text-emerald-800">
                {data.area_name ?? "Barangay San Jose"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Contact Phone
              </span>
              <p className="text-sm font-bold text-neutral-900">
                {data.is_unreachable_by_phone ? (
                  <span className="text-amber-700 font-semibold text-xs">
                    Marked unreachable by phone
                  </span>
                ) : (
                  data.contact_number || "No contact number recorded"
                )}
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Street Address
              </span>
              <p className="text-sm font-medium text-neutral-800">
                {data.street_address || "No street address recorded"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Total Family Members
              </span>
              <p className="text-sm font-bold text-neutral-900">
                {members.length} registered citizens
              </p>
            </div>
          </div>

          {/* Waterway Proximity Risk Callout */}
          <div
            className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4",
              proximity.tone,
            )}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/80 text-neutral-800 shadow-2xs">
                <Droplets className="size-4.5" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase tracking-wider text-neutral-500">
                  Waterway Proximity Assessment
                </span>
                <p className="text-sm font-bold text-neutral-900">{proximity.label}</p>
                <p className="text-xs text-neutral-600">{proximity.risk}</p>
              </div>
            </div>
            <span
              className={cn(
                "self-start sm:self-auto rounded-full border px-3 py-1 text-xs font-black",
                proximity.badge,
              )}
            >
              UP NOAH / LiPAD
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Household Citizens Roster Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <UsersRound className="size-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">
                Registered Citizens ({members.length})
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                Profiles, support flags, and age groups linked to this household
              </p>
            </div>
          </div>

          <Button asChild size="sm" className="rounded-xl text-xs font-bold shadow-xs">
            <Link href="/portal/household/members/new">
              <Plus className="size-3.5" />
              <span>Add Member</span>
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => {
            const initial =
              member.full_name?.trim().charAt(0).toUpperCase() || "M";

            const age = computeAge(member.birth_date);
            const isSenior = age !== null && age >= 60;
            const isChild = age !== null && age < 18;

            return (
              <div
                key={member.id}
                className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all"
              >
                <div>
                  {/* Avatar + Name + Relationship Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-neutral-900">
                          {member.full_name}
                        </span>
                        <span className="block truncate text-xs text-neutral-500 font-medium">
                          {member.relationship_to_head ||
                            (member.is_head ? "Household Head" : "Family Member")}
                        </span>
                      </div>
                    </div>

                    {member.is_head ? (
                      <span className="rounded-full bg-emerald-100 border border-emerald-200/80 px-2 py-0.2 text-[10px] font-black text-emerald-800 uppercase">
                        Head
                      </span>
                    ) : null}
                  </div>

                  {/* Citizen Attributes / Demographic Details */}
                  <div className="mt-3.5 space-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Kasarian / Sex:</span>
                      <span className="font-semibold text-neutral-800 capitalize">
                        {member.sex || "Not specified"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Birthday / Age:</span>
                      <span className="font-semibold text-neutral-800">
                        {member.birth_date
                          ? new Date(member.birth_date).toLocaleDateString([], {
                              dateStyle: "medium",
                            })
                          : "Not set"}
                        {age !== null ? ` (${age} yrs)` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Vulnerability & Support Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    {isSenior ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Senior (60+)
                      </span>
                    ) : null}
                    {isChild ? (
                      <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                        Child
                      </span>
                    ) : null}
                    {member.is_pwd ? (
                      <span className="rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                        PWD
                      </span>
                    ) : null}
                    {member.is_pregnant ? (
                      <span className="rounded-md border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-800">
                        Pregnant
                      </span>
                    ) : null}
                    {member.is_lactating ? (
                      <span className="rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                        Lactating
                      </span>
                    ) : null}
                    {member.has_chronic_condition ? (
                      <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                        Chronic Care
                      </span>
                    ) : null}
                    {member.is_bedridden ? (
                      <span className="rounded-md border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-900">
                        Bedridden
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Edit Citizen Profile Action */}
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-bold border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  >
                    <Link href={`/portal/household/members/${member.id}/edit`}>
                      <Edit className="size-3.5" />
                      <span>Edit Profile</span>
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Geographic Location & Flood Map Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <MapPin className="size-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">
                Household Location & Hazard Overlay
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                Geotagged coordinates mapped against Barangay San Jose flood zones
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
            <Link href="/portal/hazard-map">
              <span>Full Hazard Map</span>
            </Link>
          </Button>
        </div>

        <PortalHouseholdMap household={data} preview />
      </section>
    </div>
  );
}
