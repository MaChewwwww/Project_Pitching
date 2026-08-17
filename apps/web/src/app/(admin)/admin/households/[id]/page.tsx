"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  BellRing,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Crown,
  Droplets,
  Eye,
  FileText,
  LayoutDashboard,
  MapPin,
  Pencil,
  Plus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { DetailCardSkeleton, TimelineSkeleton } from "@/components/common/portal-loading";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  HouseholdActivityItem,
  HouseholdActivityOut,
  HouseholdDetailOut,
} from "@/lib/api/registry-types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-neutral-100" /> },
);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function memberFlags(member: HouseholdDetailOut["members"][number]) {
  return [
    member.is_child && "Child",
    member.is_senior && "Senior",
    member.is_pwd && "PWD",
    member.is_pregnant && "Pregnant",
    member.is_lactating && "Lactating",
    member.has_chronic_condition && "Chronic Condition",
    member.is_bedridden && "Mobility-Limited",
  ].filter(Boolean) as string[];
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const HOUSEHOLD_DETAIL_TABS = ["overview", "members", "operations"] as const;
type HouseholdDetailTab = (typeof HOUSEHOLD_DETAIL_TABS)[number];

function isHouseholdDetailTab(value: string | null): value is HouseholdDetailTab {
  return HOUSEHOLD_DETAIL_TABS.some((tab) => tab === value);
}

function ActivityList({
  items,
  empty,
}: {
  items: HouseholdActivityItem[];
  empty: string;
}) {
  if (!items.length) return <p className="py-3 text-sm text-neutral-500">{empty}</p>;
  return (
    <ol className="divide-y divide-neutral-100">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{item.detail}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-neutral-600">{item.status}</p>
            <time className="mt-0.5 block text-[11px] text-neutral-400">
              {formatDate(item.occurred_at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HouseholdDetailPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const householdQuery = useQuery({
    queryKey: ["admin", "household", id],
    queryFn: () =>
      api.get<HouseholdDetailOut>(`/admin/households/${id}`).then((r) => r.data),
  });
  const activityQuery = useQuery({
    queryKey: ["admin", "household", id, "activity"],
    queryFn: () =>
      api
        .get<HouseholdActivityOut>(`/admin/households/${id}/activity`)
        .then((r) => r.data),
  });
  const archive = useMutation({
    mutationFn: () => api.delete(`/admin/households/${id}`),
    onSuccess: () => {
      toast.success("Household archived");
      router.push("/admin/households");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const makeHead = useMutation({
    mutationFn: (memberId: string) => api.post(`/admin/members/${memberId}/make-head`),
    onSuccess: () => {
      toast.success("New household head assigned");
      client.invalidateQueries({ queryKey: ["admin", "household", id] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const archiveMember = useMutation({
    mutationFn: (memberId: string) => api.delete(`/admin/members/${memberId}`),
    onSuccess: () => {
      toast.success("Household member removed");
      setSelectedMemberId(null);
      client.invalidateQueries({ queryKey: ["admin", "household", id] });
      client.invalidateQueries({ queryKey: ["admin", "registry-summary"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  if (householdQuery.isFetching)
    return <DetailCardSkeleton label="Loading household details" rows={8} />;
  if (!householdQuery.data)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        This household could not be loaded.
      </div>
    );
  const household = householdQuery.data;
  const activity = activityQuery.data;
  const selectedMember = household.members.find(
    (member) => member.id === selectedMemberId,
  );
  const tabFromQuery = searchParams.get("tab");
  const activeTab: HouseholdDetailTab = isHouseholdDetailTab(tabFromQuery)
    ? tabFromQuery
    : "overview";
  const selectTab = (tab: HouseholdDetailTab) => {
    router.replace(`/admin/households/${id}?tab=${tab}` as Route, { scroll: false });
  };
  const risk =
    household.waterway_proximity === "very_near"
      ? "High"
      : household.waterway_proximity === "near"
        ? "Medium"
        : household.waterway_proximity === "far"
          ? "Low"
          : "Not recorded";
  const riskTone =
    risk === "High"
      ? "danger"
      : risk === "Medium"
        ? "warning"
        : risk === "Low"
          ? "success"
          : "neutral";

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-10">
      <AdminPageHeader
        title="Household Details"
        description={`${household.head_name} · ${household.area_name ?? "Area not recorded"}`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="warning">
              <Link href={`/admin/households/${id}/edit` as Route}>
                <Pencil aria-hidden className="size-4" />
                Edit Household
              </Link>
            </Button>
            {user?.role === "admin" ? (
              <Button
                size="sm"
                variant="danger"
                disabled={archive.isPending}
                onClick={() =>
                  window.confirm(`Archive ${household.reference_no}?`) && archive.mutate()
                }
              >
                <Archive aria-hidden className="size-4" />
                Archive
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="overflow-visible border-emerald-200/80 bg-white p-0" topAccent>
        <nav
          aria-label="Household detail sections"
          className="grid grid-cols-3 divide-x divide-neutral-200"
        >
          {[
            { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
            { id: "members" as const, label: "Members", icon: UsersRound },
            { id: "operations" as const, label: "Operations", icon: ClipboardCheck },
          ].map(({ id: tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => selectTab(tab)}
              className={`relative flex min-h-13 items-center justify-center gap-2 px-3 text-xs font-bold transition-colors sm:text-sm ${
                activeTab === tab
                  ? "bg-emerald-50/70 text-emerald-800 after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-emerald-600"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span>{label}</span>
              {tab === "members" ? (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] leading-none text-emerald-800">
                  {household.member_count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </Card>

      <section
        className={
          activeTab === "overview" ? "grid items-start gap-4 lg:grid-cols-12" : "hidden"
        }
      >
        <Card
          className="border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white lg:col-span-7"
          topAccent
        >
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <UsersRound aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="text-overline text-emerald-700">Household Snapshot</p>
                  <h2 className="mt-1 text-xl font-bold text-neutral-950">
                    {household.head_name}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {household.member_count} registered citizen
                    {household.member_count === 1 ? "" : "s"} · Registered{" "}
                    {formatDate(household.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={household.source === "self" ? "success" : "neutral"}>
                  {household.source === "self" ? "Self-Registered" : "BHW-Assisted"}
                </Badge>
                <Badge tone={riskTone}>Flood Risk: {risk}</Badge>
                {household.has_possible_duplicate ? (
                  <Badge tone="warning">
                    <CircleAlert aria-hidden className="mr-1 size-3" />
                    Possible Duplicate
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Area
                </p>
                <p className="mt-1 text-sm font-bold text-neutral-900">
                  {household.area_name ?? "Not Recorded"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Contact
                </p>
                <p className="mt-1 text-sm font-bold text-neutral-900">
                  {household.contact_number ??
                    (household.is_unreachable_by_phone
                      ? "No Contact Number"
                      : "Not Recorded")}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Record State
                </p>
                <p className="mt-1 text-sm font-bold text-neutral-900">
                  {household.verified_at ? "Verified" : "Needs Review"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-white lg:col-span-5"
          topAccent
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <MapPin aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-overline text-sky-700">Location</p>
                <h2 className="mt-1 text-base font-bold text-neutral-950">
                  Barangay San Jose, Rodriguez, Rizal
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {household.street_address ?? "Specific address not recorded"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-sky-900">
                <Droplets aria-hidden className="size-4" />
                Waterway Proximity
              </span>
              <span className="font-bold text-sky-950">
                {household.waterway_proximity?.replace("_", " ") ?? "Not recorded"}
              </span>
            </div>
            {household.location ? (
              <LocationPicker
                className="mt-4"
                value={{
                  lat: household.location.coordinates[1],
                  lng: household.location.coordinates[0],
                }}
                onChange={() => undefined}
                readOnly
                caption="Saved household location inside Barangay San Jose."
              />
            ) : (
              <div className="mt-4 grid min-h-40 place-items-center rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 text-center text-sm text-amber-800">
                No map pin recorded for this household.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section
        className={
          activeTab === "members" || activeTab === "operations"
            ? "grid items-start gap-4 lg:grid-cols-12"
            : "hidden"
        }
      >
        <Card
          className={
            activeTab === "members"
              ? "border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/50 lg:col-span-12"
              : "hidden"
          }
          topAccent
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-overline text-emerald-700">
                  Current Household Members
                </p>
                <h2 className="mt-1 text-lg font-bold text-neutral-950">
                  {household.member_count} member{household.member_count === 1 ? "" : "s"}
                </h2>
              </div>
              <Button asChild size="sm">
                <Link href={`/admin/citizens/new?household_id=${id}` as Route}>
                  <Plus aria-hidden className="size-4" />
                  Add Household Member
                </Link>
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {household.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200/90 bg-gradient-to-r from-white to-emerald-50/40 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {memberInitials(member.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-950">
                      {member.full_name}
                      {member.is_head ? (
                        <span className="ml-2 text-xs font-bold text-emerald-700">
                          Head Of Household
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {member.relationship_to_head ?? "Household Head"} ·{" "}
                      {member.sex
                        ? member.sex[0].toUpperCase() + member.sex.slice(1)
                        : "Sex not recorded"}
                      {member.birth_date ? ` · ${member.birth_date}` : ""}
                      {member.contact_number
                        ? ` · ${member.contact_number}`
                        : " · No Contact Number"}
                    </p>
                    {memberFlags(member).length ? (
                      <p className="mt-1 text-xs text-amber-700">
                        {memberFlags(member).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        member.is_head ||
                        makeHead.isPending ||
                        Boolean(household.head_user_id)
                      }
                      className={`size-9 min-h-9 px-0 transition-colors ${
                        member.is_head
                          ? "cursor-not-allowed border-amber-300/80 bg-amber-100/70 text-amber-700 opacity-90"
                          : "cursor-pointer border-amber-200 bg-amber-50/80 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
                      }`}
                      title={
                        member.is_head
                          ? "Current Household Head"
                          : household.head_user_id
                            ? "Linked account head cannot be replaced directly"
                            : `Assign ${member.full_name} as Household Head`
                      }
                      aria-label={
                        member.is_head
                          ? `${member.full_name} is current Household Head`
                          : `Assign ${member.full_name} as Household Head`
                      }
                      onClick={() => !member.is_head && makeHead.mutate(member.id)}
                    >
                      <Crown
                        aria-hidden
                        className={`size-4 shrink-0 ${
                          member.is_head
                            ? "fill-amber-500/40 text-amber-600"
                            : "text-amber-600"
                        }`}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-9 min-h-9 px-0 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                      title={`View ${member.full_name}`}
                      aria-label={`View ${member.full_name}`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      <Eye aria-hidden className="size-4" />
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="size-9 min-h-9 px-0 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      title={`Edit ${member.full_name}`}
                      aria-label={`Edit ${member.full_name}`}
                    >
                      <Link href={`/admin/citizens/${member.id}/edit` as Route}>
                        <Pencil aria-hidden className="size-4" />
                      </Link>
                    </Button>
                    {user?.role === "admin" || user?.role === "superadmin" ? (
                      <ConfirmDeleteButton
                        itemLabel={member.full_name}
                        actionLabel={
                          member.is_head
                            ? "Household head cannot be removed"
                            : "Remove household member"
                        }
                        onConfirm={() => archiveMember.mutate(member.id)}
                        iconOnly
                        disabled={member.is_head || archiveMember.isPending}
                        className="size-9 min-h-9 rounded-lg border border-red-200 bg-red-50 px-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card
          className={
            activeTab === "operations"
              ? "border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-white lg:col-span-12"
              : "hidden"
          }
          topAccent
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <ClipboardCheck aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-overline text-violet-700">Active Emergency</p>
                <h2 className="mt-1 text-lg font-bold text-neutral-950">Safety Status</h2>
              </div>
            </div>
            {activity?.safety.length ? (
              <div className="mt-4 space-y-3">
                {activity.safety.map((eventSafety) => (
                  <div key={eventSafety.event_id}>
                    <p className="mt-4 text-sm font-semibold text-neutral-900">
                      {eventSafety.event_name}
                    </p>
                    <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-neutral-50/50">
                      <p className="p-3 text-center text-xs text-neutral-500">
                        <b className="block text-lg text-emerald-700">
                          {eventSafety.safe}
                        </b>
                        Safe
                      </p>
                      <p className="p-3 text-center text-xs text-neutral-500">
                        <b className="block text-lg text-red-700">
                          {eventSafety.needs_rescue}
                        </b>
                        Needs Rescue
                      </p>
                      <p className="p-3 text-center text-xs text-neutral-500">
                        <b className="block text-lg text-neutral-700">
                          {eventSafety.unaccounted}
                        </b>
                        Unaccounted
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No active emergency safety record for this household.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {activeTab === "operations" && activityQuery.isFetching ? (
        <TimelineSkeleton label="Loading linked operational records" rows={4} />
      ) : null}
      {activeTab === "operations" && activityQuery.isError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Linked operational records could not be loaded. Household details remain
          available.
        </p>
      ) : null}

      <section
        className={activeTab === "operations" ? "grid gap-4 lg:grid-cols-3" : "hidden"}
      >
        <Card className="border-sky-200/80 bg-gradient-to-br from-sky-50/40 via-white to-white">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
              <Clock3 aria-hidden className="size-4 text-sky-700" />
              Evacuation History
            </p>
            <div className="mt-4">
              <ActivityList
                items={activity?.evacuations ?? []}
                empty="No member evacuation check-ins recorded."
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-white">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
              <BellRing aria-hidden className="size-4 text-amber-700" />
              Rescue Requests
            </p>
            <div className="mt-4">
              <ActivityList
                items={activity?.rescues ?? []}
                empty="No rescue requests are linked to this household."
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/40 via-white to-white">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-neutral-950">
              <FileText aria-hidden className="size-4 text-violet-700" />
              Reports By Head
            </p>
            <div className="mt-4">
              <ActivityList
                items={activity?.incident_reports ?? []}
                empty={
                  household.head_user_id
                    ? "No incident reports have been submitted by the linked resident account."
                    : "This household has no linked resident account."
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={Boolean(selectedMember)}
        onOpenChange={(open) => {
          if (!open) setSelectedMemberId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedMember ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {memberInitials(selectedMember.full_name)}
                  </span>
                  {selectedMember.full_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedMember.is_head
                    ? "Head of Household"
                    : (selectedMember.relationship_to_head ?? "Household member")}
                  {selectedMember.is_head
                    ? " · Current household lead"
                    : " · Current household member"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-overline text-neutral-500">Sex</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {selectedMember.sex
                      ? selectedMember.sex[0].toUpperCase() + selectedMember.sex.slice(1)
                      : "Not Recorded"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-overline text-neutral-500">Birthday</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <CalendarDays aria-hidden className="size-3.5 text-emerald-700" />
                    {selectedMember.birth_date
                      ? formatDate(selectedMember.birth_date)
                      : "Not Recorded"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:col-span-2">
                  <p className="text-overline text-neutral-500">Contact Number</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {selectedMember.contact_number ?? "No Contact Number"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-overline text-neutral-500">Readiness Flags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {memberFlags(selectedMember).length ? (
                    memberFlags(selectedMember).map((flag) => (
                      <Badge key={flag} tone="warning">
                        {flag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">No flags recorded</span>
                  )}
                </div>
              </div>
              {!selectedMember.is_head && !household.head_user_id ? (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={makeHead.isPending}
                    onClick={() => makeHead.mutate(selectedMember.id)}
                  >
                    Make Head of Household
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
