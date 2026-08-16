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
  History,
  Info,
  MapPin,
  Pencil,
  Phone,
  Power,
  PowerOff,
  RotateCcw,
  ShieldAlert,
  Siren,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Users2,
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
import {
  AssetMetricCard,
} from "@/components/features/admin/asset-metric-strip";
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

export default function EvacuationCenterDetailPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const centerId = params.id as string;

  const [activeTab, setActiveTab] = React.useState<"active" | "history">("active");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showCloseDialog, setShowCloseDialog] = React.useState(false);

  /* Query center details */
  const { data: center, isLoading, isError } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId],
    queryFn: () =>
      api
        .get<EvacCenterDetail>(`/admin/evacuation-centers/${centerId}`)
        .then((r) => r.data),
  });

  /* Query live active check-ins */
  const { data: activeCheckins = [] } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId, "check-ins", "active"],
    queryFn: () =>
      api
        .get<EvacCheckinRecord[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
          params: { active_only: true },
        })
        .then((r) => r.data),
  });

  /* Query historical check-ins */
  const { data: allCheckins = [] } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId, "check-ins", "all"],
    queryFn: () =>
      api
        .get<EvacCheckinRecord[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
          params: { active_only: false },
        })
        .then((r) => r.data),
    enabled: activeTab === "history",
  });

  /* Status update mutation */
  const toggleOpenMutation = useMutation({
    mutationFn: (nextOpen: boolean) =>
      api.patch(`/admin/evacuation-centers/${centerId}`, { is_open: nextOpen }),
    onSuccess: (_, nextOpen) => {
      toast.success(
        nextOpen
          ? "Evacuation center is now OPEN"
          : "Evacuation center is now CLOSED",
      );
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update status");
    },
  });

  /* Soft delete / deactivate mutation */
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
      toast.error(
        toDisplayError(err).detail || "Failed to deactivate evacuation center",
      );
    },
  });

  /* Reactivate mutation */
  const reactivateMutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/evacuation-centers/${centerId}/reactivate`),
    onSuccess: () => {
      toast.success("Evacuation center reactivated successfully");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(
        toDisplayError(err).detail || "Failed to reactivate evacuation center",
      );
    },
  });

  if (isLoading) {
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

  if (isError || !center) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <Building2 className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Evacuation Center Not Found
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          The requested evacuation center record does not exist or may have been
          removed.
        </p>
        <Link href="/admin/evacuation-centers">
          <Button variant="primary">Return to Evacuation Centers</Button>
        </Link>
      </div>
    );
  }

  const occupancy = center.occupancy ?? activeCheckins.length;
  const capacity = center.capacity;
  const pct = capacity
    ? Math.min(100, Math.round((occupancy / capacity) * 100))
    : 0;
  const remainingSlots = capacity ? Math.max(0, capacity - occupancy) : "—";
  const isFull = capacity ? occupancy >= capacity : false;
  const isNear = capacity ? occupancy / capacity >= 0.8 && !isFull : false;

  const pastCheckins = allCheckins.filter((c) => c.checked_out_at !== null);

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
      {/* Hero Header Card matching system design */}
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
                    {isFull ? "At Max Capacity" : isNear ? "Near Capacity (>80%)" : "Open for Intake"}
                  </>
                ) : (
                  "Closed Standby"
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              {center.facility.address || "Barangay San Jose, Rodriguez (Montalban), Rizal"}
              {center.facility.area_name ? ` • Area: ${center.facility.area_name}` : ""}
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

      {/* Top 4 Capacity Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AssetMetricCard
          icon={Users}
          label="Live Occupancy"
          value={occupancy}
          unit={capacity ? `/ ${capacity}` : "registered"}
          sub={capacity ? `${pct}% capacity utilized` : "No limit set"}
          tone={isFull ? "rose" : isNear ? "amber" : "emerald"}
          badge={
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider",
                isFull
                  ? "bg-rose-100 text-rose-800"
                  : isNear
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
              )}
            >
              {pct}% Loaded
            </span>
          }
        />
        <AssetMetricCard
          icon={Users2}
          label="Maximum Capacity"
          value={capacity ? capacity.toLocaleString() : "Unlimited"}
          unit={capacity ? "persons" : ""}
          sub="Official shelter ceiling"
          tone="neutral"
        />
        <AssetMetricCard
          icon={UserPlus}
          label="Available Space"
          value={typeof remainingSlots === "number" ? remainingSlots.toLocaleString() : remainingSlots}
          unit={typeof remainingSlots === "number" ? "slots" : ""}
          sub={isFull ? "Center is at maximum capacity" : "Available for intake"}
          tone={isFull ? "rose" : "sky"}
        />
        <AssetMetricCard
          icon={History}
          label="Total Check-Ins"
          value={allCheckins.length || occupancy}
          unit="historical"
          sub="Cumulative evacuee logs"
          tone="neutral"
        />
      </div>

      {/* Main Content Layout: Left Roster & Right Dossier */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Guest Roster & History */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Capacity Progress Bar Card */}
          {capacity ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Real-Time Shelter Load
                </span>
                <span className="text-xs font-black tabular-nums text-slate-900">
                  {occupancy} of {capacity} Occupants ({pct}%)
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
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
              <p className="mt-2.5 text-xs text-slate-500">
                {isFull
                  ? "⚠️ This center has reached its official capacity threshold. Redirect new evacuees to adjacent facilities."
                  : isNear
                    ? "⚡ Occupancy is approaching threshold limit (>80%). Prepare overflow accommodations."
                    : "✅ Center is operating well within safe capacity guidelines."}
              </p>
            </div>
          ) : null}

          {/* Sync Information Notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-xs text-sky-900">
            <Info className="size-4 shrink-0 text-sky-700 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sky-950">
                Integrated Emergency Response Manifest
              </p>
              <p className="mt-0.5 text-sky-800/90 leading-relaxed text-[11.5px]">
                Evacuee intakes, safety self-check-ins, and departures are logged live through active{" "}
                <Link
                  href="/admin/emergency-events?event=all&tab=map"
                  className="font-bold underline text-sky-900 hover:text-sky-950"
                >
                  Emergency Events Operations
                </Link>
                . Records below reflect synchronized real-time data for this evacuation center.
              </p>
            </div>
          </div>

          {/* Tabbed Check-in Roster */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-4 pb-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("active")}
                  className={cn(
                    "pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer",
                    activeTab === "active"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-900",
                  )}
                >
                  Active Sheltered Roster ({activeCheckins.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer",
                    activeTab === "history"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-900",
                  )}
                >
                  Completed Check-Outs ({pastCheckins.length})
                </button>
              </div>
            </div>

            {/* Active Roster List */}
            {activeTab === "active" ? (
              activeCheckins.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <UserCheck className="size-8 text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">
                    No active evacuees currently checked in
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Active evacuees checked into this shelter site during emergency events will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Evacuee Name</th>
                        <th className="px-4 py-3">Emergency Event</th>
                        <th className="px-4 py-3">Registration Profile</th>
                        <th className="px-5 py-3 text-right">Checked In At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCheckins.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                <User className="size-3.5" />
                              </div>
                              <span>{item.person_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.event_id ? (
                              <Link
                                href={`/admin/emergency-events?event=${item.event_id}&tab=map`}
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-800 hover:bg-sky-100 transition-colors"
                              >
                                <Siren className="size-2.5 text-sky-700" />
                                {item.event_name || "Emergency Event"}
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {item.member_id ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                                Registered Resident
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200">
                                Walk-in / Transient
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-600">
                            {new Date(item.checked_in_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Completed History List */
              pastCheckins.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Clock className="size-8 text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">
                    No completed check-out history recorded yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Evacuee Name</th>
                        <th className="px-4 py-3">Emergency Event</th>
                        <th className="px-4 py-3">Duration Sheltered</th>
                        <th className="px-4 py-3">Checked In</th>
                        <th className="px-5 py-3 text-right">Checked Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pastCheckins.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-bold text-slate-900">
                            {item.person_name}
                          </td>
                          <td className="px-4 py-3">
                            {item.event_id ? (
                              <Link
                                href={`/admin/emergency-events?event=${item.event_id}&tab=map`}
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-800 hover:bg-sky-100 transition-colors"
                              >
                                <Siren className="size-2.5 text-sky-700" />
                                {item.event_name || "Emergency Event"}
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.checked_out_at
                              ? `${Math.max(
                                  1,
                                  Math.round(
                                    (new Date(item.checked_out_at).getTime() -
                                      new Date(item.checked_in_at).getTime()) /
                                      (1000 * 60 * 60),
                                  ),
                                )} hrs`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {new Date(item.checked_in_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500 font-mono text-[11px]">
                            {item.checked_out_at
                              ? new Date(item.checked_out_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Col: Facility Dossier & GIS Map Preview */}
        <div className="flex flex-col gap-5">
          {/* Spatial Location Map Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-1 shadow-lg overflow-hidden flex flex-col">
            <div className="h-56 w-full overflow-hidden rounded-xl">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={center.id}
                onSelect={() => {}}
                showHazard
                showAreas
              />
            </div>
            <div className="p-3 text-xs text-white">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> Geocoded Coordinates
                </span>
                <span className="font-mono text-[11px]">
                  {center.facility.location.coordinates[1].toFixed(5)},{" "}
                  {center.facility.location.coordinates[0].toFixed(5)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-100/70">
                Overlay includes official UP NOAH 5-year flood inundation zones.
              </p>
            </div>
          </div>

          {/* Facility Details Dossier Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="size-4 text-emerald-700" />
              Facility Information
            </h3>

            <dl className="flex flex-col gap-3 text-xs">
              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Shelter Facility
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {center.facility.name}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Assigned Area
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {center.facility.area_name || "Barangay San Jose"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Contact Person & Hotline
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <User className="size-3 text-slate-400" />
                  {center.contact_person || "Designated Barangay Officer"}
                </dd>
                {center.contact_number ? (
                  <dd className="mt-1">
                    <a
                      href={toTelHref(center.contact_number)}
                      className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="size-3" />
                      {center.contact_number}
                    </a>
                  </dd>
                ) : null}
              </div>

              {center.notes ? (
                <div>
                  <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                    Equipment & Intake Notes
                  </dt>
                  <dd className="text-slate-600 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11.5px] leading-relaxed">
                    {center.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      {/* Close Shelter Confirmation Modal */}
      <AlertDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
      >
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
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
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
