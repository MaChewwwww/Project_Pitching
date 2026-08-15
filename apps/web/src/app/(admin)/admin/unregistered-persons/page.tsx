"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Eye,
  Home,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { WalkInSummaryCards } from "@/components/features/safety/walk-in-summary-cards";
import { UnregisteredPersonForm } from "@/components/features/safety/unregistered-person-form";
import {
  Dialog,
  DialogContent,
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
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { Page } from "@/lib/api/public-types";
import type { HouseholdOut } from "@/lib/api/registry-types";
import type { EmergencyEventOut, UnregisteredPersonOut } from "@/lib/api/safety-types";

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
      toast.success(`"${person.full_name}" converted into official household member.`);
      setOpen(false);
      onDone();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3 cursor-pointer shadow-2xs"
          title="Add to existing household"
        >
          <UserPlus className="size-3.5 mr-1" />
          Add to Household
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            Convert to Official Member
          </DialogTitle>
          <p className="text-xs text-neutral-500">
            Assign <strong className="text-neutral-800">{person.full_name}</strong> to an existing household registry entry.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-neutral-700">
              Household Head & Reference No. <span className="text-rose-500">*</span>
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select target household...</option>
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
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-neutral-700">
                Sex <span className="text-rose-500">*</span>
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-neutral-700">
              Relationship to Head <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spouse, Son, Daughter, Grandparent..."
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <Button
            disabled={!householdId || !birthDate || !relationship || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="mt-2 h-10 w-full rounded-xl bg-emerald-700 font-bold text-white shadow-sm hover:bg-emerald-800 cursor-pointer"
          >
            {mutation.isPending ? "Converting..." : "Convert to Official Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getEventTypeBadge(type?: string) {
  switch (type?.toLowerCase()) {
    case "flood":
      return {
        label: "Flood",
        className: "bg-sky-100 text-sky-800 border-sky-300",
      };
    case "typhoon":
      return {
        label: "Typhoon",
        className: "bg-indigo-100 text-indigo-800 border-indigo-300",
      };
    case "fire":
      return {
        label: "Fire",
        className: "bg-rose-100 text-rose-800 border-rose-300",
      };
    case "earthquake":
      return {
        label: "Earthquake",
        className: "bg-amber-100 text-amber-800 border-amber-300",
      };
    case "landslide":
      return {
        label: "Landslide",
        className: "bg-orange-100 text-orange-800 border-orange-300",
      };
    default:
      return {
        label: type ? type.charAt(0).toUpperCase() + type.slice(1) : "General",
        className: "bg-purple-100 text-purple-800 border-purple-300",
      };
  }
}

export default function AdminUnregisteredPersonsPage() {
  useRequireRole("admin", "bhw");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [eventId, setEventId] = React.useState("all");
  const [conversion, setConversion] = React.useState("unresolved");
  const [supportFilter, setSupportFilter] = React.useState("all");
  const [centerFilter, setCenterFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const eventsQuery = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });

  const activeEvent = eventsQuery.data?.find((e) => e.is_active);

  const resolvedEventId =
    eventId === "all"
      ? activeEvent?.id || eventsQuery.data?.[0]?.id || ""
      : eventId;

  const peopleQuery = useQuery({
    queryKey: ["admin", "unregistered-persons", resolvedEventId, conversion],
    queryFn: () =>
      api
        .get<Page<UnregisteredPersonOut>>("/admin/unregistered-persons", {
          params: {
            event_id: resolvedEventId || undefined,
            include_converted: true,
            size: 100,
          },
        })
        .then((response) => response.data),
    enabled: Boolean(resolvedEventId),
  });

  const eventsMap = React.useMemo(() => {
    const map = new Map<string, EmergencyEventOut>();
    for (const evt of eventsQuery.data ?? []) {
      map.set(evt.id, evt);
    }
    return map;
  }, [eventsQuery.data]);

  const rawPeople = React.useMemo(
    () => peopleQuery.data?.items ?? [],
    [peopleQuery.data?.items],
  );

  // Filtered dataset
  const filteredPeople = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawPeople.filter((p) => {
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.contact_number && p.contact_number.toLowerCase().includes(q)) ||
        (p.evac_center_name && p.evac_center_name.toLowerCase().includes(q)) ||
        (p.location_note && p.location_note.toLowerCase().includes(q));

      const matchesConversion =
        conversion === "all"
          ? true
          : conversion === "converted"
          ? Boolean(p.converted_member_id)
          : !p.converted_member_id;

      const matchesCenter =
        centerFilter === "all" ||
        (centerFilter === "none" ? !p.evac_center_id : p.evac_center_id === centerFilter);

      const hasSpecialNeeds =
        p.is_child ||
        p.is_senior ||
        p.is_pwd ||
        p.is_pregnant ||
        p.is_lactating ||
        p.has_chronic_condition ||
        p.is_bedridden;

      const matchesSupport =
        supportFilter === "all" ||
        (supportFilter === "with_special_needs" && hasSpecialNeeds) ||
        (supportFilter === "without_special_needs" && !hasSpecialNeeds) ||
        (supportFilter === "pwd" && p.is_pwd) ||
        (supportFilter === "senior" && p.is_senior) ||
        (supportFilter === "minor" && p.is_child) ||
        (supportFilter === "pregnant" && p.is_pregnant) ||
        (supportFilter === "lactating" && p.is_lactating) ||
        (supportFilter === "chronic" && p.has_chronic_condition) ||
        (supportFilter === "bedridden" && p.is_bedridden);

      return matchesSearch && matchesConversion && matchesCenter && matchesSupport;
    });
  }, [rawPeople, search, conversion, centerFilter, supportFilter]);

  // Center choices for filter dropdown
  const centers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of rawPeople) {
      if (p.evac_center_id && p.evac_center_name) {
        map.set(p.evac_center_id, p.evac_center_name);
      }
    }
    return Array.from(map.entries());
  }, [rawPeople]);

  const totalPages = Math.max(1, Math.ceil(filteredPeople.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filteredPeople.slice(startIndex, startIndex + pageSize);

  const isFiltered = Boolean(
    search ||
      eventId !== "all" ||
      conversion !== "unresolved" ||
      centerFilter !== "all" ||
      supportFilter !== "all",
  );

  function resetFilters() {
    setSearch("");
    setEventId("all");
    setConversion("unresolved");
    setCenterFilter("all");
    setSupportFilter("all");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Page Header */}
      <AdminPageHeader
        title="Unregistered Persons"
        description="Event-scoped walk-ins and field-assisted evacuees. Track triage status, special needs, and convert records into official household members."
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
              >
                <Plus aria-hidden className="size-4 stroke-[2.5]" />
                <span>Record Walk-In Person</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-black text-slate-900">
                  Record an Unregistered Person
                </DialogTitle>
              </DialogHeader>
              <UnregisteredPersonForm
                eventId={resolvedEventId}
                onDone={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Top Summary Statistics Cards */}
      <WalkInSummaryCards
        people={rawPeople}
        activeEventName={
          eventsQuery.data?.find((e) => e.id === resolvedEventId)?.name ||
          activeEvent?.name ||
          "Active Emergency Event"
        }
      />

      {/* Attached DataTable Container */}
      <section className="overflow-hidden rounded-[14px] border border-primary-200/80 bg-white shadow-sm-card">
        {/* Attached Search, Filters & Action Toolbar */}
        <div className="border-b border-primary-100/80 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 p-3 sm:px-4">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input (Left) */}
            <div className="flex items-center">
              <label className="relative block min-w-[220px] sm:w-72 md:w-80">
                <span className="sr-only">Search walk-in records</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, phone, address..."
                  className="h-9.5 w-full rounded-full border border-neutral-200/90 bg-white/95 pr-9 pl-9.5 text-xs shadow-2xs transition outline-none placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </label>
            </div>

            {/* Filters & Action Button (Right Aligned) */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
              {isFiltered && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetFilters}
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X aria-hidden className="size-3.5 shrink-0 text-neutral-500" />
                  <span>Reset</span>
                </Button>
              )}

              {/* Emergency Event Selector */}
              <Select
                value={eventId}
                onValueChange={(v) => {
                  setEventId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[155px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent className="z-[3000] min-w-[320px] overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                  <SelectItem value="all">
                    <span className="font-semibold text-neutral-800">
                      {activeEvent ? `${activeEvent.name} (Active)` : "Current Active Event"}
                    </span>
                  </SelectItem>
                  {eventsQuery.data?.map((event) => {
                    const badge = getEventTypeBadge(event.type);
                    return (
                      <SelectItem key={event.id} value={event.id} className="cursor-pointer py-1.5">
                        <span className="font-medium text-slate-800 truncate min-w-0 flex-1 pr-2">{event.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {event.is_active ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
                              Concluded
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Evacuation Center Selector */}
              <Select
                value={centerFilter}
                onValueChange={(v) => {
                  setCenterFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[140px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                  <Building2 aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent className="z-[3000] min-w-52 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                  <SelectItem value="all">All Evacuation Centers</SelectItem>
                  <SelectItem value="none">Field / No Center</SelectItem>
                  {centers.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Special Needs Demographics Selector */}
              <Select
                value={supportFilter}
                onValueChange={(v) => {
                  setSupportFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[135px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                  <SlidersHorizontal aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <SelectValue placeholder="Demographics" />
                </SelectTrigger>
                <SelectContent className="z-[3000] min-w-52 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                  <SelectItem value="all">All Demographics</SelectItem>
                  <SelectItem value="with_special_needs">With Special Needs</SelectItem>
                  <SelectItem value="without_special_needs">No Special Needs</SelectItem>
                  <SelectItem value="minor">Minor (5–17 y/o)</SelectItem>
                  <SelectItem value="senior">Senior Citizen (60+)</SelectItem>
                  <SelectItem value="pwd">PWD</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="lactating">Lactating Mother</SelectItem>
                  <SelectItem value="chronic">Chronic Condition</SelectItem>
                  <SelectItem value="bedridden">Mobility-limited</SelectItem>
                </SelectContent>
              </Select>

              {/* Conversion Selector */}
              <Select
                value={conversion}
                onValueChange={(v) => {
                  setConversion(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs transition-all hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                  <UserCheck aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <SelectValue placeholder="Registry State" />
                </SelectTrigger>
                <SelectContent className="z-[3000] min-w-44 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md">
                  <SelectItem value="unresolved">Unconverted Only</SelectItem>
                  <SelectItem value="converted">Official Citizens</SelectItem>
                  <SelectItem value="all">All Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-primary-900 shadow-[0_1px_0_0_var(--color-primary-800)] text-primary-50">
              <tr className="hover:bg-primary-900 border-primary-800">
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Walk-In Citizen</th>
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Emergency Event</th>
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Evacuation Center</th>
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Location Address</th>
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Priority Needs</th>
                <th className="h-11 px-4 text-[11px] font-bold tracking-[0.08em] uppercase text-white">Registry Status</th>
                <th className="h-11 px-4 text-right text-[11px] font-bold tracking-[0.08em] uppercase text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/80">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-2xs">
                        <UserX className="size-6 text-emerald-700" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900">No walk-in records found</p>
                      <p className="text-xs text-neutral-500 max-w-sm">
                        {isFiltered
                          ? "No unregistered persons match your active filter criteria."
                          : "No unregistered persons have checked in for this emergency event yet."}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setDialogOpen(true)}
                        className="mt-2 inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                      >
                        <UserPlus className="size-3.5" />
                        Record First Walk-In Person
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((person, index) => {
                  const flags: string[] = [];
                  if (person.is_child) flags.push("Minor");
                  if (person.is_senior) flags.push("Senior");
                  if (person.is_pwd) flags.push("PWD");
                  if (person.is_pregnant) flags.push("Pregnant");
                  if (person.is_lactating) flags.push("Lactating");
                  if (person.has_chronic_condition) flags.push("Chronic");
                  if (person.is_bedridden) flags.push("Bedridden");

                  return (
                    <tr
                      key={person.id}
                      className={`border-primary-100/80 transition-colors hover:bg-primary-50/80 ${
                        index % 2 === 1 ? "bg-emerald-50/35" : ""
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/unregistered-persons/${person.id}` as Route}
                          className="font-bold text-neutral-950 hover:text-emerald-800 hover:underline block"
                        >
                          {person.full_name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>{person.contact_number || "No contact"}</span>
                          {person.recorded_by_name && (
                            <span className="text-[10.5px] text-neutral-400">
                              · by {person.recorded_by_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Emergency Event */}
                      <td className="py-3 px-4">
                        {(() => {
                          const evt = eventsMap.get(person.event_id);
                          if (!evt) return <span className="text-neutral-400 italic">—</span>;
                          return (
                            <div>
                              <span className="block font-semibold text-neutral-900 max-w-[160px] truncate" title={evt.name}>
                                {evt.name}
                              </span>
                              {evt.is_active ? (
                                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">
                                  Concluded
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Evacuation Center */}
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {person.evac_center_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate max-w-[150px] font-semibold text-neutral-900" title={person.evac_center_name}>
                              {person.evac_center_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Field / No Center</span>
                        )}
                      </td>

                      {/* Location Address */}
                      <td className="py-3 px-4 text-neutral-600 max-w-[180px]">
                        {person.location_note ? (
                          <span className="truncate block font-medium" title={person.location_note}>
                            {person.location_note}
                          </span>
                        ) : person.location ? (
                          <span className="text-emerald-700 text-[11px] font-mono">GPS Pinned</span>
                        ) : (
                          <span className="text-neutral-400 italic">—</span>
                        )}
                      </td>

                      {/* Special Needs */}
                      <td className="py-3 px-4">
                        {flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {flags.map((flag) => (
                              <Badge
                                key={flag}
                                tone={
                                  flag === "Pregnant" || flag === "Lactating" || flag === "Chronic" || flag === "Bedridden"
                                    ? "danger"
                                    : "warning"
                                }
                                className="text-[10px] px-1.5 py-0 font-bold"
                              >
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Registry Status */}
                      <td className="py-3 px-4">
                        {person.converted_member_id ? (
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/admin/citizens/${person.converted_member_id}` as Route}
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline text-xs"
                            >
                              <CheckCircle2 className="size-3 text-emerald-700" />
                              Official Member
                            </Link>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300">
                            Unconverted
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-neutral-600 hover:text-emerald-800 hover:bg-emerald-50"
                            title="View Profile"
                          >
                            <Link href={`/admin/unregistered-persons/${person.id}` as Route}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>

                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-neutral-600 hover:text-amber-800 hover:bg-amber-50"
                            title="Edit Details"
                          >
                            <Link href={`/admin/unregistered-persons/${person.id}/edit` as Route}>
                              <Pencil className="size-3.5" />
                            </Link>
                          </Button>

                          {!person.converted_member_id && (
                            <>
                              <AddToHouseholdDialog
                                person={person}
                                onDone={() => {
                                  queryClient.invalidateQueries({
                                    queryKey: ["admin", "unregistered-persons"],
                                  });
                                }}
                              />

                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg border-emerald-300 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 px-2 text-xs font-bold"
                                title="Register New Household"
                              >
                                <Link href={`/admin/households/new?from_unregistered=${person.id}` as Route}>
                                  <Home className="size-3.5 mr-1" />
                                  New Household
                                </Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Attached Pagination Footer */}
        <div className="border-t border-primary-100/80 bg-neutral-50/80 px-4 py-3 flex items-center justify-between text-xs">
          <span className="text-[11.5px] font-medium text-neutral-500">
            Showing {filteredPeople.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredPeople.length)} of {filteredPeople.length} walk-in records
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-full px-3 text-xs font-bold cursor-pointer border-neutral-200 bg-white hover:bg-neutral-100"
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-bold text-neutral-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-full px-3 text-xs font-bold cursor-pointer border-neutral-200 bg-white hover:bg-neutral-100"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
