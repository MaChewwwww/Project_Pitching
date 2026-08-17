"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  History,
  MapPin,
  Megaphone,
  Pencil,
  Power,
  PowerOff,
  Radio,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DetailCardSkeleton } from "@/components/common/portal-loading";
import { AssetMetricCard } from "@/components/features/admin/asset-metric-strip";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { EditSirenDialog } from "@/components/features/admin/edit-siren-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { useSirenAudio } from "@/hooks/use-siren-audio";
import { cn } from "@/lib/utils";

interface SirenDetail {
  id: string;
  name: string;
  status: "idle" | "sounding" | "testing";
  location: { coordinates: [number, number] };
  area_id: string | null;
  area_name?: string | null;
  is_active: boolean;
  code?: string;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Area {
  id: string;
  name: string;
}

export default function SirenDetailPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sirenId = params.id as string;
  const sirenAudio = useSirenAudio();

  const [showHazard, setShowHazard] = React.useState(false);
  const [isDisableOpen, setIsDisableOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const {
    data: siren,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["admin", "sirens", sirenId],
    queryFn: () => api.get<SirenDetail>(`/admin/sirens/${sirenId}`).then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["admin", "sirens", sirenId, "audits"],
    queryFn: () =>
      api
        .get<
          Array<{
            id: number | string;
            action: string;
            classification: string;
            created_at: string;
            changes?: Record<string, unknown>;
          }>
        >(`/admin/sirens/${sirenId}/audits`)
        .then((r) => r.data),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post(`/admin/sirens/${sirenId}/trigger`),
    onSuccess: (res: { data: SirenDetail }) => {
      sirenAudio.start();
      toast.success(
        res.data.status === "sounding"
          ? "Operational siren alarm sounding (Web Audio synth active)"
          : "Siren returned to idle",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId, "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to trigger siren");
    },
  });

  const drillMutation = useMutation({
    mutationFn: () => api.post(`/admin/sirens/${sirenId}/trigger?is_drill=true`),
    onSuccess: () => {
      sirenAudio.start();
      toast.warning("🚨 Siren Drill Simulation Activated (Audit Classified: Drill)");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId, "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to start drill simulation");
    },
  });

  const silenceMutation = useMutation({
    mutationFn: () => api.post(`/admin/sirens/${sirenId}/silence?is_drill=true`),
    onSuccess: () => {
      sirenAudio.stop();
      toast.success("Siren alarm silenced");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId, "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to silence siren");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.post(`/admin/sirens/${sirenId}/deactivate`),
    onSuccess: () => {
      sirenAudio.stop();
      toast.success("Siren unit disabled");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId, "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not disable siren");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/sirens/${sirenId}`),
    onSuccess: () => {
      sirenAudio.stop();
      toast.success("Siren station deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      router.push("/admin/sirens");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not delete siren");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.post(`/admin/sirens/${sirenId}/reactivate`),
    onSuccess: () => {
      toast.success("Siren unit reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId, "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not reactivate siren");
    },
  });

  if (isFetching)
    return <DetailCardSkeleton label="Loading siren unit details" rows={7} />;

  if (isError || !siren) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <Megaphone className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Siren Station Not Found</h2>
        <p className="max-w-md text-sm text-slate-500">
          The requested siren unit record does not exist or may have been removed.
        </p>
        <Link href="/admin/sirens">
          <Button variant="primary">Return to Siren Network</Button>
        </Link>
      </div>
    );
  }

  const areaName =
    siren.area_name ||
    areas.find((a) => a.id === siren.area_id)?.name ||
    "Unassigned Area";

  const isSounding = siren.is_active && siren.status === "sounding";
  const isTesting = siren.is_active && siren.status === "testing";

  const mapItem = {
    id: siren.id,
    name: siren.name,
    category: "siren" as const,
    location: siren.location,
    area_name: areaName,
    statusLabel: isSounding ? "Sounding Alarm" : isTesting ? "Testing Drill" : "Idle",
    tone: !siren.is_active
      ? ("slate" as const)
      : isSounding
        ? ("rose" as const)
        : isTesting
          ? ("amber" as const)
          : ("emerald" as const),
    isSounding,
    acousticRadius: 500,
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Hero Header Card */}
      <div
        className={cn(
          "flex flex-col justify-between gap-5 rounded-3xl border p-6 shadow-xs transition-all lg:flex-row lg:items-center",
          isSounding
            ? "border-rose-300/80 bg-gradient-to-r from-rose-100/90 via-rose-50/60 to-white text-slate-900 shadow-sm"
            : "border-emerald-200/90 bg-gradient-to-r from-emerald-100/80 via-emerald-50/50 to-white text-slate-900 shadow-sm",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-2xl border shadow-inner transition-all",
              isSounding
                ? "animate-pulse border-rose-300 bg-rose-100 text-rose-700"
                : "border-emerald-500 bg-emerald-600 text-white shadow-sm",
            )}
          >
            <Megaphone className="size-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {siren.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold shadow-2xs",
                  !siren.is_active
                    ? "border border-slate-300 bg-slate-100 text-slate-700"
                    : isSounding
                      ? "animate-pulse border border-rose-500 bg-rose-600 text-white shadow-sm"
                      : "border border-emerald-300 bg-emerald-100 font-bold text-emerald-800",
                )}
              >
                {isSounding ? (
                  <>
                    <Volume2 className="size-3.5 text-white" />
                    Broadcasting Alarm
                  </>
                ) : !siren.is_active ? (
                  "Inactive Standby"
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-700" />
                    Standby Ready
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">
              500m Acoustic Early Warning Radius • {areaName}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {siren.is_active ? (
            isSounding ? (
              <Button
                variant="danger"
                className="h-10 animate-pulse cursor-pointer gap-2 rounded-xl border border-rose-500 bg-rose-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                onClick={() => silenceMutation.mutate()}
                disabled={silenceMutation.isPending}
              >
                <VolumeX className="size-4 text-white" />
                <span className="text-white">Silence Siren Alarm</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                className="h-10 cursor-pointer gap-2 rounded-xl border border-emerald-600 bg-emerald-700 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
              >
                <Volume2 className="size-4 text-white" />
                <span className="text-white">Trigger Alarm Simulation</span>
              </Button>
            )
          ) : (
            <Button
              variant="primary"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="h-10 rounded-xl border border-emerald-600 bg-emerald-700 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
            >
              <Power className="size-4 text-white" />
              Reactivate Siren
            </Button>
          )}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AssetMetricCard
          icon={Radio}
          label="Audio Simulation"
          value={isSounding ? "Sounding" : isTesting ? "Testing" : "Idle"}
          sub={isSounding ? "Web Audio synth playing" : "Station armed"}
          tone={isSounding ? "rose" : isTesting ? "amber" : "emerald"}
          badge={
            isSounding ? (
              <span className="animate-pulse rounded-full bg-rose-600 px-2 py-0.5 text-[9.5px] font-black tracking-wider text-white uppercase">
                Active
              </span>
            ) : null
          }
        />
        <AssetMetricCard
          icon={MapPin}
          label="Assigned Area"
          value={areaName}
          sub="Target coverage sector"
          tone="emerald"
        />
        <AssetMetricCard
          icon={Users}
          label="Acoustic Reach"
          value="500m"
          unit="Radius"
          sub="High-decibel emergency siren"
          tone="sky"
        />
        <AssetMetricCard
          icon={History}
          label="Last Activation"
          value={
            siren.last_triggered_at
              ? new Date(siren.last_triggered_at).toLocaleDateString()
              : "None"
          }
          sub={
            siren.last_triggered_at
              ? new Date(siren.last_triggered_at).toLocaleTimeString()
              : "No past activations recorded"
          }
          tone="neutral"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Simulation Bench & Trigger Logs (7 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Audio Test Bench Card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Volume2 className="size-4 text-emerald-700" />
                Acoustic Synthesizer Control Bench
              </h3>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                Web Audio API (Client-Side)
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              When an emergency alert or flood warning is issued, this siren station can
              be triggered to synthesize an auditory alert sweep (600Hz &rarr; 1200Hz
              saw-tooth wave) and broadcast radial ripples on public GIS maps.
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {isSounding ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => silenceMutation.mutate()}
                    disabled={silenceMutation.isPending}
                    className="animate-pulse cursor-pointer gap-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                  >
                    <VolumeX className="size-3.5" />
                    {silenceMutation.isPending ? "Silencing…" : "Stop Siren Alarm"}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => drillMutation.mutate()}
                      disabled={drillMutation.isPending || !siren.is_active}
                      className="cursor-pointer gap-1.5 rounded-xl border border-amber-400 bg-amber-500 text-xs font-black text-slate-950 shadow-xs hover:bg-amber-400"
                    >
                      <Radio className="size-3.5 text-slate-950" />
                      {drillMutation.isPending
                        ? "Activating Drill…"
                        : "Run Drill Simulation"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerMutation.mutate()}
                      disabled={triggerMutation.isPending || !siren.is_active}
                      className="cursor-pointer gap-1.5 rounded-xl border border-rose-500 bg-rose-600 text-xs font-bold text-white shadow-xs hover:bg-rose-500"
                    >
                      <Volume2 className="size-3.5 text-white" />
                      {triggerMutation.isPending
                        ? "Triggering…"
                        : "Sound Emergency Alarm"}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sirenAudio.start();
                    setTimeout(() => sirenAudio.stop(), 3000);
                    toast.info("Playing 3-second diagnostic tone sweep", {
                      icon: "🔔",
                      className: "border-blue-300 bg-blue-50 text-blue-950 font-medium",
                    });
                  }}
                  className="cursor-pointer gap-1.5 rounded-xl border border-blue-400 bg-blue-600 text-xs font-bold text-white shadow-2xs hover:bg-blue-500"
                >
                  <Activity className="size-3.5 text-white" />
                  Play 3s Test Chime
                </Button>
              </div>

              {/* Station Management Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
                <EditSirenDialog
                  siren={siren}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5 rounded-xl border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-100"
                    >
                      <Pencil className="size-3.5 text-amber-700" />
                      Edit
                    </Button>
                  }
                />

                {siren.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDisableOpen(true)}
                    disabled={deactivateMutation.isPending}
                    className="cursor-pointer gap-1.5 rounded-xl border-neutral-300 bg-neutral-100 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-200"
                  >
                    <PowerOff className="size-3.5 text-neutral-600" />
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    className="cursor-pointer gap-1.5 rounded-xl border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100"
                  >
                    <Power className="size-3.5 text-emerald-600" />
                    Reactivate
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="cursor-pointer gap-1.5 rounded-xl border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Trigger Audit Timeline */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <History className="size-4 text-emerald-700" />
                Siren Activation & Drill Audit Log
              </h3>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700">
                {audits.length} Recorded Events
              </span>
            </div>

            <div className="custom-scrollbar flex max-h-[420px] flex-col gap-2.5 overflow-y-auto pr-1.5">
              {audits.length > 0 ? (
                audits.map((log) => {
                  const isDrill =
                    log.classification === "Drill" || log.action.includes("drill");
                  const isSilence = log.action.includes("silence");
                  const isCreate = log.action.includes("create");
                  const isDeactivate = log.action.includes("deactivate");
                  const isReactivate = log.action.includes("reactivate");
                  const isDelete = log.action.includes("delete");

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3.5 text-xs shadow-2xs transition-all",
                        isDrill
                          ? "border-sky-200 bg-sky-50/50"
                          : isSilence
                            ? "border-slate-200 bg-slate-50/60"
                            : isCreate || isReactivate
                              ? "border-emerald-200 bg-emerald-50/40"
                              : isDeactivate
                                ? "border-neutral-200 bg-neutral-50/70"
                                : isDelete
                                  ? "border-rose-200 bg-rose-50/40"
                                  : "border-rose-200 bg-rose-50/50",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg font-bold shadow-2xs",
                          isDrill
                            ? "bg-sky-100 text-sky-700"
                            : isSilence
                              ? "bg-slate-200 text-slate-700"
                              : isCreate || isReactivate
                                ? "bg-emerald-100 text-emerald-700"
                                : isDeactivate
                                  ? "bg-neutral-200 text-neutral-700"
                                  : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {isDrill ? (
                          <Radio className="size-4" />
                        ) : isSilence ? (
                          <VolumeX className="size-4" />
                        ) : isCreate || isReactivate ? (
                          <CheckCircle2 className="size-4" />
                        ) : isDeactivate ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {isDrill
                                ? isSilence
                                  ? "Drill Concluded & Silenced"
                                  : "Drill Simulation Triggered"
                                : isSilence
                                  ? "Operational Alarm Silenced"
                                  : isCreate
                                    ? "Station Deployed & Geocoded"
                                    : isDeactivate
                                      ? "Station Unit Disabled"
                                      : isReactivate
                                        ? "Station Unit Reactivated"
                                        : isDelete
                                          ? "Station Soft-Deleted"
                                          : "Operational Emergency Alarm Triggered"}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9.5px] font-black tracking-wider uppercase",
                                isDrill
                                  ? "bg-sky-200/80 text-sky-800"
                                  : isSilence
                                    ? "bg-slate-200 text-slate-700"
                                    : isCreate || isReactivate
                                      ? "bg-emerald-200 text-emerald-800"
                                      : isDeactivate
                                        ? "bg-neutral-200 text-neutral-800"
                                        : "bg-rose-200 text-rose-800",
                              )}
                            >
                              {log.classification || (isDrill ? "Drill" : "Operational")}
                            </span>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                          {isDrill
                            ? "Conduct of municipal readiness simulation drill with 500m omnidirectional acoustic reach."
                            : isSilence
                              ? "Acoustic alarm silenced by DRRM Command Center officer."
                              : isCreate
                                ? `Siren station mounted and registered with 500m acoustic reach in ${areaName}.`
                                : isDeactivate
                                  ? `Siren station placed into standby disabled state.`
                                  : isReactivate
                                    ? `Siren station reactivated and placed into active standby.`
                                    : isDelete
                                      ? `Siren station record soft-deleted from GIS views.`
                                      : "Official DRRM operational flood emergency alarm broadcasted."}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 font-bold text-emerald-700">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">
                        Station Initialized & Geocoded
                      </p>
                      <span className="font-mono text-[11px] text-slate-400">System</span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-slate-500">
                      Siren unit pinned to {areaName} coordinates with 500m
                      omnidirectional buffer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Map (5 cols, full height) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Spatial Location Map Card */}
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-900/60 bg-[#052e16] p-1 shadow-md">
            <div className="min-h-[460px] w-full flex-1 overflow-hidden rounded-xl bg-slate-950 lg:min-h-[520px]">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={siren.id}
                onSelect={() => {}}
                showHazard={showHazard}
                showAreas
                showAcousticBuffer
                showLegend={false}
                showDataSources={false}
              />
            </div>
            {/* Green Footer: Flood Hazard Checkbox & Attributions */}
            <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-emerald-900/80 bg-[#052e16] px-3.5 py-2.5 text-xs text-white">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white select-none">
                <input
                  type="checkbox"
                  checked={showHazard}
                  onChange={(e) => setShowHazard(e.target.checked)}
                  className="size-4 cursor-pointer rounded border-emerald-600 bg-emerald-900/80 text-emerald-500 accent-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                />
                <span className="text-[11.5px] font-semibold text-emerald-100">
                  Show Flood Hazard Overlay
                </span>
              </label>

              <div className="shrink-0 text-[10.5px] font-medium text-emerald-300/80">
                Leaflet · © OpenStreetMap
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disable Siren Confirmation Modal */}
      <AlertDialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-800">
                <PowerOff className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base leading-tight font-black text-slate-900">
                  Disable Siren Station?
                </AlertDialogTitle>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                  {siren.name} · {siren.code || "SRN-SYS"}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-slate-600">
              Placing this siren station into standby disabled state will temporarily
              deactivate its acoustic broadcasting and disarm emergency simulation
              triggers until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDisableOpen(false)}
              disabled={deactivateMutation.isPending}
              className="cursor-pointer rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                deactivateMutation.mutate(undefined, {
                  onSettled: () => setIsDisableOpen(false),
                });
              }}
              disabled={deactivateMutation.isPending}
              className="cursor-pointer rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-xs hover:bg-neutral-800"
            >
              {deactivateMutation.isPending ? "Disabling…" : "Confirm Disable"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Siren Confirmation Modal */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-200 bg-rose-100 text-rose-700">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base leading-tight font-black text-slate-900">
                  Delete Siren Station?
                </AlertDialogTitle>
                <p className="mt-0.5 truncate text-xs font-bold text-rose-700">
                  {siren.name} · {siren.code || "SRN-SYS"}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-slate-600">
              Are you sure you want to delete this siren station? This will remove the
              unit from active GIS map views and operational monitoring while preserving
              all historical audit logs and simulation records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteMutation.isPending}
              className="cursor-pointer rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSettled: () => setIsDeleteOpen(false),
                });
              }}
              disabled={deleteMutation.isPending}
              className="cursor-pointer rounded-xl bg-rose-600 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
