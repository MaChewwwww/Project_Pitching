"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { StatusBadge } from "@/components/common/status-badge";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { UnregisteredPersonForm } from "@/components/features/safety/unregistered-person-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import type { Page } from "@/lib/api/public-types";
import type { HouseholdOut } from "@/lib/api/registry-types";
import type { EmergencyEventOut, UnregisteredPersonOut } from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";

export default function AdminUnregisteredPersonsPage() {
  useRequireRole("admin", "bhw");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [conversion, setConversion] = React.useState("unresolved");
  const [support, setSupport] = React.useState("all");
  const [center, setCenter] = React.useState("all");

  const eventsQuery = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });
  const resolvedEventId =
    eventId ||
    eventsQuery.data?.find((event) => event.is_active)?.id ||
    eventsQuery.data?.[0]?.id ||
    "";
  const peopleQuery = useQuery({
    queryKey: ["admin", "unregistered-persons", resolvedEventId, conversion],
    queryFn: () =>
      api
        .get<Page<UnregisteredPersonOut>>("/admin/unregistered-persons", {
          params: {
            event_id: resolvedEventId,
            include_converted: conversion === "all",
            size: 100,
          },
        })
        .then((response) => response.data),
    enabled: Boolean(resolvedEventId),
  });
  const people = (peopleQuery.data?.items ?? []).filter(
    (person) =>
      (status === "all" || person.status === status) &&
      (conversion === "all" || !person.converted_member_id) &&
      (support === "all" || person[support as keyof UnregisteredPersonOut] === true) &&
      (center === "all" ||
        (center === "none" ? !person.evac_center_id : person.evac_center_id === center)),
  );
  const centers = Array.from(
    new Map(
      (peopleQuery.data?.items ?? [])
        .filter((person) => person.evac_center_id)
        .map((person) => [
          person.evac_center_id!,
          person.evac_center_name ?? "Evacuation center",
        ]),
    ),
  );

  const columns: ResourceColumn<UnregisteredPersonOut>[] = [
    { key: "full_name", header: "Name" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge kind="safety" status={row.status} setMethod="assisted" />
      ),
    },
    {
      key: "contact_number",
      header: "Contact",
      render: (row) => row.contact_number ?? "—",
    },
    {
      key: "evac_center_name",
      header: "Evacuation center",
      render: (row) => row.evac_center_name ?? "No center",
    },
    {
      key: "location_note",
      header: "Location",
      render: (row) =>
        row.location_note ?? (row.location ? "Pinned on map" : "Optional / not recorded"),
    },
    {
      key: "converted_member_id",
      header: "Registry",
      render: (row) =>
        row.converted_member_id ? (
          <div className="flex flex-col gap-1">
            <Link
              className="text-primary-700 font-semibold underline"
              href={`/admin/citizens/${row.converted_member_id}` as Route}
            >
              Official member
            </Link>
            {row.converted_household_id ? (
              <Link
                className="text-primary-700 font-semibold underline"
                href={`/admin/households/${row.converted_household_id}` as Route}
              >
                Official household
              </Link>
            ) : null}
          </div>
        ) : (
          "Unresolved"
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Unregistered Persons"
        description="Event-scoped walk-ins stay visible until they are converted into an official household record. Location is optional; support needs and physical evacuation occupancy are retained."
        action={
          resolvedEventId ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="size-4" />
                  Record person
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record an unregistered person</DialogTitle>
                </DialogHeader>
                <UnregisteredPersonForm
                  eventId={resolvedEventId}
                  onDone={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
      <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Filter label="Emergency event" value={resolvedEventId} onChange={setEventId}>
          {eventsQuery.data?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
              {event.is_active ? " · active" : " · ended"}
            </option>
          ))}
        </Filter>
        <Filter label="Status" value={status} onChange={setStatus}>
          <option value="all">All statuses</option>
          <option value="safe">Safe</option>
          <option value="needs_rescue">Needs rescue</option>
          <option value="unaccounted">Unaccounted</option>
        </Filter>
        <Filter label="Conversion" value={conversion} onChange={setConversion}>
          <option value="unresolved">Unresolved</option>
          <option value="all">All records</option>
        </Filter>
        <Filter label="Support need" value={support} onChange={setSupport}>
          <option value="all">All support needs</option>
          <option value="is_child">Child</option>
          <option value="is_senior">Senior</option>
          <option value="is_pwd">PWD</option>
          <option value="is_pregnant">Pregnant</option>
          <option value="is_lactating">Lactating</option>
          <option value="has_chronic_condition">Chronic condition</option>
          <option value="is_bedridden">Mobility-limited</option>
        </Filter>
        <Filter label="Evacuation center" value={center} onChange={setCenter}>
          <option value="all">All center states</option>
          <option value="none">No center</option>
          {centers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Filter>
      </div>
      <ResourceTable
        columns={columns}
        data={people}
        isLoading={peopleQuery.isLoading}
        isError={peopleQuery.isError}
        onRetry={() => peopleQuery.refetch()}
        emptyTitle="No matching unregistered persons"
        emptyDescription="Adjust the filters or record a walk-in for the selected event."
        getRowKey={(row) => row.id}
        rowActions={(row) =>
          !row.converted_member_id ? (
            <div className="flex flex-wrap gap-2">
              <AddToHouseholdDialog
                person={row}
                onDone={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["admin", "unregistered-persons"],
                  })
                }
              />
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/households/new?from_unregistered=${row.id}`}>
                  <ArrowRight className="size-3.5" />
                  Create household
                </Link>
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-visible:ring-primary-500 min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal focus-visible:ring-2 focus-visible:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function AddToHouseholdDialog({
  person,
  onDone,
}: {
  person: UnregisteredPersonOut;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
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
      toast.success("Added to official household");
      setOpen(false);
      onDone();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add to household
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {person.full_name} to a household</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Filter label="Household" value={householdId} onChange={setHouseholdId}>
            <option value="">Select household</option>
            {householdsQuery.data?.map((household) => (
              <option key={household.id} value={household.id}>
                {household.reference_no} · {household.head_name}
              </option>
            ))}
          </Filter>
          <label className="text-xs font-semibold text-neutral-600">
            Birth date
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm font-normal"
            />
          </label>
          <Filter label="Sex" value={sex} onChange={setSex}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Filter>
          <label className="text-xs font-semibold text-neutral-600">
            Relationship to head
            <input
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm font-normal"
            />
          </label>
          <Button
            disabled={!householdId || !birthDate || !relationship || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Convert to official member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
