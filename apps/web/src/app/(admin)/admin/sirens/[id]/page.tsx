"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Copy,
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
import {
  AssetMetricCard,
} from "@/components/features/admin/asset-metric-strip";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { EditSirenDialog } from "@/components/features/admin/edit-siren-dialog";
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
  last_triggered_at?: string | null;
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

  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const { data: siren, isLoading, isError } = useQuery({
    queryKey: ["admin", "sirens", sirenId],
    queryFn: () =>
      api.get<SirenDetail>(`/admin/sirens/${sirenId}`).then((r) => r.data),
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
            id: string;
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

  if (isError || !siren) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <Megaphone className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Siren Station Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md">
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

  const [lng, lat] = siren.location.coordinates;
  const coordsStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coordsStr);
    setCopiedCoords(true);
    toast.success("Coordinates copied to clipboard");
    setTimeout(() => setCopiedCoords(false), 2000);
  };

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
          "flex flex-col justify-between gap-5 rounded-3xl border p-6 text-white shadow-xl transition-all lg:flex-row lg:items-center",
          isSounding
            ? "border-rose-600/80 bg-gradient-to-r from-slate-950 via-[#3d0909] to-slate-950 shadow-2xl"
            : "border-emerald-900/50 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-2xl border shadow-inner transition-all",
              isSounding
                ? "bg-rose-600/30 text-rose-300 border-rose-500 animate-pulse"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
            )}
          >
            <Megaphone className="size-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {siren.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold shadow-xs",
                  !siren.is_active
                    ? "bg-slate-800 text-slate-300 border border-slate-700"
                    : isSounding
                      ? "bg-rose-600 text-white border border-rose-400 shadow-sm animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40",
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
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Standby Ready
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-200 font-medium">
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
                className="h-10 gap-2 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-500 border border-rose-400 shadow-md cursor-pointer animate-pulse"
                onClick={() => silenceMutation.mutate()}
                disabled={silenceMutation.isPending}
              >
                <VolumeX className="size-4 text-white" />
                <span className="text-white">Silence Siren Alarm</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                className="h-10 gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-500 border border-emerald-400/80 shadow-md cursor-pointer"
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
              className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-500 border border-emerald-400"
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
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white animate-pulse">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Simulation Bench & Trigger Logs */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Audio Test Bench Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Volume2 className="size-4 text-emerald-700" />
                Acoustic Synthesizer Control Bench
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                Web Audio API (Client-Side)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When an emergency alert or flood warning is issued, this siren station
              can be triggered to synthesize an auditory alert sweep (600Hz &rarr;
              1200Hz saw-tooth wave) and broadcast radial ripples on public GIS maps.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              {isSounding ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => silenceMutation.mutate()}
                  disabled={silenceMutation.isPending}
                  className="gap-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-xs cursor-pointer"
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
                    className="gap-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 shadow-xs cursor-pointer"
                  >
                    <Radio className="size-3.5 text-slate-950" />
                    {drillMutation.isPending ? "Activating Drill…" : "Run Drill Simulation"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerMutation.mutate()}
                    disabled={triggerMutation.isPending || !siren.is_active}
                    className="gap-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-xs cursor-pointer"
                  >
                    <Volume2 className="size-3.5 text-white" />
                    {triggerMutation.isPending ? "Triggering…" : "Sound Emergency Alarm"}
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
                className="gap-1 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400 ml-auto shadow-2xs cursor-pointer"
              >
                <Activity className="size-3.5 text-white" />
                Play 3s Test Chime
              </Button>
            </div>
          </div>

          {/* Trigger Audit Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="size-4 text-emerald-700" />
                Siren Activation & Drill Audit Log
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200">
                {audits.length} Recorded Events
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {audits.length > 0 ? (
                audits.map((log) => {
                  const isDrill = log.classification === "Drill" || log.action.includes("drill");
                  const isSilence = log.action.includes("silence");
                  const isCreate = log.action.includes("create");
                  const isDeactivate = log.action.includes("deactivate");
                  const isReactivate = log.action.includes("reactivate");
                  const isDelete = log.action.includes("delete");

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all shadow-2xs",
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
                          "grid size-8 shrink-0 place-items-center rounded-lg font-bold shadow-2xs mt-0.5",
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
                                "rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider",
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
                          <span className="font-mono text-[11px] text-slate-500 shrink-0">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 text-[11.5px] leading-relaxed">
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
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 text-xs bg-slate-50/50">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">
                        Station Initialized & Geocoded
                      </p>
                      <span className="font-mono text-[11px] text-slate-400">
                        System
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-500 text-[11.5px]">
                      Siren unit pinned to {areaName} coordinates with 500m omnidirectional buffer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Map & Station Dossier */}
        <div className="flex flex-col gap-5">
          {/* Spatial Location Map Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-1 shadow-lg overflow-hidden flex flex-col">
            <div className="h-64 w-full overflow-hidden rounded-xl">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={siren.id}
                onSelect={() => {}}
                showHazard
                showAreas
                showAcousticBuffer
                showEvacLegend={false}
                showSirenLegend={true}
              />
            </div>
            <div className="p-3.5 text-xs text-white">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> GPS Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-200 hover:text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700 cursor-pointer"
                >
                  <Copy className="size-2.5" />
                  {copiedCoords ? "Copied!" : coordsStr}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-100/70">
                Green circle denotes 500-meter acoustic propagation boundary.
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Station Management
            </h4>

            <EditSirenDialog
              siren={siren}
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-xs font-bold border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl cursor-pointer"
                >
                  <Pencil className="size-3.5 text-amber-700" />
                  Edit Siren Coordinates & Label
                </Button>
              }
            />

            {siren.is_active ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm(
                      `Disable siren station "${siren.name}"?\n\nThe unit will be placed into an inactive standby state.`,
                    )
                  ) {
                    deactivateMutation.mutate();
                  }
                }}
                disabled={deactivateMutation.isPending}
                className="w-full justify-start gap-2 text-xs font-bold border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 rounded-xl cursor-pointer"
              >
                <PowerOff className="size-3.5 text-neutral-600" />
                Disable Siren Station
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
                className="w-full justify-start gap-2 text-xs font-bold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-xl cursor-pointer"
              >
                <Power className="size-3.5 text-emerald-600" />
                Reactivate Siren Station
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete siren station "${siren.name}"?\n\nThis will remove the unit from active GIS maps and operational monitoring while preserving all historical audit logs and simulation records.`,
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="w-full justify-start gap-2 text-xs font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              Delete Siren Station
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
