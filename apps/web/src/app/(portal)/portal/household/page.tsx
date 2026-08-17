"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Droplets,
  Edit,
  ExternalLink,
  Home,
  Map,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { DetailCardSkeleton, TimelineSkeleton } from "@/components/common/portal-loading";
import { HouseholdMemberDialog } from "@/components/features/portal/household-member-dialog";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut, MemberOut } from "@/lib/api/registry-types";
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
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<MemberOut | null>(null);

  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const handleOpenAddMember = () => {
    setSelectedMember(null);
    setMemberDialogOpen(true);
  };

  const handleOpenEditMember = (m: MemberOut) => {
    setSelectedMember(m);
    setMemberDialogOpen(true);
  };

  if (household.isFetching || !household.data) {
    return (
      <div className="space-y-6">
        <DetailCardSkeleton label="Loading household profile" rows={3} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <DetailCardSkeleton label="Loading household details" rows={6} />
            <TimelineSkeleton label="Loading household members" rows={3} />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <DetailCardSkeleton
              label="Loading location details"
              rows={6}
              className="min-h-96"
            />
          </div>
        </div>
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
        title="Household & Members"
        titleAccent="Registry"
        description="Official Barangay San Jose household profile, registered family members, and vulnerability records."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAddMember}
              className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Plus aria-hidden className="size-4 stroke-[2.5]" />
              <span>Add Household Member</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/portal/household/edit">
                <Pencil aria-hidden className="size-3.5 text-neutral-600" />
                <span>Edit Household</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 2-Column Responsive Layout on Desktop ── */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* ── LEFT COLUMN: Household Profile & Members Roster (7 Cols) ── */}
        <div className="space-y-6 sm:space-y-8 xl:col-span-7">
          {/* 1. Household Profile Overview Card */}
          <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
            <CardContent className="space-y-5 p-5 sm:p-6 lg:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Home className="size-4" />
                  </span>
                  <h2 className="text-base font-bold text-neutral-900">
                    Household Information
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 font-mono text-xs font-black text-emerald-900 shadow-2xs">
                  <Sparkles className="size-3 text-emerald-600" />
                  <span>Reference #{data.reference_no}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <span className="text-xs font-semibold text-amber-700">
                        Marked unreachable by phone
                      </span>
                    ) : (
                      data.contact_number || "No contact number recorded"
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Total Family Members
                  </span>
                  <p className="text-sm font-bold text-neutral-900">
                    {members.length} registered member{members.length === 1 ? "" : "s"}
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
              </div>

              {/* Waterway Proximity Risk Callout */}
              <div
                className={cn(
                  "flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center",
                  proximity.tone,
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/80 text-neutral-800 shadow-2xs">
                    <Droplets className="size-4.5" />
                  </div>
                  <div>
                    <span className="text-[10.5px] font-black tracking-wider text-neutral-500 uppercase">
                      Waterway Proximity Assessment
                    </span>
                    <p className="text-sm font-bold text-neutral-900">
                      {proximity.label}
                    </p>
                    <p className="text-xs text-neutral-600">{proximity.risk}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "self-start rounded-full border px-3 py-1 text-xs font-black sm:self-auto",
                    proximity.badge,
                  )}
                >
                  UP NOAH / LiPAD
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Household Members Roster Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <UsersRound className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-neutral-900 sm:text-lg">
                    Registered Household Members ({members.length})
                  </h2>
                  <p className="text-xs font-normal text-neutral-500">
                    Profiles, support flags, and age groups linked to this household
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleOpenAddMember}
                className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
              >
                <Plus aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>Add Household Member</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {members.map((member) => {
                const initial = member.full_name?.trim().charAt(0).toUpperCase() || "M";

                const age = computeAge(member.birth_date);
                const isSenior = age !== null && age >= 60;
                const isChild = age !== null && age < 18;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-xs"
                  >
                    <div>
                      {/* Avatar + Name + Relationship Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs">
                            {initial}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-neutral-900">
                              {member.full_name}
                            </span>
                            <span className="block truncate text-xs font-medium text-neutral-500">
                              {member.relationship_to_head ||
                                (member.is_head ? "Household Head" : "Family Member")}
                            </span>
                          </div>
                        </div>

                        {member.is_head ? (
                          <span className="py-0.2 rounded-full border border-emerald-200/80 bg-emerald-100 px-2 text-[10px] font-black text-emerald-800 uppercase">
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

                    {/* Edit Member Profile Action */}
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditMember(member)}
                        className="w-full cursor-pointer rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                      >
                        <Edit className="size-3.5" />
                        <span>Edit Profile</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN: Geographic Hazard Map & Data Sources (5 Cols) ── */}
        <div className="space-y-6 sm:space-y-8 xl:col-span-5">
          {/* 1. Geographic Location & Flood Map Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    Household Location & Hazard Overlay
                  </h2>
                  <p className="text-xs font-normal text-neutral-500">
                    5-Year UP NOAH Inundation Overlay
                  </p>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
              >
                <Link href="/portal/hazard-map">
                  <Map aria-hidden className="size-3.5" />
                  <span>Full Map</span>
                </Link>
              </Button>
            </div>

            <PortalHouseholdMap household={data} />
          </section>

          {/* 2. Official Data Sources & Mapping Reference Card (Admin Portal Pattern) */}
          <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
            <CardContent className="space-y-3.5 p-5 text-xs text-neutral-600">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5 font-bold text-neutral-900">
                <Database className="size-4 text-emerald-700" />
                <span>Official Mapping & Hazard Reference</span>
              </div>

              <div className="space-y-2 text-[11.5px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
                  <div>
                    <span className="font-bold text-neutral-900">Jurisdiction: </span>
                    Barangay San Jose, Municipality of Rodriguez (Montalban), Rizal
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Droplets className="mt-0.5 size-3.5 shrink-0 text-sky-600" />
                  <div>
                    <span className="font-bold text-neutral-900">
                      Flood Inundation Data:{" "}
                    </span>
                    UP NOAH / Disaster Risk and Exposure Assessment for Mitigation
                    (DREAM/LiPAD) under ODC-ODbL.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold text-neutral-900">Cartography: </span>
                    Leaflet · © OpenStreetMap contributors · CARTO Voyager Vector Tiles.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px]">
                <span className="font-medium text-neutral-400">
                  BDRRMC Spatial Analytics
                </span>
                <Link
                  href="/hazard-map"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                >
                  <span>Public Flood Map</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Household Member Modal (Add & Edit) ── */}
      <HouseholdMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        member={selectedMember}
      />
    </div>
  );
}
