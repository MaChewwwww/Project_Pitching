"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  BellRing,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Droplets,
  FileText,
  MapPin,
  Pencil,
  Plus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  HouseholdActivityItem,
  HouseholdActivityOut,
  HouseholdDetailOut,
} from "@/lib/api/registry-types";

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
  const { user } = useAuth();
  const client = useQueryClient();
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

  if (householdQuery.isLoading)
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">
        Loading household…
      </div>
    );
  if (!householdQuery.data)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        This household could not be loaded.
      </div>
    );
  const household = householdQuery.data;
  const activity = activityQuery.data;
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
        title={household.reference_no}
        description={`${household.head_name} · ${household.area_name ?? "Area not recorded"}`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/households/${id}/edit`}>
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

      <section className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white lg:col-span-7">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <UsersRound aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="text-overline text-emerald-700">Household Record</p>
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
        <Card className="border-sky-200/80 bg-white lg:col-span-5">
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

      <section className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-overline text-neutral-500">Citizen Roster</p>
                <h2 className="mt-1 text-lg font-bold text-neutral-950">Members</h2>
              </div>
              <Button asChild size="sm">
                <Link href={`/admin/citizens/new?household_id=${id}`}>
                  <Plus aria-hidden className="size-4" />
                  Add Citizen
                </Link>
              </Button>
            </div>
            <div className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {household.members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5"
                >
                  <div className="min-w-0">
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
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/citizens/${member.id}/edit`}>
                        <Pencil aria-hidden className="size-3.5" />
                        Edit
                      </Link>
                    </Button>
                    {!member.is_head && !household.head_user_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={makeHead.isPending}
                        onClick={() => makeHead.mutate(member.id)}
                      >
                        Make Head
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
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
            {activity?.safety ? (
              <>
                <p className="mt-4 text-sm font-semibold text-neutral-900">
                  {activity.safety.event_name}
                </p>
                <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <p className="p-3 text-center text-xs text-neutral-500">
                    <b className="block text-lg text-emerald-700">
                      {activity.safety.safe}
                    </b>
                    Safe
                  </p>
                  <p className="p-3 text-center text-xs text-neutral-500">
                    <b className="block text-lg text-red-700">
                      {activity.safety.needs_rescue}
                    </b>
                    Needs Rescue
                  </p>
                  <p className="p-3 text-center text-xs text-neutral-500">
                    <b className="block text-lg text-neutral-700">
                      {activity.safety.unaccounted}
                    </b>
                    Unaccounted
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No active emergency safety record for this household.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {activityQuery.isLoading ? (
        <p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Loading linked operational records…
        </p>
      ) : null}
      {activityQuery.isError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Linked operational records could not be loaded. Household details remain
          available.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
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
        <Card>
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
        <Card>
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
    </div>
  );
}
