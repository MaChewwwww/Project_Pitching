"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  Info,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  ShieldAlert,
  Siren,
  Trash2,
  User,
  UserCheck,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AssetMetricCard } from "@/components/features/admin/asset-metric-strip";
import { EditEvacuationCenterDialog } from "@/components/features/admin/edit-evacuation-center-dialog";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EvacCenterDetail {
  id: string;
  capacity: number | null;
  occupancy?: number;
  is_open: boolean;
  notes: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  facility: {
    id: string;
    name: string;
    location: { coordinates: [number, number] };
    area_name?: string | null;
    address?: string | null;
    is_active?: boolean;
  };
  is_active?: boolean;
}

interface EvacCheckinRecord {
  id: string;
  evac_center_id: string;
  evac_center_name?: string;
  event_id: string;
  event_name?: string;
  member_id?: string | null;
  unregistered_person_id?: string | null;
  person_name: string;
  checked_in_at: string;
  checked_out_at: string | null;
  recorded_by_name?: string | null;
}

interface EmergencyEventItem {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  description?: string | null;
}

function getEventTypeBadge(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "flood") {
    return {
      label: "Flood Emergency",
      icon: Waves,
      classes: "bg-sky-100 text-sky-900 border-sky-300 font-bold",
    };
  }
  if (t === "fire") {
    return {
      label: "Fire Incident",
      icon: Flame,
      classes: "bg-rose-100 text-rose-900 border-rose-300 font-bold",
    };
  }
  if (t === "typhoon" || t === "severe_weather") {
    return {
      label: "Typhoon / Weather",
      icon: Wind,
      classes: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
    };
  }
  return {
    label: "Emergency Operation",
    icon: Siren,
    classes: "bg-teal-100 text-teal-900 border-teal-300 font-bold",
  };
}

function formatStayDuration(checkedInAt: string, checkedOutAt: string | null): string {
  if (!checkedOutAt) return "Active Shelter";
  const start = new Date(checkedInAt).getTime();
  const end = new Date(checkedOutAt).getTime();
  if (isNaN(start) || isNaN(end)) return "—";
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function EvacuationCenterDetailPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const centerId = params.id as string;

  const [manifestTab, setManifestTab] = React.useState<"all" | "active" | "history">("all");
  const [selectedEventFilter, setSelectedEventFilter] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("" );
  const [showHazard, setShowHazard] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showCloseDialog, setShowCloseDialog] = React.useState(false);
  const [checkoutTarget, setCheckoutTarget] = React.useState<EvacCheckinRecord | null>(null);

  /* 1. Query Center Details */
  const {
    data: center,
    isLoading: isCenterLoading,
    isError: isCenterError,
  } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId],
    queryFn: () =>
      api.get<EvacCenterDetail>(`/admin/evacuation-centers/${centerId}`).then((r) => r.data),
  });

  /* 2. Query All Check-In Records (Ground truth for metrics and history) */
  const { data: allCheckins = [] } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId, "check-ins"],
    queryFn: () =>
      api
        .get<EvacCheckinRecord[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
          params: { active_only: false },
        })
        .then((r) => r.data),
  });

  /* 3. Query All Emergency Events for metadata enrichment */
  const { data: eventsList = [] } = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventItem[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((r) => r.data.items),
  });

  /* Toggle Open / Close Mutation */
  const toggleOpenMutation = useMutation({
    mutationFn: (nextOpen: boolean) =>
      api.patch(`/admin/evacuation-centers/${centerId}`, { is_open: nextOpen }),
    onSuccess: (_, nextOpen) => {
      toast.success(
        nextOpen ? "Evacuation center is now OPEN" : "Evacuation center is now CLOSED",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers", centerId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update status");
    },
  });

  /* Evacuee Check-Out Mutation */
  const checkoutMutation = useMutation({
    mutationFn: (checkinId: string) =>
      api.post(`/admin/evacuation-centers/check-ins/${checkinId}/check-out`),
    onSuccess: () => {
      toast.success("Evacuee marked as checked out");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers", centerId] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", centerId, "check-ins"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
      setCheckoutTarget(null);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to check out evacuee");
    },
  });

  /* Soft Delete / Deactivate Mutation */
  const deactivateMutation = useMutation({
    mutationFn: () => api.delete(`/admin/evacuation-centers/${centerId}`),
    onSuccess: () => {
      toast.success("Evacuation center deactivated and archived");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
      router.push("/admin/evacuation-centers");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to deactivate evacuation center");
    },
  });

  /* Reactivate Mutation */
  const reactivateMutation = useMutation({
    mutationFn: () => api.post(`/admin/evacuation-centers/${centerId}/reactivate`),
    onSuccess: () => {
      toast.success("Evacuation center reactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers", centerId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to reactivate evacuation center");
    },
  });

  /* Compute Metrics & Historical Statistics */
  const activeCheckins = React.useMemo(
    () => allCheckins.filter((c) => c.checked_out_at === null),
    [allCheckins],
  );
  const pastCheckins = React.useMemo(
    () => allCheckins.filter((c) => c.checked_out_at !== null),
    [allCheckins],
  );

  const registeredCount = React.useMemo(
    () => allCheckins.filter((c) => Boolean(c.member_id)).length,
    [allCheckins],
  );
  const walkinCount = React.useMemo(
    () => allCheckins.filter((c) => !c.member_id).length,
    [allCheckins],
  );

  // Average shelter stay duration in hours
  const avgStayHours = React.useMemo(() => {
    if (pastCheckins.length === 0) return null;
    const durations = pastCheckins.map((c) => {
      const start = new Date(c.checked_in_at).getTime();
      const end = new Date(c.checked_out_at!).getTime();
      return Math.max(0, (end - start) / (1000 * 60 * 60));
    });
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return avg < 1 ? "< 1" : avg.toFixed(1);
  }, [pastCheckins]);

  // Aggregate deployments by Emergency Event
  const uniqueEvents = React.useMemo(() => {
    const map = new Map<
      string,
      {
        eventId: string;
        eventName: string;
        eventType: string;
        isActive: boolean;
        startedAt: string | null;
        endedAt: string | null;
        totalCheckins: number;
        activeCount: number;
        completedCount: number;
        firstCheckin: string;
        lastCheckin: string;
      }
    >();

    for (const c of allCheckins) {
      const ev = eventsList.find((e) => e.id === c.event_id);
      const existing = map.get(c.event_id);
      const isCheckinActive = c.checked_out_at === null;

      if (!existing) {
        map.set(c.event_id, {
          eventId: c.event_id,
          eventName: c.event_name || ev?.name || "Emergency Event",
          eventType: ev?.type || "emergency",
          isActive: ev?.is_active ?? false,
          startedAt: ev?.started_at ?? null,
          endedAt: ev?.ended_at ?? null,
          totalCheckins: 1,
          activeCount: isCheckinActive ? 1 : 0,
          completedCount: isCheckinActive ? 0 : 1,
          firstCheckin: c.checked_in_at,
          lastCheckin: c.checked_in_at,
        });
      } else {
        existing.totalCheckins += 1;
        if (isCheckinActive) existing.activeCount += 1;
        else existing.completedCount += 1;
        if (new Date(c.checked_in_at) < new Date(existing.firstCheckin)) {
          existing.firstCheckin = c.checked_in_at;
        }
        if (new Date(c.checked_in_at) > new Date(existing.lastCheckin)) {
          existing.lastCheckin = c.checked_in_at;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastCheckin).getTime() - new Date(a.lastCheckin).getTime(),
    );
  }, [allCheckins, eventsList]);

  // Filtered check-in records for manifest table
  const filteredCheckins = React.useMemo(() => {
    return allCheckins.filter((item) => {
      // 1. Tab status filter
      if (manifestTab === "active" && item.checked_out_at !== null) return false;
      if (manifestTab === "history" && item.checked_out_at === null) return false;

      // 2. Event filter
      if (selectedEventFilter !== "all" && item.event_id !== selectedEventFilter) return false;

      // 3. Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.person_name.toLowerCase().includes(q);
        const matchesEvent = (item.event_name || "").toLowerCase().includes(q);
        const matchesRecorder = (item.recorded_by_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEvent && !matchesRecorder) return false;
      }

      return true;
    });
  }, [allCheckins, manifestTab, selectedEventFilter, searchTerm]);

  if (isCenterLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse py-8">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-44 w-full rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-28 rounded-xl bg-slate-200" />
          <div className="h-28 rounded-xl bg-slate-200" />
          <div className="h-28 rounded-xl bg-slate-200" />
          <div className="h-28 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (isCenterError || !center) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <Building2 className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Evacuation Center Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The requested evacuation center record does not exist or may have been removed.
        </p>
        <Link href="/admin/evacuation-centers">
          <Button variant="primary">Return to Evacuation Centers</Button>
        </Link>
      </div>
    );
  }

  const occupancy = center.occupancy ?? activeCheckins.length;
  const capacity = center.capacity;
  const pct = capacity ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
  const remainingSlots = capacity ? Math.max(0, capacity - occupancy) : "Unlimited";
  const isFull = capacity ? occupancy >= capacity : false;
  const isNear = capacity ? occupancy / capacity >= 0.8 && !isFull : false;

  const mapItem = {
    id: center.id,
    name: center.facility.name,
    category: "evacuation_center" as const,
    location: center.facility.location,
    area_name: center.facility.area_name,
    statusLabel: center.is_open ? "Open Center" : "Closed Center",
    tone: center.is_open
      ? isFull
        ? ("rose" as const)
        : isNear
          ? ("amber" as const)
          : ("emerald" as const)
      : ("slate" as const),
    occupancy,
    capacity,
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Hero Header Card */}
      <div className="flex flex-col justify-between gap-5 rounded-3xl border border-emerald-200/90 bg-gradient-to-r from-emerald-100/80 via-emerald-50/50 to-white p-6 text-slate-900 shadow-sm transition-all lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white border border-emerald-500 shadow-sm">
            <BedDouble className="size-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {center.facility.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold shadow-2xs",
                  !center.is_active
                    ? "bg-slate-100 text-slate-700 border border-slate-300"
                    : center.is_open
                      ? isFull
                        ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
                        : isNear
                          ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold"
                      : "bg-slate-100 text-slate-700 border border-slate-300",
                )}
              >
                {center.is_open ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-700" />
                    {isFull
                      ? "At Max Capacity"
                      : isNear
                        ? "Near Capacity (>80%)"
                        : "Open for Intake"}
                  </>
                ) : (
                  "Closed Standby"
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              {center.facility.address || "Barangay San Jose, Rodriguez (Montalban), Rizal"}
              {center.facility.area_name ? ` • Sector: ${center.facility.area_name}` : ""}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <EditEvacuationCenterDialog
            center={center}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Pencil className="size-3.5 text-slate-700" />
                Edit Shelter
              </Button>
            }
          />

          {/* Toggle Open / Close with Confirmation Modal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (center.is_open) {
                setShowCloseDialog(true);
              } else {
                toggleOpenMutation.mutate(true);
              }
            }}
            disabled={toggleOpenMutation.isPending}
            className={cn(
              "gap-1.5 rounded-xl border text-xs font-bold cursor-pointer shadow-2xs",
              center.is_open
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
            )}
          >
            {center.is_open ? (
              <>
                <PowerOff className="size-3.5" />
                Close Intake
              </>
            ) : (
              <>
                <Power className="size-3.5" />
                Open Intake
              </>
            )}
          </Button>

          {/* Deactivate / Reactivate */}
          {center.is_active !== false ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deactivateMutation.isPending}
              className="gap-1.5 rounded-xl border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 cursor-pointer shadow-2xs"
            >
              <Trash2 className="size-3.5 text-rose-600" />
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="gap-1.5 rounded-xl border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="size-3.5 text-emerald-700" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Top 4 Historical & Operational KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AssetMetricCard
          icon={BedDouble}
          label="Live Intake Load"
          value={center.is_open ? `${occupancy} / ${capacity || "∞"}` : "Standby"}
          unit={center.is_open ? (capacity ? "occupants" : "sheltered") : ""}
          sub={
            center.is_open
              ? capacity
                ? `${pct}% capacity utilized`
                : "Accepting intakes"
              : "Intake closed / Standby"
          }
          tone={center.is_open ? (isFull ? "rose" : isNear ? "amber" : "emerald") : "neutral"}
          badge={
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider",
                !center.is_open
                  ? "bg-slate-100 text-slate-700"
                  : isFull
                    ? "bg-rose-100 text-rose-800"
                    : isNear
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800",
              )}
            >
              {center.is_open ? `${pct}% Loaded` : "Standby"}
            </span>
          }
        />
        <AssetMetricCard
          icon={Users}
          label="Cumulative Sheltered"
          value={allCheckins.length}
          unit="evacuees"
          sub={`${registeredCount} registered · ${walkinCount} walk-in`}
          tone="emerald"
        />
        <AssetMetricCard
          icon={ShieldAlert}
          label="Disaster Deployments"
          value={uniqueEvents.length}
          unit={uniqueEvents.length === 1 ? "operation" : "operations"}
          sub="Emergency activations"
          tone="sky"
        />
        <AssetMetricCard
          icon={Clock}
          label="Avg Shelter Stay"
          value={avgStayHours ? `${avgStayHours}` : "—"}
          unit={avgStayHours ? "hours" : ""}
          sub={`${pastCheckins.length} completed departures`}
          tone="neutral"
        />
      </div>

      {/* Main Content Layout: Left Historical & Operational Roster (7 cols) & Right Map & Dossier (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Shelter Load, Disaster Deployments & Evacuee Manifest (7 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Card 1: Shelter Operational Load & Integration Notice */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BedDouble className="size-4 text-emerald-700" />
                Shelter Operational Status & Real-Time Load
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                  center.is_open
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200",
                )}
              >
                {center.is_open ? "INTAKE ACTIVE" : "CLOSED STANDBY"}
              </span>
            </div>

            {/* Capacity Progress Bar */}
            {capacity ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Real-Time Capacity Allocation
                  </span>
                  <span className="text-xs font-black tabular-nums text-slate-900">
                    {occupancy} of {capacity} Occupants ({pct}%)
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      isFull
                        ? "bg-rose-600"
                        : isNear
                          ? "bg-amber-500"
                          : "bg-emerald-600",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Remaining Intake Slots: <strong>{remainingSlots}</strong></span>
                  <span>{isFull ? "⚠️ Facility at full threshold" : isNear ? "⚡ High capacity warning (>80%)" : "✅ Available space ready"}</span>
                </div>
              </div>
            ) : null}

            {/* Sync Information Notice */}
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-sky-900">
              <Info className="size-4 shrink-0 text-sky-700 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sky-950">
                  Integrated Emergency Events Operations
                </p>
                <p className="mt-0.5 text-sky-800/90 leading-relaxed text-[11.5px]">
                  Evacuee intakes, safety self-check-ins, and field triage are synchronized with active{" "}
                  <Link
                    href="/admin/emergency-events?event=all&tab=map"
                    className="font-bold underline text-sky-900 hover:text-sky-950 inline-flex items-center gap-1"
                  >
                    Emergency Events Operations
                    <ExternalLink className="size-3" />
                  </Link>
                  . Changes logged here immediately reflect in municipal GIS and response command centers.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Disaster Deployments & Operation History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="size-4 text-emerald-700" />
                Disaster Deployments & Operation History
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200">
                {uniqueEvents.length} Operations Served
              </span>
            </div>

            {uniqueEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniqueEvents.map((ev) => {
                  const badge = getEventTypeBadge(ev.eventType);
                  const Icon = badge.icon;

                  return (
                    <div
                      key={ev.eventId}
                      className={cn(
                        "rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 text-xs transition-all shadow-2xs",
                        ev.isActive
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50",
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold border",
                              badge.classes,
                            )}
                          >
                            <Icon className="size-2.5" />
                            {badge.label}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                              ev.isActive
                                ? "bg-emerald-600 text-white animate-pulse"
                                : "bg-slate-200 text-slate-700",
                            )}
                          >
                            {ev.isActive ? "Ongoing Event" : "Concluded"}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 mt-2 line-clamp-1">
                          {ev.eventName}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Latest activity: {new Date(ev.lastCheckin).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>

                      <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Users className="size-3 text-slate-500" />
                          <span>{ev.totalCheckins} Sheltered</span>
                          {ev.activeCount > 0 ? (
                            <span className="text-[10px] text-emerald-700">({ev.activeCount} active)</span>
                          ) : null}
                        </div>

                        <Link
                          href={`/admin/emergency-events?event=${ev.eventId}&tab=map`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 hover:text-sky-950 underline"
                        >
                          Workspace
                          <ExternalLink className="size-2.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500">
                <ShieldAlert className="size-5 text-slate-400 shrink-0" />
                <p>No historical emergency disaster deployments recorded for this shelter yet.</p>
              </div>
            )}
          </div>

          {/* Card 3: Evacuee Intake & Departure Manifest Ledger */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
            {/* Header with Title & Record Count */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-4 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="size-4 text-emerald-700" />
                Shelter Intake & Departure Manifest Ledger
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200">
                {filteredCheckins.length} / {allCheckins.length} Records
              </span>
            </div>

            {/* Filter Toolbar: Search, Event Select, and Status Tabs */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search input */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search evacuee or officer…"
                    className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Event Selector Dropdown */}
                {uniqueEvents.length > 0 ? (
                  <select
                    value={selectedEventFilter}
                    onChange={(e) => setSelectedEventFilter(e.target.value)}
                    aria-label="Filter by Emergency Operation"
                    className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                  >
                    <option value="all">All Emergency Events ({allCheckins.length})</option>
                    {uniqueEvents.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventName} ({ev.totalCheckins})
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setManifestTab("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                    manifestTab === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  All ({allCheckins.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManifestTab("active")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                    manifestTab === "active"
                      ? "bg-white text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Active ({activeCheckins.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManifestTab("history")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                    manifestTab === "history"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Departed ({pastCheckins.length})
                </button>
              </div>
            </div>

            {/* Manifest Table */}
            {filteredCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <UserCheck className="size-8 text-slate-300" />
                <p className="font-bold text-sm text-slate-700">No matching evacuee records found</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {searchTerm || selectedEventFilter !== "all"
                    ? "Try adjusting your search keywords or emergency event filters."
                    : "Evacuee arrivals and departures logged during emergency operations will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Evacuee Name</th>
                      <th className="px-4 py-3">Emergency Event</th>
                      <th className="px-3 py-3">Intake Time</th>
                      <th className="px-3 py-3">Duration / Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCheckins.map((item) => {
                      const isCurrentlyActive = item.checked_out_at === null;
                      const duration = formatStayDuration(item.checked_in_at, item.checked_out_at);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "grid size-7 place-items-center rounded-full font-bold text-xs shrink-0",
                                  isCurrentlyActive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700",
                                )}
                              >
                                <User className="size-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{item.person_name}</p>
                                <span className="inline-block text-[10px] font-semibold text-slate-500">
                                  {item.member_id ? "Registered Resident" : "Transient / Walk-in"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {item.event_id ? (
                              <Link
                                href={`/admin/emergency-events?event=${item.event_id}&tab=map`}
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 hover:bg-sky-100 transition-colors"
                              >
                                <Siren className="size-2.5 text-sky-700" />
                                <span className="truncate max-w-[130px]">
                                  {item.event_name || "Emergency Event"}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                            {new Date(item.checked_in_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </td>

                          <td className="px-3 py-3">
                            {isCurrentlyActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 animate-pulse">
                                <span className="size-1.5 rounded-full bg-emerald-600" />
                                Sheltered
                              </span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-bold text-slate-800">
                                  {duration}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Out:{" "}
                                  {new Date(item.checked_out_at!).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {isCurrentlyActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCheckoutTarget(item)}
                                disabled={checkoutMutation.isPending}
                                className="h-7 gap-1 rounded-lg text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                              >
                                <LogOut className="size-3" />
                                Check Out
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-mono">Concluded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Spatial Location Map & Facility Dossier (5 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Spatial Location Map Card (Matching Siren Map Frame Design) */}
          <div className="rounded-2xl border border-emerald-900/60 bg-[#052e16] p-1 shadow-md overflow-hidden flex flex-col">
            <div className="min-h-[420px] lg:min-h-[460px] w-full overflow-hidden rounded-xl bg-slate-950">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={center.id}
                onSelect={() => {}}
                showHazard={showHazard}
                showAreas
                showLegend={false}
                showDataSources={false}
              />
            </div>
            {/* Green Footer: Flood Hazard Checkbox & Attributions */}
            <div className="flex items-center justify-between gap-3 bg-[#052e16] px-3.5 py-2.5 text-xs text-white rounded-b-xl border-t border-emerald-900/80">
              <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showHazard}
                  onChange={(e) => setShowHazard(e.target.checked)}
                  className="size-4 rounded border-emerald-600 bg-emerald-900/80 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
                <span className="text-emerald-100 font-semibold text-[11.5px]">
                  Show Flood Hazard Overlay
                </span>
              </label>

              <div className="text-[10.5px] font-medium text-emerald-300/80 shrink-0">
                Leaflet · © OpenStreetMap
              </div>
            </div>
          </div>

          {/* Facility Details Dossier Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="size-4 text-emerald-700" />
                Facility & Shelter Dossier
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                  center.is_open
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200",
                )}
              >
                {center.is_open ? "Active Shelter" : "Standby Facility"}
              </span>
            </div>

            <dl className="flex flex-col gap-3.5 text-xs">
              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Shelter Facility Name
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                  {center.facility.name}
                </dd>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                    Assigned Sector
                  </dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">
                    {center.facility.area_name || "Barangay San Jose"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                    Geocoded Position
                  </dt>
                  <dd className="font-mono text-[11px] font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3 text-emerald-600 shrink-0" />
                    {center.facility.location.coordinates[1].toFixed(5)},{" "}
                    {center.facility.location.coordinates[0].toFixed(5)}
                  </dd>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Designated Contact Person & Hotline
                </dt>
                <dd className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                  <User className="size-3.5 text-slate-400" />
                  {center.contact_person || "Designated Barangay Officer"}
                </dd>
                {center.contact_number ? (
                  <dd className="mt-1.5">
                    <a
                      href={toTelHref(center.contact_number)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="size-3 text-emerald-600" />
                      {center.contact_number}
                    </a>
                  </dd>
                ) : null}
              </div>

              {center.notes ? (
                <div className="border-t border-slate-100 pt-3">
                  <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                    Equipment & Intake Notes
                  </dt>
                  <dd className="text-slate-600 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11.5px] leading-relaxed">
                    {center.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      {/* Individual Evacuee Check-Out Confirmation Modal */}
      <AlertDialog open={Boolean(checkoutTarget)} onOpenChange={(open) => !open && setCheckoutTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                <LogOut className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Check Out Evacuee?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-amber-800 truncate mt-0.5">
                  {checkoutTarget?.person_name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Confirm departure for <strong>{checkoutTarget?.person_name}</strong> from {center.facility.name}. This will timestamp their check-out and free up shelter capacity in real time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheckoutTarget(null)}
              disabled={checkoutMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (checkoutTarget) {
                  checkoutMutation.mutate(checkoutTarget.id);
                }
              }}
              disabled={checkoutMutation.isPending}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
            >
              {checkoutMutation.isPending ? "Checking Out…" : "Confirm Check-Out"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Shelter Confirmation Modal */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                <PowerOff className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Close Evacuation Center?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-amber-800 truncate mt-0.5">
                  {center.facility.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Are you sure you want to mark this evacuation center as <strong>CLOSED</strong>? This will switch the shelter operational state to Standby, and public hazard maps will display it as not currently accepting new evacuees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseDialog(false)}
              disabled={toggleOpenMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                toggleOpenMutation.mutate(false, {
                  onSettled: () => setShowCloseDialog(false),
                });
              }}
              disabled={toggleOpenMutation.isPending}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
            >
              {toggleOpenMutation.isPending ? "Closing…" : "Confirm Close Shelter"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete / Deactivate Evacuation Center Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Deactivate Evacuation Center?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-rose-700 truncate mt-0.5">
                  {center.facility.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Are you sure you want to deactivate and soft-delete this evacuation center? All active evacuees must be checked out before deactivation. This will close intake and remove its live marker from public GIS shelter maps while retaining audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Confirm Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
