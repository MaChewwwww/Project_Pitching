"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Check,
  Edit2,
  HeartPulse,
  Home,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  User,
  UsersRound,
  Waves,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HouseholdMemberDialog } from "@/components/features/portal/household-member-dialog";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { RegistryHouseholdForm } from "@/components/features/admin/registry-household-form";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  HouseholdDetailOut,
  HouseholdUpdate,
  MemberOut,
} from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

interface Area {
  id: string;
  name: string;
}

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

export default function PortalHouseholdEditPage() {
  useRequireRole("head");
  const router = useRouter();
  const client = useQueryClient();

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<MemberOut | null>(null);
  const [memberToDelete, setMemberToDelete] = React.useState<MemberOut | null>(null);

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
      toast.success("Household details and coordinates updated successfully");
      client.invalidateQueries({ queryKey: ["me", "household"] });
    },
    onError: (error) => {
      throw new Error(toDisplayError(error).detail);
    },
  });

  const deleteMember = useMutation({
    mutationFn: (memberId: string) => api.delete(`/me/household/members/${memberId}`),
    onSuccess: () => {
      toast.success("Member removed from household");
      setMemberToDelete(null);
      client.invalidateQueries({ queryKey: ["me", "household"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Could not remove member");
    },
  });

  const handleOpenAddMember = () => {
    setSelectedMember(null);
    setMemberDialogOpen(true);
  };

  const handleOpenEditMember = (m: MemberOut) => {
    setSelectedMember(m);
    setMemberDialogOpen(true);
  };

  const household = householdQuery.data;

  if (householdQuery.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-emerald-100/40" />
        <div className="h-[500px] rounded-3xl bg-slate-100" />
        <div className="h-72 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600 shadow-xs">
        Complete onboarding before editing your household.
      </div>
    );
  }

  const members = household.members || [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header (Removed "Back to Household" per user specification) ── */}
      <PortalPageHeader
        icon={Pencil}
        title="Edit Household"
        titleAccent="Details & Location"
        description="Update your address, pinpoint coordinates on the interactive map, and manage registered members for emergency operations."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-neutral-300 bg-white px-4 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50"
            >
              <Link href="/portal/household">
                <Home aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>View Household</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              <Link href="/portal/hazard-map">
                <Waves aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>Flood Hazard Map</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 1. Household Address & Location Form Card ── */}
      <Card className="rounded-3xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
                <MapPin className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-neutral-900">
                  Household Address & Map Pin
                </h2>
                <p className="text-xs text-neutral-500 font-normal">
                  Drag the map pin to update your coordinates and automatically detect your area and flood proximity.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-200/90 px-3.5 py-1 rounded-full shadow-2xs">
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

      {/* ── 2. Household Members Management Section ── */}
      <Card className="rounded-3xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
                <UsersRound className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-neutral-900">
                  Registered Household Members ({members.length})
                </h2>
                <p className="text-xs text-neutral-500 font-normal">
                  Maintain personal profiles, health needs, and emergency support flags.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenAddMember}
              className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              <Plus aria-hidden className="size-3.5 stroke-[2.5]" />
              <span>Add Household Member</span>
            </Button>
          </div>

          {/* Members Grid Roster */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {members.map((member) => {
              const age = computeAge(member.birth_date);
              const isHead = Boolean(member.is_head);

              const specialBadges: Array<{
                label: string;
                bg: string;
                text: string;
                border: string;
              }> = [];

              if (member.is_pwd) {
                specialBadges.push({
                  label: "PWD",
                  bg: "bg-blue-50",
                  text: "text-blue-700",
                  border: "border-blue-200",
                });
              }
              if (member.is_senior || (age !== null && age >= 60)) {
                specialBadges.push({
                  label: "Senior 60+",
                  bg: "bg-amber-50",
                  text: "text-amber-800",
                  border: "border-amber-200",
                });
              }
              if (member.is_pregnant) {
                specialBadges.push({
                  label: "Pregnant",
                  bg: "bg-pink-50",
                  text: "text-pink-700",
                  border: "border-pink-200",
                });
              }
              if (member.is_lactating) {
                specialBadges.push({
                  label: "Lactating",
                  bg: "bg-purple-50",
                  text: "text-purple-700",
                  border: "border-purple-200",
                });
              }
              if (member.is_bedridden) {
                specialBadges.push({
                  label: "Bedridden",
                  bg: "bg-rose-50",
                  text: "text-rose-700",
                  border: "border-rose-200",
                });
              }
              if (member.has_chronic_condition) {
                specialBadges.push({
                  label: "Chronic Care",
                  bg: "bg-teal-50",
                  text: "text-teal-700",
                  border: "border-teal-200",
                });
              }

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs hover:border-emerald-200/90 hover:shadow-xs transition-all gap-4"
                >
                  <div className="space-y-3">
                    {/* Top row: Avatar + Name + Relationship */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-2xs",
                            isHead ? "bg-emerald-700" : "bg-neutral-700",
                          )}
                        >
                          {member.full_name?.trim().charAt(0).toUpperCase() || "M"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-neutral-900 truncate">
                              {member.full_name}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-500 font-medium">
                            {member.relationship_to_head ||
                              (isHead ? "Head of Household" : "Family Member")}
                            {age !== null ? ` · ${age} yrs old` : ""}
                            {member.sex ? ` · ${member.sex === "male" ? "Male" : "Female"}` : ""}
                          </p>
                        </div>
                      </div>

                      {isHead ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 border border-emerald-200/80 px-2.5 py-0.5 text-[9.5px] font-black text-emerald-800 uppercase">
                          Head
                        </span>
                      ) : null}
                    </div>

                    {/* Special Needs Badges */}
                    {specialBadges.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {specialBadges.map((badge) => (
                          <span
                            key={badge.label}
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              badge.bg,
                              badge.text,
                              badge.border,
                            )}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-400 italic">
                        No special vulnerability flags recorded
                      </p>
                    )}

                    {member.has_chronic_condition && member.chronic_condition_note ? (
                      <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-2.5 text-xs text-teal-900">
                        <span className="font-bold text-[11px] uppercase tracking-wider block text-teal-800">
                          Condition Note:
                        </span>
                        <span className="text-[11.5px]">{member.chronic_condition_note}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                    {!isHead ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToDelete(member)}
                        className="h-8 rounded-full px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Remove</span>
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditMember(member)}
                      className="h-8 rounded-full border-neutral-300 px-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50 gap-1.5"
                    >
                      <Edit2 className="size-3" />
                      <span>Edit Profile</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Add / Edit Member Dialog ── */}
      <HouseholdMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        member={selectedMember}
      />

      {/* ── Remove Member Confirmation Dialog ── */}
      <Dialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-lg font-black text-neutral-900">
              Remove Member from Household?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-600">
              Are you sure you want to remove{" "}
              <strong className="text-neutral-900">{memberToDelete?.full_name}</strong> from
              your household emergency roster? This will archive their member profile.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMemberToDelete(null)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (memberToDelete) {
                  deleteMember.mutate(memberToDelete.id);
                }
              }}
              disabled={deleteMember.isPending}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              {deleteMember.isPending ? "Removing..." : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
