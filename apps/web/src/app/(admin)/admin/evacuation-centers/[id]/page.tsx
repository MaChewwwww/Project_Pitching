"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  History,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Plus,
  User,
  UserCheck,
  UserPlus,
  Users,
  Users2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  AssetMetricCard,
} from "@/components/features/admin/asset-metric-strip";
import { EvacCheckinManagerDialog } from "@/components/features/admin/evac-checkin-manager-dialog";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { EvacCheckinOut } from "@/lib/api/public-types";
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

export default function EvacuationCenterDetailPage() {
  useRequireRole("admin");
  const params = useParams();
  const queryClient = useQueryClient();
  const centerId = params.id as string;

  const [activeTab, setActiveTab] = React.useState<"active" | "history">("active");

  /* Query center details */
  const { data: center, isLoading, isError } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId],
    queryFn: () =>
      api
        .get<EvacCenterDetail>(`/admin/evacuation-centers/${centerId}`)
        .then((r) => r.data),
  });

  /* Query live check-ins */
  const { data: activeCheckins = [], refetch: refetchActiveCheckins } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId, "check-ins", "active"],
    queryFn: () =>
      api
        .get<EvacCheckinOut[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
          params: { active_only: true },
        })
        .then((r) => r.data),
  });

  /* Query all check-ins (history) */
  const { data: allCheckins = [] } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId, "check-ins", "all"],
    queryFn: () =>
      api
        .get<EvacCheckinOut[]>(`/admin/evacuation-centers/${centerId}/check-ins`, {
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
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update status");
    },
  });

  /* Check-out mutation */
  const checkoutMutation = useMutation({
    mutationFn: (checkinId: string) =>
      api.post(`/admin/evacuation-centers/check-ins/${checkinId}/check-out`),
    onSuccess: () => {
      toast.success("Resident checked out successfully");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      refetchActiveCheckins();
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to check out resident");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse py-8">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-44 w-full rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-4 gap-4">
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
      {/* Back link & Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <Link
          href="/admin/evacuation-centers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Evacuation Centers Masterlist
        </Link>

        <div className="flex items-center gap-2">
          <EvacCheckinManagerDialog
            centerId={center.id}
            centerName={center.facility.name}
            capacity={center.capacity}
          />

          <Link href={`/admin/evacuation-centers/${center.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <Pencil className="size-3.5" />
              Edit Center
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22] p-6 text-white shadow-xl lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-inner">
            <Building2 className="size-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {center.facility.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs",
                  center.is_open
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-slate-700 text-slate-200",
                )}
              >
                {center.is_open ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-950" />
                    Open for Evacuees
                  </>
                ) : (
                  <>
                    <XCircle className="size-3 text-slate-400" />
                    Closed / Standby
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-emerald-100/80">
              {center.facility.address || "Barangay San Jose, Rodriguez, Rizal"}
              {center.facility.area_name ? ` • ${center.facility.area_name}` : ""}
            </p>
          </div>
        </div>

        {/* Quick Open/Close Action Toggle */}
        <div className="flex items-center gap-3">
          <Button
            variant={center.is_open ? "danger" : "primary"}
            className={cn(
              "h-10 px-5 text-xs font-bold shadow-md cursor-pointer",
              center.is_open
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-emerald-950",
            )}
            onClick={() => toggleOpenMutation.mutate(!center.is_open)}
            disabled={toggleOpenMutation.isPending}
          >
            {center.is_open ? "Deactivate / Close Center" : "Open Evacuation Center"}
          </Button>
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Real-time Shelter Load
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

          {/* Tabbed Check-in Roster */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
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

              <EvacCheckinManagerDialog
                centerId={center.id}
                centerName={center.facility.name}
                capacity={center.capacity}
                trigger={
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-7 gap-1 rounded-full bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    <Plus className="size-3" />
                    Intake Evacuee
                  </Button>
                }
              />
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
                    Use the Intake button above or the quick manager dialog to log
                    residents when an evacuation is ongoing.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Evacuee Name</th>
                        <th className="px-4 py-3">Registration Type</th>
                        <th className="px-4 py-3">Check-In Time</th>
                        <th className="px-5 py-3 text-right">Actions</th>
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
                          <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                            {new Date(item.checked_in_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkoutMutation.mutate(item.id)}
                              disabled={checkoutMutation.isPending}
                              className="h-7 gap-1 border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <LogOut className="size-3" />
                              Check Out
                            </Button>
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
                        <th className="px-4 py-3">Duration Sheltered</th>
                        <th className="px-4 py-3">Checked In</th>
                        <th className="px-5 py-3">Checked Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pastCheckins.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-bold text-slate-900">
                            {item.person_name}
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
                          <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                            {item.checked_out_at
                              ? new Date(item.checked_out_at).toLocaleString()
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="size-4 text-emerald-700" />
              Facility Information
            </h3>

            <dl className="flex flex-col gap-3 text-xs">
              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Linked Facility
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {center.facility.name}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Sitio / Area
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {center.facility.area_name || "Unassigned Sitio"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Contact Person & Desk
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <User className="size-3 text-slate-400" />
                  {center.contact_person || "Barangay Admin"}
                </dd>
                {center.contact_number ? (
                  <dd className="font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
                    <Phone className="size-3" />
                    {center.contact_number}
                  </dd>
                ) : null}
              </div>

              {center.notes ? (
                <div>
                  <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                    Operational Notes
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
    </div>
  );
}
