"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import type { UnregisteredPersonIn, UnregisteredPersonOut, EmergencyEventOut } from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";

export function UnregisteredPersonForm({
  onDone,
  eventId,
}: {
  onDone: () => void;
  eventId?: string;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = React.useState(eventId || "");
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

  // Centers query
  const centersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api
        .get<PublicEvacCenter[]>("/admin/evacuation-centers")
        .then((response) => response.data),
  });

  const resolvedEventId =
    selectedEventId ||
    eventId ||
    eventsQuery.data?.find((e) => e.is_active)?.id ||
    eventsQuery.data?.[0]?.id ||
    "";

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
      event_id: resolvedEventId || null,
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
            value={resolvedEventId}
            onValueChange={setSelectedEventId}
          >
            <SelectTrigger className="h-9 w-full rounded-xl border-slate-300 bg-white text-xs font-medium">
              <SelectValue placeholder="Select Emergency Event" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-50 max-h-60 w-[var(--radix-select-trigger-width)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              {eventsQuery.data?.map((evt) => (
                <SelectItem key={evt.id} value={evt.id}>
                  {evt.name} {evt.is_active ? "· Active" : "· Concluded"}
                </SelectItem>
              ))}
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
              className="z-50 max-h-60 w-[var(--radix-select-trigger-width)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <SelectItem value="none">None / Field Operation</SelectItem>
              {centersQuery.data
                ?.filter((c) => c.is_open)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.facility.name} ({c.occupancy}/{c.capacity ?? "∞"})
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
        <div className="grid grid-cols-2 gap-2 text-xs mt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isInfant}
              onChange={(e) => setIsInfant(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Infant / Toddler (0–4 y/o)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isChild}
              onChange={(e) => setIsChild(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Minor (5–17 y/o)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isSenior}
              onChange={(e) => setIsSenior(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Senior Citizen (60+ y/o)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isPwd}
              onChange={(e) => setIsPwd(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            PWD
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isPregnant}
              onChange={(e) => setIsPregnant(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Pregnant
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isLactating}
              onChange={(e) => setIsLactating(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Lactating Mother
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={hasChronicCondition}
              onChange={(e) => setHasChronicCondition(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Chronic Condition
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isBedridden}
              onChange={(e) => setIsBedridden(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            Bedridden / Mobility-limited
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
