"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import type { UnregisteredPersonIn, UnregisteredPersonOut, EmergencyEventOut } from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";

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

export function UnregisteredPersonForm({
  onDone,
  eventId,
}: {
  onDone: () => void;
  eventId?: string;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Events query
  const eventsQuery = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });

  const activeEvents = React.useMemo(
    () => eventsQuery.data?.filter((e) => e.is_active) ?? [],
    [eventsQuery.data],
  );
  const concludedEvents = React.useMemo(
    () => eventsQuery.data?.filter((e) => !e.is_active) ?? [],
    [eventsQuery.data],
  );

  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  const effectiveEventId =
    selectedEventId !== null
      ? selectedEventId
      : (eventId && eventId !== "all" ? eventId : (activeEvents[0]?.id || concludedEvents[0]?.id || ""));

  const [selectedCenterId, setSelectedCenterId] = React.useState("none");
  const [fullName, setFullName] = React.useState("");
  const [contactNumber, setContactNumber] = React.useState("");
  const [locationNote, setLocationNote] = React.useState("");

  // Demographics
  const [isInfant, setIsInfant] = React.useState(false);
  const [isChild, setIsChild] = React.useState(false);
  const [isSenior, setIsSenior] = React.useState(false);
  const [isPwd, setIsPwd] = React.useState(false);
  const [isPregnant, setIsPregnant] = React.useState(false);
  const [isLactating, setIsLactating] = React.useState(false);
  const [hasChronicCondition, setHasChronicCondition] = React.useState(false);
  const [chronicNote, setChronicNote] = React.useState("");
  const [isBedridden, setIsBedridden] = React.useState(false);

  // Centers query
  const centersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api
        .get<PublicEvacCenter[]>("/admin/evacuation-centers")
        .then((response) => response.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: UnregisteredPersonIn) =>
      api.post<UnregisteredPersonOut>("/admin/unregistered-persons", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "accounted-for"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      toast.success(`Walk-in person "${fullName.trim()}" recorded and checked in.`);
      onDone();
    },
    onError: (err: unknown) => setServerError(toDisplayError(err).detail),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!fullName.trim()) {
      toast.error("Please enter full name.");
      return;
    }

    mutation.mutate({
      full_name: fullName.trim(),
      contact_number: contactNumber.trim() || null,
      location_note: locationNote.trim() || null,
      initial_status: "safe",
      event_id: effectiveEventId && effectiveEventId !== "none" ? effectiveEventId : null,
      evac_center_id: selectedCenterId === "none" || !selectedCenterId ? null : selectedCenterId,
      is_child: Boolean(isChild || isInfant),
      is_senior: isSenior,
      is_pwd: isPwd,
      is_pregnant: isPregnant,
      is_lactating: isLactating,
      has_chronic_condition: hasChronicCondition,
      chronic_condition_note: chronicNote.trim() || null,
      is_bedridden: isBedridden,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Event and Center Selectors in 2 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Emergency Event */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Emergency Event <span className="text-rose-500">*</span>
          </label>
          <Select
            value={effectiveEventId || "none"}
            onValueChange={(val) => setSelectedEventId(val === "none" ? "" : val)}
          >
            <SelectTrigger className="h-9 w-full rounded-xl border-slate-300 bg-white text-xs font-medium">
              <SelectValue placeholder="Select Emergency Event" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[3000] max-h-64 w-[var(--radix-select-trigger-width)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <SelectItem value="none">
                <span className="text-slate-500">None / General Walk-In (No Event)</span>
              </SelectItem>

              {activeEvents.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50/70 rounded-md my-1">
                    Active Emergency Events
                  </SelectLabel>
                  {activeEvents.map((evt) => {
                    const badge = getEventTypeBadge(evt.type);
                    return (
                      <SelectItem key={evt.id} value={evt.id} className="cursor-pointer py-2">
                        <span className="font-semibold text-slate-900 truncate min-w-0 flex-1 pr-2">{evt.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800">
                            Active
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              )}

              {concludedEvents.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 rounded-md my-1">
                    Previous / Concluded Emergencies
                  </SelectLabel>
                  {concludedEvents.map((evt) => {
                    const badge = getEventTypeBadge(evt.type);
                    return (
                      <SelectItem key={evt.id} value={evt.id} className="cursor-pointer py-2">
                        <span className="font-medium text-slate-700 truncate min-w-0 flex-1 pr-2">{evt.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
                            Concluded
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Evacuation Center */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Evacuation Center <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
            <SelectTrigger className="h-9 w-full rounded-xl border-slate-300 bg-white text-xs font-medium">
              <SelectValue placeholder="No center assigned" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[3000] max-h-64 min-w-[340px] w-[var(--radix-select-trigger-width)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <SelectItem value="none" className="cursor-pointer py-2">
                <span className="text-slate-500">None / Field Operation</span>
              </SelectItem>
              {centersQuery.data?.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer py-2">
                  <span className="font-medium text-slate-900 truncate min-w-0 flex-1 pr-2">
                    {c.facility.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {!c.is_open && (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-500">
                        Closed
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 tabular-nums">
                      {c.occupancy}/{c.capacity ?? "∞"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Full Name & Contact */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Contact Number <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="0912 345 6789"
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Special Needs Checklist */}
      <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
        <legend className="px-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
          Special Needs & Demographics
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs mt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isInfant}
              onChange={(e) => setIsInfant(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Infant / Toddler (0–4 y/o)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isPregnant}
              onChange={(e) => setIsPregnant(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Pregnant</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isChild}
              onChange={(e) => setIsChild(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Minor (5–17 y/o)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isLactating}
              onChange={(e) => setIsLactating(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Lactating Mother</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isSenior}
              onChange={(e) => setIsSenior(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Senior Citizen (60+ y/o)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={hasChronicCondition}
              onChange={(e) => setHasChronicCondition(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Chronic Condition</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isPwd}
              onChange={(e) => setIsPwd(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Person with Disability (PWD)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={isBedridden}
              onChange={(e) => setIsBedridden(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5 shrink-0"
            />
            <span>Bedridden / Mobility-limited</span>
          </label>
        </div>

        {hasChronicCondition && (
          <div className="mt-2.5">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Condition Note / Medication:
            </label>
            <input
              type="text"
              value={chronicNote}
              onChange={(e) => setChronicNote(e.target.value)}
              placeholder="e.g. Maintenance hypertensive meds, asthma inhaler..."
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </fieldset>

      {/* Location Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-700">
          Location Address <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
          placeholder="e.g. Block 3 Area 2 Riverside, Sitio San Jose"
          className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {serverError ? <p className="text-danger text-xs font-medium">{serverError}</p> : null}

      <DialogFooter className="mt-1 flex gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDone}
          className="h-9 rounded-xl px-4 text-xs font-bold cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={mutation.isPending}
          className="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
        >
          {mutation.isPending ? "Recording..." : "Record Walk-In Person"}
        </Button>
      </DialogFooter>
    </form>
  );
}
