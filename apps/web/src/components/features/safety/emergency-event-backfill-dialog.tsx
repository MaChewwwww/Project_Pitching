"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  EmergencyEventOut,
  IncidentType,
  SafetyStatusAdminIn,
  SafetyStatusValue,
  UnregisteredPersonIn,
} from "@/lib/api/safety-types";
import type { HouseholdOut, HouseholdDetailOut } from "@/lib/api/registry-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

function toLocalDatetimeString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

type BackfillTab =
  "household_safety" | "walkin_person" | "evac_center" | "incident_report";

function EmergencyEventBackfillContent({
  event,
  onClose,
  onSuccess,
}: {
  event: EmergencyEventOut;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<BackfillTab>("household_safety");

  // Form states for Household Safety
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState<string>("");
  const [safetyStatus, setSafetyStatus] = React.useState<SafetyStatusValue>("safe");
  const [safetyScope, setSafetyScope] = React.useState<"household" | "member">(
    "household",
  );
  const [customMemberIds, setCustomMemberIds] = React.useState<string[]>([]);
  const [safetyEvacCenterId, setSafetyEvacCenterId] = React.useState<string>("");
  const [safetySetAt, setSafetySetAt] = React.useState(() =>
    toLocalDatetimeString(new Date()),
  );
  const [safetyNotes, setSafetyNotes] = React.useState("");

  // Form states for Walk-in
  const [walkinName, setWalkinName] = React.useState("");
  const [walkinContact, setWalkinContact] = React.useState("");
  const [walkinLocationNote, setWalkinLocationNote] = React.useState("");
  const [walkinStatus, setWalkinStatus] = React.useState<"safe" | "needs_rescue">("safe");
  const [walkinEvacCenterId, setWalkinEvacCenterId] = React.useState("");
  const [walkinRecordedAt, setWalkinRecordedAt] = React.useState(() =>
    toLocalDatetimeString(new Date()),
  );
  const [walkinFlags, setWalkinFlags] = React.useState({
    is_child: false,
    is_senior: false,
    is_pwd: false,
    is_pregnant: false,
    is_lactating: false,
    has_chronic_condition: false,
    is_bedridden: false,
  });

  // Form states for Evac Checkin
  const [evacCenterId, setEvacCenterId] = React.useState("");
  const [evacPersonName, setEvacPersonName] = React.useState("");
  const [evacCheckinAt, setEvacCheckinAt] = React.useState(() =>
    toLocalDatetimeString(event.started_at),
  );

  // Form states for Incident Report
  const [incidentType, setIncidentType] = React.useState<IncidentType>("flooding");
  const [incidentDesc, setIncidentDesc] = React.useState("");
  const [incidentLocation, setIncidentLocation] = React.useState("");

  // Search filter for households
  const [hhSearch, setHhSearch] = React.useState("");
  const deferredHouseholdSearch = React.useDeferredValue(hhSearch);

  // Fetch households
  const householdsQuery = useQuery({
    queryKey: ["admin", "households", "backfill-list", deferredHouseholdSearch],
    queryFn: () =>
      api
        .get<{ items: HouseholdOut[] }>("/admin/households", {
          params: { size: 50, query: deferredHouseholdSearch.trim() || undefined },
        })
        .then((r) => r.data.items),
    enabled: activeTab === "household_safety",
  });

  // Fetch selected household detail
  const householdDetailQuery = useQuery({
    queryKey: ["admin", "household", selectedHouseholdId],
    queryFn: () =>
      api
        .get<HouseholdDetailOut>(`/admin/households/${selectedHouseholdId}`)
        .then((r) => r.data),
    enabled: Boolean(selectedHouseholdId),
  });

  // Fetch evacuation centers
  const evacCentersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers", "backfill-list"],
    queryFn: () =>
      api.get<PublicEvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", event.id] }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "emergency-workspace", event.id],
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "safety", "ledger"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "rescue-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "incident-reports"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "accounted-for"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] }),
    ]);
  };

  // 1. Household Safety Mutation
  const submitSafetyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHouseholdId) throw new Error("Select a household first.");
      const hh = householdDetailQuery.data;
      if (!hh) throw new Error("Household details still loading.");

      const allMemberIds = hh.members.map((m) => m.id);
      const payload: SafetyStatusAdminIn = {
        event_id: event.id,
        household_id: selectedHouseholdId,
        status: safetyStatus,
        scope: safetyScope,
        acknowledged_member_ids: safetyScope === "household" ? allMemberIds : undefined,
        member_ids: safetyScope === "member" ? customMemberIds : undefined,
        evac_center_id: safetyEvacCenterId || undefined,
        set_at: safetySetAt ? new Date(safetySetAt).toISOString() : undefined,
        notes: safetyNotes.trim() || undefined,
      };
      return api.post("/admin/safety-status", payload);
    },
    onSuccess: async () => {
      toast.success("Retrospective household safety status recorded");
      await invalidateAll();
      setSelectedHouseholdId("");
      setSafetyNotes("");
      onSuccess?.();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  // 2. Walk-in Mutation
  const submitWalkinMutation = useMutation({
    mutationFn: async () => {
      if (!walkinName.trim()) throw new Error("Walk-in person name is required.");
      const payload: UnregisteredPersonIn = {
        event_id: event.id,
        full_name: walkinName.trim(),
        contact_number: walkinContact.trim() || undefined,
        location_note: walkinLocationNote.trim() || undefined,
        initial_status: walkinStatus,
        evac_center_id: walkinEvacCenterId || undefined,
        set_at: walkinRecordedAt ? new Date(walkinRecordedAt).toISOString() : undefined,
        ...walkinFlags,
      };
      return api.post("/admin/unregistered-persons", payload);
    },
    onSuccess: async () => {
      toast.success("Retrospective unregistered walk-in recorded");
      await invalidateAll();
      setWalkinName("");
      setWalkinContact("");
      setWalkinLocationNote("");
      onSuccess?.();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  // 3. Evac Checkin Mutation
  const submitEvacMutation = useMutation({
    mutationFn: async () => {
      if (!evacCenterId) throw new Error("Select an evacuation center.");
      if (!evacPersonName.trim()) throw new Error("Person name is required.");
      return api.post("/admin/evacuation-centers/check-ins", {
        evac_center_id: evacCenterId,
        event_id: event.id,
        person_name: evacPersonName.trim(),
        checked_in_at: evacCheckinAt ? new Date(evacCheckinAt).toISOString() : undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Retrospective evacuation center check-in logged");
      await invalidateAll();
      setEvacPersonName("");
      onSuccess?.();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  // 4. Incident Report Mutation
  const submitIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!incidentDesc.trim()) throw new Error("Incident description is required.");
      const formData = new FormData();
      formData.append("event_id", event.id);
      formData.append("type", incidentType);
      formData.append("description", incidentDesc.trim());
      if (incidentLocation.trim())
        formData.append("location_note", incidentLocation.trim());
      return api.post("/admin/incident-reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      toast.success("Retrospective field incident report filed");
      await invalidateAll();
      setIncidentDesc("");
      setIncidentLocation("");
      onSuccess?.();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const filteredHouseholds = householdsQuery.data ?? [];

  const isSubmitting =
    submitSafetyMutation.isPending ||
    submitWalkinMutation.isPending ||
    submitEvacMutation.isPending ||
    submitIncidentMutation.isPending;

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-800 shadow-xs">
              <FileSpreadsheet className="size-5.5 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-950">
                <span>Blackout Recovery & Data Backfill</span>
                <Badge tone="info" className="text-[10px] font-bold uppercase">
                  {event.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs font-medium text-slate-500">
                Ingest offline field logs, paper manifests, and retrospective check-ins
                collected during power or internet blackouts.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Spacious 4-Tab Navigation Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("household_safety")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold shadow-2xs transition-all",
              activeTab === "household_safety"
                ? "border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <UserCheck
              className={cn(
                "size-4 shrink-0",
                activeTab === "household_safety" ? "text-emerald-700" : "text-slate-400",
              )}
            />
            <span className="truncate">1. Household Safety</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("walkin_person")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold shadow-2xs transition-all",
              activeTab === "walkin_person"
                ? "border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <UserPlus
              className={cn(
                "size-4 shrink-0",
                activeTab === "walkin_person" ? "text-emerald-700" : "text-slate-400",
              )}
            />
            <span className="truncate">2. Walk-In Person</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evac_center")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold shadow-2xs transition-all",
              activeTab === "evac_center"
                ? "border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Building2
              className={cn(
                "size-4 shrink-0",
                activeTab === "evac_center" ? "text-emerald-700" : "text-slate-400",
              )}
            />
            <span className="truncate">3. Evac Manifest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incident_report")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold shadow-2xs transition-all",
              activeTab === "incident_report"
                ? "border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <AlertTriangle
              className={cn(
                "size-4 shrink-0",
                activeTab === "incident_report" ? "text-emerald-700" : "text-slate-400",
              )}
            />
            <span className="truncate">4. Field Incident</span>
          </button>
        </div>
      </DialogHeader>

      {/* Tab 1: Household Safety */}
      {activeTab === "household_safety" ? (
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-950">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed">
              Record safety statuses collected from door-to-door BHW paper field rosters.
              The retroactive timestamp is preserved as the official verification time
              during the blackout.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Column: Household & Member Selection (7 cols) */}
            <div className="flex flex-col gap-3 lg:col-span-7">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Select Household from Registry <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {filteredHouseholds.length} households shown
                </span>
              </div>

              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search household reference no, head name, or area..."
                  value={hhSearch}
                  onChange={(e) => setHhSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-xs text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="custom-scrollbar h-44 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50">
                {householdsQuery.isLoading ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    Loading households list...
                  </p>
                ) : filteredHouseholds.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400 italic">
                    No matching households found
                  </p>
                ) : (
                  filteredHouseholds.map((h) => {
                    const isSelected = selectedHouseholdId === h.id;
                    return (
                      <button
                        type="button"
                        key={h.id}
                        onClick={() => {
                          setSelectedHouseholdId(h.id);
                          setCustomMemberIds([]);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors",
                          isSelected
                            ? "bg-emerald-700 font-bold text-white"
                            : "text-slate-800 hover:bg-slate-100",
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold">{h.reference_no}</span> ·{" "}
                          <span>{h.head_name}</span>
                          <span
                            className={cn(
                              "ml-2 text-[11px]",
                              isSelected ? "text-emerald-100" : "text-slate-500",
                            )}
                          >
                            ({h.area_name})
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-4 shrink-0 text-white" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Scope & Members Selection */}
              {householdDetailQuery.data ? (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Check-in Scope
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSafetyScope("household")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                          safetyScope === "household"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        )}
                      >
                        All Members ({householdDetailQuery.data.members.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSafetyScope("member")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                          safetyScope === "member"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        )}
                      >
                        Select Members
                      </button>
                    </div>
                  </div>

                  {safetyScope === "member" ? (
                    <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {householdDetailQuery.data.members.map((m) => {
                        const isChecked = customMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition-colors",
                              isChecked
                                ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-950"
                                : "border-slate-200 bg-white text-slate-700",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCustomMemberIds((prev) => [...prev, m.id]);
                                } else {
                                  setCustomMemberIds((prev) =>
                                    prev.filter((id) => id !== m.id),
                                  );
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="truncate">{m.full_name}</span>
                            {m.is_head && (
                              <span className="py-0.2 rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700">
                                Head
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Right Column: Status & Timestamp (5 cols) */}
            <div className="flex flex-col gap-3.5 lg:col-span-5">
              {/* Safety Status Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Safety Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSafetyStatus("safe")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all",
                      safetyStatus === "safe"
                        ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Safe / Accounted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyStatus("needs_rescue")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all",
                      safetyStatus === "needs_rescue"
                        ? "border-rose-700 bg-rose-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <AlertTriangle className="size-4" />
                    <span>Needs Rescue</span>
                  </button>
                </div>
              </div>

              {/* Shelter / Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Shelter / Location
                </label>
                <select
                  value={safetyEvacCenterId}
                  onChange={(e) => setSafetyEvacCenterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Home / Relatives / Safe Location</option>
                  {(evacCentersQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      Evac: {c.facility.name} ({c.facility.area_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field Verification Date & Time */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                    Field Verification Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setSafetySetAt(toLocalDatetimeString(new Date()))}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <RefreshCw className="size-3" />
                    Now
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={safetySetAt}
                  onChange={(e) => setSafetySetAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10.5px] text-slate-500">
                  Recorded as the official check-in timestamp.
                </span>
              </div>

              {/* Surveyor / Paper Roster Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">
                  Surveyor / Paper Roster Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Area 3 BHW Paper Roster #12"
                  value={safetyNotes}
                  onChange={(e) => setSafetyNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Walk-In Person */}
      {activeTab === "walkin_person" ? (
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-950">
            <UserPlus className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed">
              Log unregistered individuals and transients assisted during the emergency
              blackout. They will appear in the safety ledger and walk-in queue for
              eventual registry conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left Column: Personal Particulars */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="e.g. Maria Santos (Transient)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Contact Number</label>
                <input
                  type="text"
                  value={walkinContact}
                  onChange={(e) => setWalkinContact(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Where was this person found / assisted?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Kasiglahan Bridge, Phase 1"
                  value={walkinLocationNote}
                  onChange={(e) => setWalkinLocationNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Evacuation Center Shelter
                </label>
                <select
                  value={walkinEvacCenterId}
                  onChange={(e) => setWalkinEvacCenterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">None / Temporary Shelter</option>
                  {(evacCentersQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.facility.name} ({c.facility.area_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column: Status & Vulnerabilities */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">Safety Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkinStatus("safe")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all",
                      walkinStatus === "safe"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Safe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkinStatus("needs_rescue")}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all",
                      walkinStatus === "needs_rescue"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <AlertTriangle className="size-4" />
                    <span>Needs Rescue</span>
                  </button>
                </div>
              </div>

              {/* Vulnerability Checklist */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <label className="text-xs font-bold text-slate-900">
                  Vulnerability Flags
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: "is_child", label: "Child (<18)" },
                    { key: "is_senior", label: "Senior Citizen (60+)" },
                    { key: "is_pwd", label: "PWD" },
                    { key: "is_pregnant", label: "Pregnant" },
                    { key: "is_lactating", label: "Lactating" },
                    { key: "has_chronic_condition", label: "Chronic Illness" },
                    { key: "is_bedridden", label: "Mobility Limited" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={walkinFlags[key as keyof typeof walkinFlags]}
                        onChange={(e) =>
                          setWalkinFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                    Walk-in Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setWalkinRecordedAt(toLocalDatetimeString(new Date()))}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <RefreshCw className="size-3" />
                    Now
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={walkinRecordedAt}
                  onChange={(e) => setWalkinRecordedAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: Evacuation Center Log */}
      {activeTab === "evac_center" ? (
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-950">
            <Building2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed">
              Log paper sign-in sheets from designated evacuation center marshals
              retroactively.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Evacuation Center <span className="text-rose-500">*</span>
                </label>
                <select
                  value={evacCenterId}
                  onChange={(e) => setEvacCenterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select evacuation center...</option>
                  {(evacCentersQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.facility.name} — Area {c.facility.area_id}{" "}
                      {c.capacity ? `(Cap: ${c.capacity})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Evacuee / Resident Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={evacPersonName}
                  onChange={(e) => setEvacPersonName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Clock className="size-3.5 shrink-0 text-emerald-600" />
                    Physical Arrival / Check-in Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setEvacCheckinAt(toLocalDatetimeString(new Date()))}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <RefreshCw className="size-3" />
                    Now
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={evacCheckinAt}
                  onChange={(e) => setEvacCheckinAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500">
                  Transcribe arrival time from the physical logbook.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 4: Incident Report */}
      {activeTab === "incident_report" ? (
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed">
              File retrospective damage, flooding, road blockages, and infrastructure
              hazard reports noted down on field logs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left: Hazard Classification */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-800">
                Incident Classification <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "flooding", label: "Flooding / High Water" },
                  { value: "landslide", label: "Landslide / Soil erosion" },
                  { value: "fire", label: "Fire incident" },
                  { value: "fallen_tree", label: "Fallen Tree / Debris" },
                  { value: "power_line", label: "Downed Power Line" },
                  { value: "structural_damage", label: "Structural Damage" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setIncidentType(item.value as IncidentType)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-2.5 text-left text-xs font-bold transition-all",
                      incidentType === item.value
                        ? "border-emerald-800 bg-emerald-700 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Description & Location */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Incident Description & Field Notes{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Describe the hazard, damages observed, or affected road segments..."
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Specific Location / Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kasiglahan Phase 1K, Block 12 near water tank"
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <DialogFooter className="flex shrink-0 flex-col-reverse items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="cursor-pointer rounded-xl border-slate-200 text-xs font-bold"
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            if (activeTab === "household_safety") submitSafetyMutation.mutate();
            else if (activeTab === "walkin_person") submitWalkinMutation.mutate();
            else if (activeTab === "evac_center") submitEvacMutation.mutate();
            else if (activeTab === "incident_report") submitIncidentMutation.mutate();
          }}
          className="cursor-pointer gap-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
        >
          <Plus className="size-3.5" />
          <span>{isSubmitting ? "Backfilling Record…" : "Submit Backfilled Record"}</span>
        </Button>
      </DialogFooter>
    </>
  );
}

export function EmergencyEventBackfillDialog({
  event,
  open,
  onOpenChange,
  onSuccess,
}: {
  event: EmergencyEventOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:max-w-4xl sm:p-7 lg:max-w-5xl">
        {open ? (
          <EmergencyEventBackfillContent
            key={event.id}
            event={event}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
