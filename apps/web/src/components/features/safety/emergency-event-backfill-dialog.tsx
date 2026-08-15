"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
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

type BackfillTab = "household_safety" | "walkin_person" | "evac_center" | "incident_report";

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
  const [safetyScope, setSafetyScope] = React.useState<"household" | "member">("household");
  const [customMemberIds, setCustomMemberIds] = React.useState<string[]>([]);
  const [safetyEvacCenterId, setSafetyEvacCenterId] = React.useState<string>("");
  const [safetySetAt, setSafetySetAt] = React.useState(() => toLocalDatetimeString(new Date()));
  const [safetyNotes, setSafetyNotes] = React.useState("");

  // Form states for Walk-in
  const [walkinName, setWalkinName] = React.useState("");
  const [walkinContact, setWalkinContact] = React.useState("");
  const [walkinLocationNote, setWalkinLocationNote] = React.useState("");
  const [walkinStatus, setWalkinStatus] = React.useState<"safe" | "needs_rescue">("safe");
  const [walkinEvacCenterId, setWalkinEvacCenterId] = React.useState("");
  const [walkinRecordedAt, setWalkinRecordedAt] = React.useState(() => toLocalDatetimeString(new Date()));
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
  const [evacCheckinAt, setEvacCheckinAt] = React.useState(() => toLocalDatetimeString(event.started_at));

  // Form states for Incident Report
  const [incidentType, setIncidentType] = React.useState<IncidentType>("flooding");
  const [incidentDesc, setIncidentDesc] = React.useState("");
  const [incidentLocation, setIncidentLocation] = React.useState("");

  // Search filter for households
  const [hhSearch, setHhSearch] = React.useState("");

  // Fetch households
  const householdsQuery = useQuery({
    queryKey: ["admin", "households", "backfill-list"],
    queryFn: () =>
      api
        .get<{ items: HouseholdOut[] }>("/admin/households", {
          params: { size: 1000 },
        })
        .then((r) => r.data.items),
    enabled: activeTab === "household_safety",
  });

  // Fetch selected household detail
  const householdDetailQuery = useQuery({
    queryKey: ["admin", "household", selectedHouseholdId],
    queryFn: () =>
      api.get<HouseholdDetailOut>(`/admin/households/${selectedHouseholdId}`).then((r) => r.data),
    enabled: Boolean(selectedHouseholdId),
  });

  // Fetch evacuation centers
  const evacCentersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers", "backfill-list"],
    queryFn: () => api.get<PublicEvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", event.id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace", event.id] }),
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
      if (incidentLocation.trim()) formData.append("location_note", incidentLocation.trim());
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

  const filteredHouseholds = React.useMemo(() => {
    const list = householdsQuery.data ?? [];
    if (!hhSearch.trim()) return list.slice(0, 30);
    const q = hhSearch.toLowerCase();
    return list.filter(
      (h) =>
        h.reference_no.toLowerCase().includes(q) ||
        h.head_name?.toLowerCase().includes(q) ||
        h.area_name?.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [householdsQuery.data, hhSearch]);

  const isSubmitting =
    submitSafetyMutation.isPending ||
    submitWalkinMutation.isPending ||
    submitEvacMutation.isPending ||
    submitIncidentMutation.isPending;

  return (
    <>
      <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-teal-100 text-teal-800 shrink-0 shadow-xs border border-teal-200">
              <FileSpreadsheet className="size-6 text-teal-700" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
                <span>Blackout Recovery & Data Backfill</span>
                <Badge tone="info" className="text-[10px] uppercase font-bold">
                  {event.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Ingest offline field logs, paper manifests, and retrospective check-ins collected during power or internet blackouts.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-4 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("household_safety")}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "household_safety"
                ? "border-teal-600 text-teal-700 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <UserCheck className="size-3.5" />
            <span>1. Household Safety Status</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("walkin_person")}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "walkin_person"
                ? "border-teal-600 text-teal-700 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <UserPlus className="size-3.5" />
            <span>2. Unregistered Walk-In</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evac_center")}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "evac_center"
                ? "border-teal-600 text-teal-700 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <Building2 className="size-3.5" />
            <span>3. Evacuation Manifest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incident_report")}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "incident_report"
                ? "border-teal-600 text-teal-700 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <AlertTriangle className="size-3.5" />
            <span>4. Field Hazard Report</span>
          </button>
        </div>
      </DialogHeader>

      {/* Tab 1: Household Safety */}
      {activeTab === "household_safety" ? (
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-3 text-xs text-teal-950 flex items-start gap-2">
            <ShieldAlert className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Record safety statuses collected from door-to-door BHW field rosters. The timestamp will be preserved as the official verification time during the blackout.
            </p>
          </div>

          {/* Household Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-900">
              Select Household from Registry <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search household reference, head name, or area..."
                value={hhSearch}
                onChange={(e) => setHhSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {householdsQuery.isLoading ? (
                <p className="p-3 text-xs text-slate-400">Loading households list...</p>
              ) : filteredHouseholds.length === 0 ? (
                <p className="p-3 text-xs text-slate-400 italic">No matching households found</p>
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
                        "w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer",
                        isSelected
                          ? "bg-teal-600 text-white font-bold"
                          : "hover:bg-slate-100 text-slate-800",
                      )}
                    >
                      <div>
                        <span className="font-bold">{h.reference_no}</span> · {h.head_name}
                        <span className={cn("ml-2 text-[11px]", isSelected ? "text-teal-100" : "text-slate-500")}>
                          ({h.area_name})
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="size-4 text-white shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Scope & Members Selection */}
          {householdDetailQuery.data ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Check-in Scope</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSafetyScope("household")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      safetyScope === "household"
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700",
                    )}
                  >
                    Entire Household ({householdDetailQuery.data.members.length} members)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyScope("member")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      safetyScope === "member"
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700",
                    )}
                  >
                    Specific Members
                  </button>
                </div>
              </div>

              {safetyScope === "member" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {householdDetailQuery.data.members.map((m) => {
                    const isChecked = customMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                          isChecked
                            ? "bg-teal-50 border-teal-300 text-teal-950 font-bold"
                            : "bg-white border-slate-200 text-slate-700",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomMemberIds((prev) => [...prev, m.id]);
                            } else {
                              setCustomMemberIds((prev) => prev.filter((id) => id !== m.id));
                            }
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="truncate">{m.full_name}</span>
                        {m.is_head && (
                          <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded font-bold">
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

          {/* Status & Shelter Choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Safety Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSafetyStatus("safe")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all",
                    safetyStatus === "safe"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  <span>Safe / Accounted</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSafetyStatus("needs_rescue")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all",
                    safetyStatus === "needs_rescue"
                      ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <AlertTriangle className="size-4" />
                  <span>Needs Rescue</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Shelter / Location</label>
              <select
                value={safetyEvacCenterId}
                onChange={(e) => setSafetyEvacCenterId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="">Home / Relatives / Safe Location</option>
                {(evacCentersQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    Evac: {c.facility.name} ({c.facility.area_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Retroactive Timestamp & Surveyor Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-teal-600 shrink-0" />
                  Field Verification Date & Time
                </label>
                <button
                  type="button"
                  onClick={() => setSafetySetAt(toLocalDatetimeString(new Date()))}
                  className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="size-3" />
                  Now
                </button>
              </div>
              <input
                type="datetime-local"
                value={safetySetAt}
                onChange={(e) => setSafetySetAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Surveyor / Paper Roster Notes</label>
              <input
                type="text"
                placeholder="e.g. Area 3 BHW Paper Roster #12"
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>

          </div>
        </div>
      ) : null}

      {/* Tab 2: Walk-In Person */}
      {activeTab === "walkin_person" ? (
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-3 text-xs text-teal-950 flex items-start gap-2">
            <UserPlus className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Log unregistered individuals and transients assisted during the emergency blackout. They will appear in the safety ledger and walk-in queue for eventual registry conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="e.g. Maria Santos (Transient)"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Contact Number</label>
              <input
                type="text"
                value={walkinContact}
                onChange={(e) => setWalkinContact(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Safety Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWalkinStatus("safe")}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                    walkinStatus === "safe"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700",
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  <span>Safe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWalkinStatus("needs_rescue")}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                    walkinStatus === "needs_rescue"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700",
                  )}
                >
                  <AlertTriangle className="size-4" />
                  <span>Needs Rescue</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Evacuation Center Shelter</label>
              <select
                value={walkinEvacCenterId}
                onChange={(e) => setWalkinEvacCenterId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
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

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-900">Vulnerability Flags</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { key: "is_child", label: "Child (<18)" },
                { key: "is_senior", label: "Senior Citizen (60+)" },
                { key: "is_pwd", label: "Person with Disability" },
                { key: "is_pregnant", label: "Pregnant" },
                { key: "is_lactating", label: "Lactating Mother" },
                { key: "has_chronic_condition", label: "Chronic Condition" },
                { key: "is_bedridden", label: "Mobility Limited" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={walkinFlags[key as keyof typeof walkinFlags]}
                    onChange={(e) =>
                      setWalkinFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-900">Where was this person found / assisted?</label>
            <input
              type="text"
              placeholder="e.g. Near Kasiglahan Bridge, Phase 1"
              value={walkinLocationNote}
              onChange={(e) => setWalkinLocationNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs font-medium"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-teal-600 shrink-0" />
                Walk-in safety status date & time
              </label>
              <button
                type="button"
                onClick={() => setWalkinRecordedAt(toLocalDatetimeString(new Date()))}
                className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="size-3" />
                Now
              </button>
            </div>
            <input
              type="datetime-local"
              value={walkinRecordedAt}
              onChange={(e) => setWalkinRecordedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
            <p className="text-[11px] text-slate-500">Use the time from the paper roster or field log, not the time it is entered here.</p>
          </div>
        </div>
      ) : null}

      {/* Tab 3: Evacuation Center Log */}
      {activeTab === "evac_center" ? (
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-3 text-xs text-teal-950 flex items-start gap-2">
            <Building2 className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Log paper sign-in sheets from designated evacuation center marshals retroactively.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Evacuation Center <span className="text-rose-500">*</span>
              </label>
              <select
                value={evacCenterId}
                onChange={(e) => setEvacCenterId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="">Select evacuation center...</option>
                {(evacCentersQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.facility.name} ({c.facility.area_name}) · Cap: {c.capacity ?? "N/A"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Person / Resident Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={evacPersonName}
                onChange={(e) => setEvacPersonName(e.target.value)}
                placeholder="Full name as written on paper sheet"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-teal-600 shrink-0" />
                Physical Arrival / Check-in Date & Time
              </label>
              <button
                type="button"
                onClick={() => setEvacCheckinAt(toLocalDatetimeString(new Date()))}
                className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="size-3" />
                Now
              </button>
            </div>
            <input
              type="datetime-local"
              value={evacCheckinAt}
              onChange={(e) => setEvacCheckinAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>
        </div>
      ) : null}

      {/* Tab 4: Field Incident Report */}
      {activeTab === "incident_report" ? (
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-3 text-xs text-teal-950 flex items-start gap-2">
            <AlertTriangle className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Log physical hazard incidents (e.g. fallen trees, transformer explosion, impassable roads) that occurred during the communications outage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Incident Type</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="flooding">Flooding / Water Level</option>
                <option value="fire">Fire Incident</option>
                <option value="fallen_tree">Fallen Tree / Blockage</option>
                <option value="road_blockage">Impassable Road</option>
                <option value="landslide">Landslide / Soil Erosion</option>
                <option value="power_outage">Transformer / Power Outage</option>
                <option value="other">Other Emergency</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">Location Note / Landmark</label>
              <input
                type="text"
                placeholder="e.g. Kasiglahan Phase 1 Main Road corner Block 5"
                value={incidentLocation}
                onChange={(e) => setIncidentLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800">
              Incident Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe what occurred, hazards, and any immediate response taken..."
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <DialogFooter className="shrink-0 pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-slate-200 text-xs font-bold"
        >
          Close
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
          className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md gap-1.5"
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
      <DialogContent className="max-w-3xl bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
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
