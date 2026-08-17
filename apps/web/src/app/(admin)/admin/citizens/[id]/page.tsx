"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  CalendarDays,
  Crown,
  Eye,
  HeartPulse,
  Home,
  LockKeyhole,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { SearchableHouseholdSelect } from "@/components/features/admin/searchable-household-select";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type {
  HouseholdActivityItem,
  HouseholdDetailOut,
  RegistryMemberActivityOut,
  RegistryMemberDetailOut,
} from "@/lib/api/registry-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-56 animate-pulse rounded-xl bg-neutral-100" />,
  },
);

const tabs = ["overview", "household", "activity"] as const;
type Tab = (typeof tabs)[number];

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value))
    : "Not Recorded";

const age = (birth?: string | null) =>
  birth ? Math.floor((Date.now() - new Date(birth).getTime()) / 31557600000) : null;

const flags = (citizen: RegistryMemberDetailOut) =>
  [
    citizen.is_pwd && "PWD",
    citizen.is_pregnant && "Pregnant",
    citizen.is_lactating && "Lactating",
    citizen.has_chronic_condition && "Chronic Condition",
    citizen.is_bedridden && "Mobility-Limited",
  ].filter(Boolean) as string[];

export default function CitizenDetailPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const client = useQueryClient();

  const canAdminister = user?.role === "admin" || user?.role === "superadmin";

  const citizen = useQuery({
    queryKey: ["admin", "citizen", id],
    queryFn: () =>
      api.get<RegistryMemberDetailOut>(`/admin/members/${id}`).then((r) => r.data),
  });

  const household = useQuery({
    queryKey: ["admin", "citizen", id, "household"],
    queryFn: () =>
      api
        .get<HouseholdDetailOut>(`/admin/households/${citizen.data!.household_id}`)
        .then((r) => r.data),
    enabled: Boolean(citizen.data),
  });

  const activity = useQuery({
    queryKey: ["admin", "citizen", id, "activity"],
    queryFn: () =>
      api
        .get<RegistryMemberActivityOut>(`/admin/members/${id}/activity`)
        .then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/members/${id}`),
    onSuccess: () => {
      toast.success("Citizen deleted from registry");
      client.invalidateQueries({ queryKey: ["admin", "citizens"] });
      client.invalidateQueries({ queryKey: ["admin", "citizens", "summary"] });
      router.push("/admin/citizens");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const makeHead = useMutation({
    mutationFn: () => api.post(`/admin/members/${id}/make-head`),
    onSuccess: () => {
      toast.success("Household head updated");
      client.invalidateQueries({ queryKey: ["admin", "citizen", id] });
      client.invalidateQueries({ queryKey: ["admin", "citizen", id, "household"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  if (citizen.isLoading)
    return <div className="min-h-72 animate-pulse rounded-2xl bg-white" />;
  if (!citizen.data)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        Citizen could not be loaded.
      </div>
    );

  const row = citizen.data;
  const current = tabs.includes(search.get("tab") as Tab)
    ? (search.get("tab") as Tab)
    : "overview";

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-10">
      <AdminPageHeader
        title="Citizen Details"
        description={`${row.full_name} · ${row.household_reference_no} · ${row.area_name}`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
            >
              <Link href={`/admin/households/${row.household_id}` as Route}>
                <Home className="size-4" />
                Household Context
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="warning"
              className="cursor-pointer gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              <Link href={`/admin/citizens/${id}/edit` as Route}>
                <Pencil className="size-4" />
                Edit Citizen
              </Link>
            </Button>
            {canAdminister ? (
              row.is_head ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="cursor-not-allowed gap-1.5 border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60"
                  title="Replace or transfer the household head before deleting"
                >
                  <LockKeyhole className="size-4" />
                  Protected Head
                </Button>
              ) : (
                <ConfirmDeleteButton
                  itemLabel={row.full_name}
                  actionLabel="Delete Citizen"
                  confirmLabel="Delete"
                  onConfirm={() => remove.mutate()}
                />
              )
            ) : null}
          </div>
        }
      />

      <nav
        className="grid overflow-hidden rounded-2xl border border-emerald-200 bg-white sm:grid-cols-3"
        aria-label="Citizen detail sections"
      >
        {(
          [
            ["overview", UserRound, "Overview"],
            ["household", UsersRound, "Household"],
            ["activity", ShieldCheck, "Safety & Activity"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() =>
              router.replace(`/admin/citizens/${id}?tab=${key}` as Route, {
                scroll: false,
              })
            }
            className={`flex h-14 cursor-pointer items-center justify-center gap-2 border-b-2 text-sm font-bold transition-colors ${
              current === key
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-transparent text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {current === "overview" ? (
        <Overview citizen={row} />
      ) : current === "household" ? (
        <HouseholdTab
          citizen={row}
          household={household.data}
          onMadeHead={() => makeHead.mutate()}
          makingHead={makeHead.isPending}
        />
      ) : (
        <ActivityTab activity={activity.data} loading={activity.isLoading} />
      )}
    </div>
  );
}

function Overview({ citizen }: { citizen: RegistryMemberDetailOut }) {
  const recordedFlags = flags(citizen);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
              {citizen.full_name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
            <div>
              <p className="text-xl font-bold text-neutral-900">{citizen.full_name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {citizen.is_head ? "Household Head" : citizen.relationship_to_head} ·
                Registered {formatDate(citizen.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Info
              label="Birthday / Age"
              value={`${formatDate(citizen.birth_date)}${age(citizen.birth_date) !== null ? ` · ${age(citizen.birth_date)} yrs` : ""}`}
              icon={CalendarDays}
            />
            <Info
              label="Sex"
              value={
                citizen.sex
                  ? citizen.sex[0].toUpperCase() + citizen.sex.slice(1)
                  : "Not Recorded"
              }
              icon={UserRound}
            />
            <Info
              label="Contact Number"
              value={citizen.contact_number ?? "No Contact Number"}
              icon={Phone}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/50 via-white to-white">
        <CardContent className="p-5">
          <p className="flex items-center gap-2 font-bold text-neutral-900">
            <HeartPulse className="size-5 text-violet-600" />
            Recorded Support Needs
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {recordedFlags.length ? (
              recordedFlags.map((flag) => (
                <Badge key={flag} tone="warning">
                  {flag}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No support needs recorded.</p>
            )}
          </div>
          {citizen.has_chronic_condition && citizen.chronic_condition_note ? (
            <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
              <b>Condition Note:</b> {citizen.chronic_condition_note}
            </p>
          ) : null}
          <p className="mt-5 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            Account Link:{" "}
            {citizen.household_head_user_id && citizen.is_head
              ? "Linked household-head account"
              : "No direct account link"}
            <br />
            Profile updated {formatDate(citizen.updated_at)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function HouseholdTab({
  citizen,
  household,
  onMadeHead,
  makingHead,
}: {
  citizen: RegistryMemberDetailOut;
  household?: HouseholdDetailOut;
  onMadeHead: () => void;
  makingHead: boolean;
}) {
  const [destination, setDestination] = React.useState("");
  const [relationship, setRelationship] = React.useState("Others");
  const client = useQueryClient();

  const makeHeadMember = useMutation({
    mutationFn: (memberId: string) => api.post(`/admin/members/${memberId}/make-head`),
    onSuccess: () => {
      toast.success("New household head assigned");
      client.invalidateQueries({ queryKey: ["admin", "citizen", citizen.id] });
      client.invalidateQueries({ queryKey: ["admin", "citizens"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const transfer = useMutation({
    mutationFn: () =>
      api.post(`/admin/members/${citizen.id}/transfer`, {
        household_id: destination,
        relationship_to_head: relationship,
      }),
    onSuccess: () => {
      toast.success("Citizen transferred");
      client.invalidateQueries({ queryKey: ["admin", "citizen", citizen.id] });
      client.invalidateQueries({ queryKey: ["admin", "citizens"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const point = household?.location
    ? { lat: household.location.coordinates[1], lng: household.location.coordinates[0] }
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <Card className="border-sky-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-sky-700 uppercase">
                  Household Context
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {citizen.household_reference_no}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Headed by {citizen.household_head_name} · {citizen.area_name}
                </p>
              </div>
              <Badge tone={citizen.household.source === "self" ? "success" : "warning"}>
                {citizen.household.source === "self" ? "Self-Registered" : "BHW-Assisted"}
              </Badge>
            </div>
            <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
              <MapPin className="mr-2 inline size-4 text-sky-700" />
              {citizen.household.street_address ?? "Exact address not recorded"}
            </p>
            {point ? (
              <div className="mt-3 overflow-hidden rounded-xl">
                <LocationPicker
                  value={point}
                  onChange={() => undefined}
                  readOnly
                  caption="Saved household map location."
                />
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-amber-200 p-8 text-center text-sm text-amber-700">
                No household pin recorded.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                  Current Household Roster
                </p>
                <h3 className="mt-1 font-bold">
                  {household?.members.length ?? 0} Members
                </h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {household?.members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    member.id === citizen.id
                      ? "border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200"
                      : "border-neutral-200/90 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-950">
                      {member.full_name}
                      {member.id === citizen.id ? (
                        <span className="ml-2 text-xs font-bold text-emerald-700">
                          · Current Citizen
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {member.is_head ? (
                        <span className="font-bold text-amber-700">Household Head</span>
                      ) : (
                        (member.relationship_to_head ?? "Household Member")
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        member.is_head ||
                        makeHeadMember.isPending ||
                        Boolean(citizen.household_head_user_id)
                      }
                      className={`size-8 min-h-8 px-0 transition-colors ${
                        member.is_head
                          ? "cursor-not-allowed border-amber-300/80 bg-amber-100/70 text-amber-700 opacity-90"
                          : "cursor-pointer border-amber-200 bg-amber-50/80 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
                      }`}
                      title={
                        member.is_head
                          ? "Current Household Head"
                          : citizen.household_head_user_id
                            ? "Linked account head cannot be replaced directly"
                            : `Assign ${member.full_name} as Household Head`
                      }
                      aria-label={
                        member.is_head
                          ? `${member.full_name} is current Household Head`
                          : `Assign ${member.full_name} as Household Head`
                      }
                      onClick={() => !member.is_head && makeHeadMember.mutate(member.id)}
                    >
                      <Crown
                        aria-hidden
                        className={`size-3.5 shrink-0 ${
                          member.is_head
                            ? "fill-amber-500/40 text-amber-600"
                            : "text-amber-600"
                        }`}
                      />
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="size-8 min-h-8 px-0 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                      title={`View ${member.full_name}`}
                    >
                      <Link href={`/admin/citizens/${member.id}` as Route}>
                        <Eye aria-hidden className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="size-8 min-h-8 px-0 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      title={`Edit ${member.full_name}`}
                    >
                      <Link href={`/admin/citizens/${member.id}/edit` as Route}>
                        <Pencil aria-hidden className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
        <CardContent className="p-5">
          <p className="text-xs font-bold tracking-wider text-amber-700 uppercase">
            Lifecycle Actions
          </p>
          <h3 className="mt-1 font-bold">Household Placement</h3>
          <p className="mt-1 text-xs text-neutral-500">
            These actions preserve the citizen ID and linked history.
          </p>
          <div className="mt-5 space-y-3">
            {citizen.is_head ? (
              <p className="rounded-xl border bg-white p-3 text-sm text-neutral-700">
                This citizen is the current household head.
              </p>
            ) : (
              <>
                <LifecycleDialog
                  title="Transfer Citizen"
                  description="Move this citizen to another existing household."
                  trigger={
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <ArrowRightLeft className="size-4" />
                      Transfer to Household
                    </Button>
                  }
                >
                  <SearchableHouseholdSelect
                    value={destination}
                    onChange={(val) => setDestination(val)}
                    placeholder="Search Destination Household"
                    excludeHouseholdIds={[citizen.household_id]}
                  />
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-neutral-200 bg-white text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                    >
                      {[
                        "Spouse",
                        "Child",
                        "Parent",
                        "Sibling",
                        "Grandparent",
                        "Grandchild",
                        "Others",
                      ].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!destination || transfer.isPending}
                    onClick={() => transfer.mutate()}
                  >
                    Confirm Transfer
                  </Button>
                </LifecycleDialog>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={onMadeHead}
                  disabled={makingHead || Boolean(citizen.household_head_user_id)}
                >
                  <Crown className="size-4" />
                  Make Household Head
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  <Link href={`/admin/citizens/${citizen.id}/promote` as Route}>
                    <Home className="size-4" />
                    Create New Household
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTab({
  activity,
  loading,
}: {
  activity?: RegistryMemberActivityOut;
  loading: boolean;
}) {
  if (loading) return <div className="min-h-64 animate-pulse rounded-2xl bg-white" />;
  return (
    <div className="space-y-4">
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-white">
        <CardContent className="p-5">
          <p className="flex items-center gap-2 font-bold text-neutral-900">
            <ShieldCheck className="size-5 text-violet-600" />
            Current Emergency Status
          </p>
          {activity?.safety.length ? (
            <div className="mt-4 space-y-2">
              {activity.safety.map((eventSafety) => (
                <div
                  key={eventSafety.event_id}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-2xs"
                >
                  <div>
                    <b className="text-neutral-900">{eventSafety.event_name}</b>
                    <p className="text-xs text-neutral-500">
                      {eventSafety.set_method
                        ? `Recorded via ${eventSafety.set_method}`
                        : "No status has been recorded"}
                    </p>
                  </div>
                  <Badge
                    tone={
                      eventSafety.status === "safe"
                        ? "success"
                        : eventSafety.status === "needs_rescue"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {eventSafety.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">No active emergency event.</p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityCard
          title="Evacuation History"
          icon={Home}
          items={activity?.evacuations ?? []}
          empty="No member-linked evacuation check-ins."
        />
        <ActivityCard
          title="Household-Linked Rescue Requests"
          icon={Activity}
          items={activity?.household_rescues ?? []}
          empty="No rescue requests linked to this household."
        />
        <ActivityCard
          title="Reports by Linked Head"
          icon={ShieldCheck}
          items={activity?.household_reports ?? []}
          empty="No reports submitted by the linked household head."
        />
      </div>
    </div>
  );
}

function ActivityCard({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Home;
  items: HouseholdActivityItem[];
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="flex items-center gap-2 font-bold text-neutral-900">
          <Icon className="size-4 text-emerald-700" />
          {title}
        </p>
        {items.length ? (
          <ol className="mt-4 divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{item.detail}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {item.status} · {formatDate(item.occurred_at)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
        <Icon className="size-3.5 text-emerald-600" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function LifecycleDialog({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
