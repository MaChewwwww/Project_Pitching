"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  HeartPulse,
  Home,
  MapPin,
  Pencil,
  Phone,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { DetailCardSkeleton } from "@/components/common/portal-loading";
import { StatusBadge } from "@/components/common/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";
import type { Page } from "@/lib/api/public-types";
import type { HouseholdOut } from "@/lib/api/registry-types";
import type { UnregisteredPersonOut } from "@/lib/api/safety-types";

function AddToHouseholdDialog({
  person,
  open,
  onOpenChange,
  onDone,
}: {
  person: UnregisteredPersonOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [householdId, setHouseholdId] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [sex, setSex] = React.useState("female");
  const [relationship, setRelationship] = React.useState("");

  const householdsQuery = useQuery({
    queryKey: ["admin", "households", "conversion-picker"],
    queryFn: () =>
      api
        .get<Page<HouseholdOut>>("/admin/households", { params: { size: 100 } })
        .then((response) => response.data.items),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/households/${householdId}/members/from-unregistered`, {
        unregistered_person_id: person.id,
        birth_date: birthDate,
        sex,
        relationship_to_head: relationship,
      }),
    onSuccess: () => {
      toast.success(`"${person.full_name}" added to official household registry.`);
      onOpenChange(false);
      onDone();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            Add to Official Household
          </DialogTitle>
          <p className="text-xs text-neutral-500">
            Convert walk-in record for{" "}
            <strong className="text-neutral-800">{person.full_name}</strong> into an
            official registered household member.
          </p>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-neutral-700">
              Target Household <span className="text-rose-500">*</span>
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Select an existing household...</option>
              {householdsQuery.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.reference_no} · {h.head_name} ({h.area_name || "San Jose"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-neutral-700">
                Birth Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-neutral-700">
                Sex <span className="text-rose-500">*</span>
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-neutral-700">
              Relationship to Household Head <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spouse, Son, Daughter, Parent..."
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <Button
            disabled={!householdId || !birthDate || !relationship || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="mt-2 h-10 w-full cursor-pointer rounded-xl bg-emerald-700 font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            {mutation.isPending ? "Converting..." : "Convert to Official Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UnregisteredPersonDetailPage() {
  useRequireRole("admin", "bhw");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addHouseholdOpen, setAddHouseholdOpen] = React.useState(false);

  const personId = params.id;

  const {
    data: person,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "unregistered-persons", personId],
    queryFn: () =>
      api
        .get<UnregisteredPersonOut>(`/admin/unregistered-persons/${personId}`)
        .then((res) => res.data),
    enabled: Boolean(personId),
  });

  if (isFetching)
    return <DetailCardSkeleton label="Loading walk-in person details" rows={8} />;

  if (isError || !person) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-6" />
        </div>
        <div className="max-w-md">
          <h2 className="text-base font-bold text-neutral-900">
            Walk-in Record Not Found
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            The requested unregistered person could not be found or has been removed from
            the live event.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/unregistered-persons")}
          className="rounded-full font-bold"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Walk-Ins
        </Button>
      </div>
    );
  }

  const flags: { label: string; tone: "warning" | "danger" | "neutral" }[] = [];
  if (person.is_child) flags.push({ label: "Minor (5–17 y/o)", tone: "warning" });
  if (person.is_senior) flags.push({ label: "Senior Citizen (60+)", tone: "warning" });
  if (person.is_pwd)
    flags.push({ label: "PWD (Person with Disability)", tone: "warning" });
  if (person.is_pregnant) flags.push({ label: "Pregnant", tone: "danger" });
  if (person.is_lactating) flags.push({ label: "Lactating Mother", tone: "danger" });
  if (person.has_chronic_condition)
    flags.push({ label: "Chronic Condition", tone: "danger" });
  if (person.is_bedridden)
    flags.push({ label: "Bedridden / Mobility-limited", tone: "danger" });

  const isConverted = Boolean(person.converted_member_id);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumbs & Actions Header */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link
            href="/admin/unregistered-persons"
            className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
          >
            <ArrowLeft className="size-3.5" />
            Unregistered Walk-Ins
          </Link>
          <span>/</span>
          <span className="max-w-xs truncate font-bold text-neutral-900">
            {person.full_name}
          </span>
        </nav>

        <div className="flex flex-col gap-3 border-b border-neutral-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-neutral-950">
                {person.full_name}
              </h1>
              <StatusBadge kind="safety" status={person.status} setMethod="assisted" />
              {isConverted ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="size-3 text-emerald-700" />
                  Official Citizen Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  Unconverted Walk-In
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Status recorded{" "}
              {formatPhtDateTime(person.status_set_at ?? person.created_at)}
              {person.recorded_by_name && ` · Assisted by ${person.recorded_by_name}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 rounded-full border-neutral-300 px-3.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
            >
              <Link href={`/admin/unregistered-persons/${person.id}/edit` as Route}>
                <Pencil className="mr-1.5 size-3.5" />
                Edit Details
              </Link>
            </Button>

            {!isConverted && (
              <>
                <Button
                  size="sm"
                  onClick={() => setAddHouseholdOpen(true)}
                  className="h-9 cursor-pointer rounded-full bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
                >
                  <UserPlus className="mr-1.5 size-3.5" />
                  Add to Household
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-9 rounded-full border-emerald-300 bg-emerald-50/50 px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <Link
                    href={`/admin/households/new?from_unregistered=${person.id}` as Route}
                  >
                    <Home className="mr-1.5 size-3.5" />
                    New Household
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (7 Cols): Personal Info, Location, Evacuation Station */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Card 1: Personal & Record Info */}
          <Card className="rounded-2xl border border-neutral-200/90 shadow-xs">
            <CardHeader className="border-b border-neutral-100 pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <User className="size-4 text-emerald-700" />
                Personal & Check-in Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Full Name
                </span>
                <p className="mt-0.5 text-sm font-bold text-neutral-900">
                  {person.full_name}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Contact Number
                </span>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                  <Phone className="size-3.5 text-neutral-400" />
                  {person.contact_number || (
                    <span className="text-neutral-400 italic">None provided</span>
                  )}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Safety Status
                </span>
                <div className="mt-1">
                  <StatusBadge
                    kind="safety"
                    status={person.status}
                    setMethod="assisted"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  {person.status === "safe" ? "Marked Safe At" : "Status Recorded At"}
                </span>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                  <Calendar className="size-3.5 text-neutral-400" />
                  {formatPhtDateTime(person.status_set_at ?? person.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Location Address */}
          <Card className="rounded-2xl border border-neutral-200/90 shadow-xs">
            <CardHeader className="border-b border-neutral-100 pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <MapPin className="size-4 text-emerald-700" />
                Origin / Location Address
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-5">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Address Details
                </span>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {person.location_note || (
                    <span className="font-normal text-neutral-400 italic">
                      No specific address note recorded.
                    </span>
                  )}
                </p>
              </div>

              {person.location && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-emerald-700" />
                    <div>
                      <span className="font-bold text-emerald-900">
                        GPS Map Coordinate:
                      </span>
                      <p className="font-mono text-[11px] text-emerald-800">
                        {person.location.coordinates[1].toFixed(5)},{" "}
                        {person.location.coordinates[0].toFixed(5)}
                      </p>
                    </div>
                  </div>
                  <Badge tone="success">Pinned</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Evacuation Station */}
          <Card className="rounded-2xl border border-neutral-200/90 shadow-xs">
            <CardHeader className="border-b border-neutral-100 pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <Building2 className="size-4 text-emerald-700" />
                Assigned Evacuation Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {person.evac_center_name ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-neutral-900">
                      {person.evac_center_name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-700">
                      Checked in on triage roster
                    </p>
                  </div>
                  <Badge tone="success">Sheltered</Badge>
                </div>
              ) : (
                <p className="text-xs font-medium text-neutral-500 italic">
                  Not assigned to an evacuation center (Field operation / mobile triage).
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 Cols): Special Needs & Official Registry Conversion */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Card 4: Special Needs & Demographics */}
          <Card className="rounded-2xl border border-amber-200/90 bg-amber-50/15 shadow-xs">
            <CardHeader className="border-b border-amber-100 pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-amber-950">
                <HeartPulse className="size-4 text-amber-700" />
                Special Needs & Vulnerabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-1.5">
                {flags.length > 0 ? (
                  flags.map((f) => (
                    <Badge key={f.label} tone={f.tone} className="py-1 text-xs font-bold">
                      {f.label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs font-medium text-neutral-500 italic">
                    No priority vulnerability flags recorded.
                  </span>
                )}
              </div>

              {person.chronic_condition_note && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs">
                  <span className="mb-0.5 block font-bold text-rose-900">
                    Medical & Chronic Condition Note:
                  </span>
                  <p className="font-medium text-rose-800">
                    {person.chronic_condition_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 5: Official Registry Conversion */}
          <Card className="border-primary-200/90 rounded-2xl border bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 shadow-xs">
            <CardHeader className="border-b border-emerald-100 pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <UserCheck className="size-4 text-emerald-700" />
                Barangay Registry Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5">
              {isConverted ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-100/70 p-3.5 text-xs text-emerald-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    <div>
                      <p className="font-bold text-emerald-950">
                        Converted to Official Citizen
                      </p>
                      <p className="mt-0.5 text-emerald-800">
                        This person has been registered as an official member in the
                        barangay database.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {person.converted_member_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full justify-between rounded-xl border-emerald-300 bg-white text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                      >
                        <Link
                          href={`/admin/citizens/${person.converted_member_id}` as Route}
                        >
                          <span>View Official Member Profile</span>
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    )}

                    {person.converted_household_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full justify-between rounded-xl border-emerald-300 bg-white text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                      >
                        <Link
                          href={
                            `/admin/households/${person.converted_household_id}` as Route
                          }
                        >
                          <span>View Official Household Record</span>
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-neutral-600">
                    This walk-in person is currently an unconverted temporary record. You
                    can convert them into a permanent household member:
                  </p>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAddHouseholdOpen(true)}
                      className="h-9 w-full cursor-pointer rounded-xl bg-emerald-700 font-bold text-white shadow-xs hover:bg-emerald-800"
                    >
                      <UserPlus className="mr-1.5 size-3.5" />
                      Add to Existing Household
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-9 w-full rounded-xl border-emerald-300 bg-emerald-50/50 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      <Link
                        href={
                          `/admin/households/new?from_unregistered=${person.id}` as Route
                        }
                      >
                        <Home className="mr-1.5 size-3.5" />
                        Register as New Household Head
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add To Household Dialog */}
      <AddToHouseholdDialog
        person={person}
        open={addHouseholdOpen}
        onOpenChange={setAddHouseholdOpen}
        onDone={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] });
        }}
      />
    </div>
  );
}
