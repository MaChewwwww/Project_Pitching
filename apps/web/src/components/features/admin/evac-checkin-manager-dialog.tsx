"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LogOut, Plus, Search, UserCheck, Users } from "lucide-react";
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
import { api, toDisplayError } from "@/lib/api/client";
import type { EvacCheckinOut, PublicEmergencyEvent } from "@/lib/api/public-types";

interface HouseholdMember {
  id: string;
  full_name: string;
  household_ref: string;
}

export function EvacCheckinManagerDialog({
  centerId,
  centerName,
  capacity,
}: {
  centerId: string;
  centerName: string;
  capacity: number | null;
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
      toast.success("Resident checked in");
      setPersonName("");
      setSelectedMemberId(null);
      setCheckedInAt("");
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
      toast.success("Resident checked out");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-bold">
          <UserCheck className="size-4 text-emerald-600" />
          Check-in Station
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-6">
        <DialogHeader className="border-b border-neutral-100 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-neutral-900">
            <Users className="size-5 text-emerald-600" />
            Station Check-In: {centerName}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-600">
            Record residents checked in at this facility. Currently active:{" "}
            <strong className="font-extrabold text-emerald-700">
              {activeCheckins.length}
            </strong>
            {capacity ? ` / ${capacity} max capacity` : " evacuees"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
          {/* Check-In Form (Left Side) */}
          <div className="flex flex-col gap-4 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
              <Plus className="size-4 text-emerald-600" />
              New Check-In Record
            </h4>

            {/* Resident Search & Lookup */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-neutral-700">
                Search Registered Resident (Optional)
              </label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search by name or HH ref..."
                  value={searchFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchFilter(e.target.value)
                  }
                  className="pl-9 text-xs"
                />
              </div>
              {filteredMembers.length > 0 && (
                <div className="max-h-36 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-md">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-50"
                    >
                      <span className="font-semibold text-neutral-900">
                        {m.full_name}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500">
                        {m.household_ref}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleCheckinSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-700">
                  Emergency event
                </label>
                <select
                  value={resolvedEventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className="min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {activeEvents?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-700">
                  Resident Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Full name of evacuee"
                  value={personName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPersonName(e.target.value)
                  }
                  required
                  className="text-xs"
                />
                {selectedMemberId && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <Check className="size-3" /> Linked to registered member profile
                  </span>
                )}
              </div>

              {/* Backfilling Timestamp Field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-700">
                  Check-In Time{" "}
                  <span className="font-normal text-neutral-400">
                    (Leave blank for now)
                  </span>
                </label>
                <Input
                  type="datetime-local"
                  value={checkedInAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCheckedInAt(e.target.value)
                  }
                  className="text-xs"
                />
                <span className="text-[10px] text-neutral-500">
                  Allows manual entry/backfilling for blackout power recovery.
                </span>
              </div>

              <Button
                type="submit"
                size="sm"
                className="mt-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                disabled={checkinMutation.isPending}
              >
                <Plus className="mr-1 size-4" />
                {checkinMutation.isPending ? "Recording..." : "Check In Resident"}
              </Button>
            </form>
          </div>

          {/* Currently Active Evacuees List (Right Side) */}
          <div className="flex flex-col gap-3">
            <h4 className="flex items-center justify-between text-sm font-bold text-neutral-900">
              <span>Currently Checked In ({activeCheckins.length})</span>
            </h4>

            {isLoading ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                Loading check-in records...
              </p>
            ) : activeCheckins.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center">
                <p className="text-xs font-medium text-neutral-600">
                  No active evacuees currently checked in.
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Use the form on the left to record new arrivals.
                </p>
              </div>
            ) : (
              <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
                {activeCheckins.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200/80 bg-white p-3 shadow-2xs transition-all hover:border-emerald-300"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-neutral-900">
                        {c.person_name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        In:{" "}
                        {new Date(c.checked_in_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {c.recorded_by_name ? ` • by ${c.recorded_by_name}` : ""}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-neutral-200 font-bold text-red-600 hover:border-red-300 hover:bg-red-50"
                      disabled={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(c.id)}
                    >
                      <LogOut className="mr-1 size-3" />
                      Check Out
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Past check-ins collapsible list */}
            {pastCheckins.length > 0 && (
              <details className="mt-2 border-t border-neutral-100 pt-2 text-xs text-neutral-600">
                <summary className="cursor-pointer font-bold select-none hover:text-neutral-900">
                  View Past Checked-Out Records ({pastCheckins.length})
                </summary>
                <div className="mt-2 flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1">
                  {pastCheckins.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between rounded border border-neutral-100 bg-neutral-50 p-2 text-[11px] text-neutral-500"
                    >
                      <span className="font-semibold text-neutral-700">
                        {c.person_name}
                      </span>
                      <span>
                        Out:{" "}
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
