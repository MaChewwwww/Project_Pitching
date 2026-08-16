"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, LogOut, Plus, Search, Sparkles, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, toDisplayError } from "@/lib/api/client";
import type { EvacCheckinOut, PublicEmergencyEvent } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

interface HouseholdMember {
  id: string;
  full_name: string;
  household_ref: string;
}

export function EvacCheckinManagerDialog({
  centerId,
  centerName,
  capacity,
  trigger,
}: {
  centerId: string;
  centerName: string;
  capacity: number | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [personName, setPersonName] = React.useState("");
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = React.useState<string>("");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [eventId, setEventId] = React.useState("");

  const queryClient = useQueryClient();
  const { data: activeEvents } = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((response) => response.data),
    enabled: open,
  });
  const resolvedEventId = eventId || activeEvents?.[0]?.id || "";

  // Query active check-ins for this center
  const { data: checkins, isLoading } = useQuery({
    queryKey: ["admin", "evacuation-checkins", centerId],
    queryFn: () =>
      api
        .get<EvacCheckinOut[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
          params: { active_only: false },
        })
        .then((r) => r.data),
    enabled: open,
  });

  // Query household members for autocomplete selection
  const { data: members } = useQuery({
    queryKey: ["admin", "household-members-lookup"],
    queryFn: async () => {
      const res = await api.get<{
        items: Array<{
          id: string;
          reference_no: string;
          members?: Array<{ id: string; full_name: string }>;
        }>;
      }>("/admin/households", { params: { size: 100 } });
      const list: HouseholdMember[] = [];
      for (const h of res.data.items || []) {
        for (const m of h.members || []) {
          list.push({ id: m.id, full_name: m.full_name, household_ref: h.reference_no });
        }
      }
      return list;
    },
    enabled: open,
  });

  const checkinMutation = useMutation({
    mutationFn: async (body: {
      evac_center_id: string;
      member_id?: string | null;
      event_id: string;
      person_name: string;
      checked_in_at?: string | null;
    }) => {
      if (body.member_id) {
        await api.post("/admin/evacuation-centers/check-ins", body);
        return;
      }
      await api.post("/admin/unregistered-persons", {
        event_id: body.event_id,
        evac_center_id: body.evac_center_id,
        full_name: body.person_name,
        initial_status: "safe",
      });
    },
    onSuccess: () => {
      toast.success("Resident checked in successfully");
      setPersonName("");
      setSelectedMemberId(null);
      setCheckedInAt("");
      setSearchFilter("");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-checkins", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Check-in failed");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (checkinId: string) =>
      api.post(`/admin/evacuation-centers/check-ins/${checkinId}/check-out`),
    onSuccess: () => {
      toast.success("Resident checked out successfully");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-checkins", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Check-out failed");
    },
  });

  const activeCheckins = React.useMemo(
    () => (checkins || []).filter((c) => c.checked_out_at === null),
    [checkins],
  );

  const pastCheckins = React.useMemo(
    () => (checkins || []).filter((c) => c.checked_out_at !== null),
    [checkins],
  );

  const filteredMembers = React.useMemo(() => {
    if (!searchFilter.trim() || !members) return [];
    const q = searchFilter.toLowerCase();
    return members
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.household_ref.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [members, searchFilter]);

  const handleSelectMember = (m: HouseholdMember) => {
    setSelectedMemberId(m.id);
    setPersonName(m.full_name);
    setSearchFilter("");
  };

  const handleCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      toast.error("Please enter resident name");
      return;
    }
    if (!resolvedEventId) {
      toast.error("Select an active emergency event");
      return;
    }
    checkinMutation.mutate({
      evac_center_id: centerId,
      member_id: selectedMemberId,
      event_id: resolvedEventId,
      person_name: personName.trim(),
      checked_in_at: checkedInAt ? new Date(checkedInAt).toISOString() : null,
    });
  };

  const maxCap = capacity ?? 0;
  const currentCount = activeCheckins.length;
  const pct = maxCap > 0 ? Math.min(100, Math.round((currentCount / maxCap) * 100)) : 0;
  const isFull = maxCap > 0 && currentCount >= maxCap;
  const isNear = maxCap > 0 && currentCount / maxCap >= 0.8 && !isFull;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-sky-300/80 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-900 cursor-pointer shrink-0"
            title="Check-in Station"
            aria-label={`Check-in Station for ${centerName}`}
          >
            <UserCheck className="size-3.5 text-sky-700" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl lg:max-w-5xl overflow-hidden p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Dark Green Gradient Header */}
        <DialogHeader className="border-b border-emerald-900/40 bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#022c22] p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="size-3.5 text-emerald-400" />
              Shelter Intake & Roster Station
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-mono font-bold shadow-xs",
                isFull ? "bg-rose-500 text-white" : isNear ? "bg-amber-400 text-amber-950" : "bg-emerald-400 text-emerald-950",
              )}
            >
              {currentCount} {maxCap > 0 ? `/ ${maxCap} Capacity (${pct}%)` : "Evacuees Active"}
            </span>
          </div>

          <DialogTitle className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
            <Users className="size-6 text-emerald-400 shrink-0" />
            Station Check-In: {centerName}
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-200/80">
            Log resident intake arrivals, link with verified citizen registry profiles, and manage live roster departures.
          </DialogDescription>
        </DialogHeader>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1">
          {/* Check-In Form (Left Side - 5 cols) */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-5 shadow-2xs">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200/80 pb-2.5">
              <Plus className="size-4 text-emerald-700" />
              New Evacuee Check-In
            </h4>

            {/* Resident Search & Autocomplete */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Search Registered Resident (Optional)
              </Label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search citizen name or HH reference…"
                  value={searchFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchFilter(e.target.value)
                  }
                  className="pl-9 text-xs h-9 rounded-xl bg-white border-slate-300"
                />
              </div>

              {filteredMembers.length > 0 && (
                <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-50 cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900">
                        {m.full_name}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {m.household_ref}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleCheckinSubmit} className="flex flex-col gap-3.5 pt-1">
              {/* Emergency Event */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Emergency Event <span className="text-rose-500 font-bold">*</span>
                </Label>
                <select
                  value={resolvedEventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none shadow-2xs cursor-pointer"
                >
                  {activeEvents && activeEvents.length > 0 ? (
                    activeEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))
                  ) : (
                    <option value="">General Disaster Operations</option>
                  )}
                </select>
              </div>

              {/* Resident Full Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Resident Name <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Full name of evacuee"
                  value={personName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPersonName(e.target.value)
                  }
                  required
                  className="h-10 text-xs rounded-xl bg-white border-slate-300"
                />
                {selectedMemberId && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                    <Check className="size-3" /> Linked to registered citizen profile
                  </span>
                )}
              </div>

              {/* Manual Timestamp Override */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Check-In Timestamp{" "}
                  <span className="font-normal text-slate-500">
                    (Optional manual entry)
                  </span>
                </Label>
                <Input
                  type="datetime-local"
                  value={checkedInAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckedInAt(e.target.value)
                  }
                  className="h-10 text-xs rounded-xl bg-white border-slate-300"
                />
                <span className="text-[10px] text-slate-500">
                  Allows manual backfilling during network recovery.
                </span>
              </div>

              <Button
                type="submit"
                size="sm"
                className="mt-2 h-10 bg-emerald-600 font-bold text-white shadow-xs hover:bg-emerald-700 rounded-xl cursor-pointer"
                disabled={checkinMutation.isPending}
              >
                <Plus className="mr-1.5 size-4" />
                {checkinMutation.isPending ? "Recording Intake..." : "Check In Resident"}
              </Button>
            </form>
          </div>

          {/* Currently Active Evacuees Roster (Right Side - 7 cols) */}
          <div className="flex flex-col gap-3.5 md:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="size-4 text-emerald-700" />
                <span>Active Evacuee Roster</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-800 border border-emerald-300">
                  {activeCheckins.length} Active
                </span>
              </h4>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading live intake records…
              </div>
            ) : activeCheckins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center gap-2">
                <Users className="size-8 text-slate-400" />
                <p className="text-xs font-bold text-slate-700">
                  No active evacuees currently checked in.
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Use the intake form on the left to record incoming arrivals at this shelter site.
                </p>
              </div>
            ) : (
              <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
                {activeCheckins.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.person_name}
                      </span>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-slate-400" />
                          {new Date(c.checked_in_at).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                        {c.recorded_by_name && (
                          <span>• by {c.recorded_by_name}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 rounded-lg border-rose-200 bg-rose-50/60 font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 cursor-pointer text-xs"
                      disabled={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(c.id)}
                    >
                      <LogOut className="mr-1 size-3 text-rose-600" />
                      Check Out
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Past Checkouts History Drawer */}
            {pastCheckins.length > 0 && (
              <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
                <summary className="cursor-pointer font-bold select-none hover:text-emerald-800 flex items-center justify-between">
                  <span>Checked-Out History Log ({pastCheckins.length})</span>
                  <span className="text-[10px] text-slate-500">Click to expand</span>
                </summary>
                <div className="mt-2.5 flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1">
                  {pastCheckins.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] text-slate-600"
                    >
                      <span className="font-semibold text-slate-800">
                        {c.person_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Checked Out:{" "}
                        {c.checked_out_at
                          ? new Date(c.checked_out_at).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
