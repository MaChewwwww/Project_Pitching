"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Crosshair,
  Eye,
  Filter,
  History,
  Layers,
  MapPin,
  Megaphone,
  Pencil,
  Power,
  PowerOff,
  Radio,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  AssetMetricStrip,
  type AssetMetricCardProps,
} from "@/components/features/admin/asset-metric-strip";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { useSirenAudio } from "@/hooks/use-siren-audio";
import { DeploySirenDialog } from "@/components/features/admin/deploy-siren-dialog";
import { EditSirenDialog } from "@/components/features/admin/edit-siren-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Siren {
  id: string;
  name: string;
  status: "idle" | "sounding" | "testing";
  location: { coordinates: [number, number] };
  area_id: string | null;
  area_name?: string | null;
  is_active: boolean;
  last_triggered_at?: string | null;
}

interface SirenAudit {
  id: number | string;
  action: string;
  entity_id: string | null;
  actor_user_id: string | null;
  classification: string;
  created_at: string;
  changes?: Record<string, unknown> | null;
}

interface Area {
  id: string;
  name: string;
}

const SAN_JOSE_AREAS = [
  "Area 1",
  "Area 2",
  "Area 3",
  "Area 4",
  "Area 5",
  "Area 6",
];

function LayerCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
      <input
        type="checkbox"
        className="size-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 accent-emerald-500 cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function AdminSirensPage() {
  useRequireRole("admin");
  const sirenAudio = useSirenAudio();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showHazard, setShowHazard] = React.useState(false);
  const [showAreas, setShowAreas] = React.useState(true);
  const [showAcousticBuffer, setShowAcousticBuffer] = React.useState(true);

  const [statusFilter, setStatusFilter] = React.useState("all");
  const [areaFilter, setAreaFilter] = React.useState("all");

  const [sirenToDisable, setSirenToDisable] = React.useState<Siren | null>(null);
  const [sirenToDelete, setSirenToDelete] = React.useState<Siren | null>(null);

  const { data: sirens, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "sirens"],
    queryFn: () => api.get<Siren[]>("/admin/sirens").then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const { data: audits = [], isLoading: isAuditsLoading } = useQuery<SirenAudit[]>({
    queryKey: ["admin", "sirens", "audits"],
    queryFn: () => api.get<SirenAudit[]>("/admin/sirens/audits").then((r) => r.data),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/trigger`),
    onSuccess: (res: { data: Siren }) => {
      sirenAudio.start();
      toast.success(
        res.data.status === "sounding"
          ? "Siren alarm activated (sounding)"
          : "Siren returned to idle",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to trigger siren");
    },
  });

  const silenceMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/silence`),
    onSuccess: () => {
      sirenAudio.stop();
      toast.success("Siren alarm silenced");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to silence siren");
    },
  });

  const triggerAllDrillMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; affected_count: number }>("/admin/sirens/drill/trigger"),
    onSuccess: (res) => {
      sirenAudio.start();
      toast.warning(
        `🚨 Drill Simulation Active: ${res.data.affected_count} siren stations sounding (Audit Classified: Drill)`,
        {
          className: "border-amber-300 bg-amber-50 text-amber-950 font-medium",
        },
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to trigger drill simulation");
    },
  });

  const silenceAllDrillMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; affected_count: number }>("/admin/sirens/drill/silence"),
    onSuccess: (res) => {
      sirenAudio.stop();
      toast.success(
        `⏹ Drill Simulation Concluded: ${res.data.affected_count} siren stations silenced (Audit Classified: Drill)`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to silence drill simulation");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/deactivate`),
    onSuccess: () => {
      toast.success("Siren unit disabled");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not disable siren");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sirens/${id}`),
    onSuccess: () => {
      toast.success("Siren station deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not delete siren");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Siren unit reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", "audits"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not reactivate siren");
    },
  });

  const allSirens = React.useMemo(() => sirens ?? [], [sirens]);

  const areaName = React.useCallback(
    (item: Siren) => {
      if (item.area_name) return item.area_name;
      return areas.find((a) => a.id === item.area_id)?.name ?? "—";
    },
    [areas],
  );

  /* Stats calculation */
  const stats = React.useMemo(() => {
    const total = allSirens.length;
    const active = allSirens.filter((s) => s.is_active);
    const sounding = active.filter((s) => s.status === "sounding");
    const testing = active.filter((s) => s.status === "testing");
    const idle = active.filter((s) => s.status === "idle");

    return {
      total,
      activeCount: active.length,
      soundingCount: sounding.length,
      testingCount: testing.length,
      idleCount: idle.length,
    };
  }, [allSirens]);

  /* 5 Operational Metric Cards */
  const metricCards: AssetMetricCardProps[] = [
    {
      icon: Megaphone,
      label: "Active Siren Network",
      value: stats.activeCount,
      unit: `/ ${stats.total} total`,
      sub: "Acoustic early warning stations",
      tone: "emerald",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          Ready
        </span>
      ),
    },
    {
      icon: Volume2,
      label: "Currently Sounding",
      value: stats.soundingCount,
      unit: "units",
      sub:
        stats.soundingCount > 0
          ? "Broadcasting acoustic alarm"
          : "All siren units idle",
      tone: stats.soundingCount > 0 ? "rose" : "neutral",
      badge:
        stats.soundingCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs animate-pulse">
            Active Alarm
          </span>
        ) : null,
    },
    {
      icon: Activity,
      label: "Drill & Testing Mode",
      value: stats.testingCount,
      unit: "units",
      sub: "Acoustic maintenance check",
      tone: stats.testingCount > 0 ? "amber" : "neutral",
    },
    {
      icon: Radio,
      label: "Acoustic Radius",
      value: "500m",
      unit: "per station",
      sub: "Omnidirectional siren projection",
      tone: "sky",
    },
    {
      icon: MapPin,
      label: "Area Coverage",
      value: "100%",
      unit: "Coverage",
      sub: "Geocoded across San Jose Areas",
      tone: "emerald",
    },
  ];

  /* Filter sirens */
  const filteredSirens = React.useMemo(() => {
    return allSirens.filter((siren) => {
      if (statusFilter === "sounding" && siren.status !== "sounding") return false;
      if (statusFilter === "idle" && siren.status !== "idle") return false;
      if (statusFilter === "testing" && siren.status !== "testing") return false;
      if (statusFilter === "inactive" && siren.is_active) return false;

      if (areaFilter !== "all") {
        if (areaName(siren) !== areaFilter) return false;
      }

      return true;
    });
  }, [allSirens, statusFilter, areaFilter, areaName]);

  /* Map Items - strictly only active sirens on the map canvas */
  const mapItems = React.useMemo(() => {
    return filteredSirens
      .filter((siren) => siren.is_active)
      .map((siren) => {
        const isSounding = siren.status === "sounding";
        const isTesting = siren.status === "testing";

        const tone: "emerald" | "amber" | "rose" = isSounding
          ? "rose"
          : isTesting
            ? "amber"
            : "emerald";

        const statusLabel = isSounding
          ? "Sounding"
          : isTesting
            ? "Testing Drill"
            : "Idle (Standby)";

        return {
          id: siren.id,
          name: siren.name,
          category: "siren" as const,
          location: siren.location,
          area_name: areaName(siren),
          statusLabel,
          tone,
          isSounding,
          acousticRadius: 500,
          subDetail: siren.last_triggered_at
            ? `Last active: ${new Date(siren.last_triggered_at).toLocaleString()}`
            : "No simulation drills recorded",
          detailUrl: `/admin/sirens/${siren.id}`,
          onTrigger: (id: string) => triggerMutation.mutate(id),
          onSilence: (id: string) => silenceMutation.mutate(id),
        };
      });
  }, [filteredSirens, areaName, triggerMutation, silenceMutation]);

  /* ResourceTable Columns */
  const columns: ResourceColumn<Siren>[] = [
    {
      key: "name",
      header: "Siren Unit & Station",
      render: (row) => {
        const isSounding = row.is_active && row.status === "sounding";
        const isTesting = row.is_active && row.status === "testing";
        return (
          <div className="flex items-center gap-3 min-w-48 max-w-sm">
            <div
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-lg font-bold shadow-2xs overflow-hidden transition-all",
                isSounding
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-emerald-100 text-emerald-800",
              )}
            >
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/admin/sirens/${row.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-sm text-neutral-900 hover:text-emerald-700 hover:underline transition-colors truncate block"
              >
                {row.name}
              </Link>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {areaName(row) !== "—" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    <MapPin className="size-2.5" />
                    {areaName(row)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-2xs",
                    !row.is_active
                      ? "border-slate-200 bg-slate-100 text-slate-600"
                      : isSounding
                        ? "border-rose-300 bg-rose-100 text-rose-800 animate-pulse"
                        : isTesting
                          ? "border-amber-300 bg-amber-100 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {isSounding ? (
                    <>
                      <Volume2 className="size-2.5 text-rose-600 animate-bounce" />
                      Sounding
                    </>
                  ) : isTesting ? (
                    <>
                      <Activity className="size-2.5 text-amber-700" />
                      Drill
                    </>
                  ) : !row.is_active ? (
                    "Disabled"
                  ) : (
                    <>
                      <VolumeX className="size-2.5 text-emerald-600" />
                      Idle Standby
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "last_triggered_at",
      header: "Last Activation",
      render: (row) => (
        <span className="text-xs font-mono text-neutral-600">
          {row.last_triggered_at
            ? new Date(row.last_triggered_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
            : "No activations yet"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Siren Alert Network"
        description="Public early warning acoustic simulation system. Control siren test drills, sound alerts during flash floods, and monitor Area coverage."
        action={<DeploySirenDialog />}
      />

      {/* Top 5 Metrics Strip */}
      <AssetMetricStrip items={metricCards} />

      {/* Two-Column Map Workspace */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Column 1: Map Canvas */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="relative h-[480px] sm:h-[580px] lg:h-[620px] w-full overflow-hidden">
            <AdminAssetWorkspaceMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
              showAreas={showAreas}
              showAcousticBuffer={showAcousticBuffer}
              showEvacLegend={false}
              showSirenLegend={true}
            />
          </div>
        </div>

        {/* Column 2: Filter and Simulation Control Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Map Layers Card */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              Map Overlays
            </p>
            <div className="flex flex-col gap-2">
              <LayerCheckbox
                checked={showAcousticBuffer}
                onChange={setShowAcousticBuffer}
                label="500m Acoustic Buffers"
              />
              <LayerCheckbox
                checked={showAreas}
                onChange={setShowAreas}
                label="Barangay Area Boundaries"
              />
              <LayerCheckbox
                checked={showHazard}
                onChange={setShowHazard}
                label="5-Year Flood Hazard"
              />
            </div>
          </div>

          {/* Quick Simulation Drill Panel */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Radio
                  className={cn(
                    "size-3.5",
                    stats.soundingCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400",
                  )}
                />
                Simulation
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-2xs",
                  stats.soundingCount > 0
                    ? "bg-rose-900/90 text-white border border-rose-600 animate-pulse"
                    : "bg-emerald-950 text-white border border-emerald-700/80",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    stats.soundingCount > 0 ? "bg-rose-400 animate-ping" : "bg-emerald-400",
                  )}
                />
                {stats.soundingCount > 0 ? "Drill Sounding" : "Drill Standby"}
              </span>
            </div>

            <p className="text-xs text-white/90 leading-relaxed">
              Conducts a full barangay-wide auditory drill across all {stats.activeCount} active stations. Recorded audit entries are classified as <strong className="text-white font-bold">Drill</strong>.
            </p>

            <div className="mt-1 flex flex-col gap-2">
              {stats.soundingCount > 0 ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={silenceAllDrillMutation.isPending}
                  onClick={() => silenceAllDrillMutation.mutate()}
                  className="h-9 justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md cursor-pointer animate-pulse"
                >
                  <VolumeX className="size-3.5" />
                  {silenceAllDrillMutation.isPending
                    ? "Silencing Drill…"
                    : "Stop Drill & Silence All Sirens"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={triggerAllDrillMutation.isPending || stats.activeCount === 0}
                  onClick={() => triggerAllDrillMutation.mutate()}
                  className="h-9 justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 border border-amber-400 shadow-md cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700"
                >
                  <Radio className="size-3.5 text-slate-950" />
                  {triggerAllDrillMutation.isPending
                    ? "Activating Drill…"
                    : `Start Barangay Drill (${stats.activeCount} Sirens)`}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sirenAudio.start();
                  setTimeout(() => sirenAudio.stop(), 3000);
                  toast.info("Playing 3-second local diagnostic chime", {
                    icon: "🔔",
                    className: "border-blue-300 bg-blue-50 text-blue-950 font-medium",
                  });
                }}
                className="h-8 justify-center gap-1.5 border-blue-400 bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 shadow-xs cursor-pointer"
              >
                <Activity className="size-3.5 text-white" />
                Play 3s Diagnostic Chime
              </Button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between h-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Filter className="size-3.5 text-emerald-400" aria-hidden />
                Siren Filters
              </p>
              {(statusFilter !== "all" || areaFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setAreaFilter("all");
                  }}
                  className="inline-flex items-center gap-1 rounded bg-emerald-900/80 px-2 py-0.5 text-[10px] font-bold text-white border border-emerald-700/60 hover:bg-emerald-800 transition-all shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="size-2.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-white">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sounding">Sounding (Active Alarm)</SelectItem>
                    <SelectItem value="idle">Idle (Standby)</SelectItem>
                    <SelectItem value="testing">Testing Drill</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-white">
                  Assigned Area
                </label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {SAN_JOSE_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Lower Section: Column 1 (Siren Unit List) | Column 2 (Past Latest Events / History) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* Column 1: Siren Management Table */}
        <div className="flex flex-col gap-3 xl:col-span-7">
          <ResourceTable
            columns={columns}
            data={filteredSirens}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            getRowKey={(row) => row.id}
            selectedRowKey={selectedId}
            searchPlaceholder="Search siren unit name, area, status…"
            filterSlots={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                    <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-44">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sounding">Sounding</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="inline-flex h-9 w-fit min-w-[120px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                    <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-40">
                    <SelectItem value="all">All Areas</SelectItem>
                    {SAN_JOSE_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
            toolbarAction={<DeploySirenDialog />}
            rowActions={(row) => (
              <div
                className="flex flex-wrap items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Locate (Icon Only) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedId(row.id)}
                  aria-label={`Locate ${row.name}`}
                  className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
                  title="Locate on Map"
                >
                  <Crosshair aria-hidden className="size-3.5 text-slate-700" />
                </Button>

                {/* 2. Details (Green Icon Only) */}
                <Link href={`/admin/sirens/${row.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer shrink-0"
                    title="View Siren Telemetry & History"
                    aria-label={`View Details for ${row.name}`}
                  >
                    <Eye className="size-3.5 text-emerald-700" />
                  </Button>
                </Link>

                {/* 3. Trigger / Silence (Orange) */}
                {row.is_active ? (
                  <Button
                    variant={row.status === "sounding" ? "danger" : "outline"}
                    size="sm"
                    onClick={() =>
                      row.status === "sounding"
                        ? silenceMutation.mutate(row.id)
                        : triggerMutation.mutate(row.id)
                    }
                    disabled={triggerMutation.isPending || silenceMutation.isPending}
                    className={cn(
                      "h-8 gap-1.5 text-xs font-bold shadow-2xs px-2.5 cursor-pointer",
                      row.status === "sounding"
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "border-amber-400/90 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-500",
                    )}
                  >
                    {row.status === "sounding" ? (
                      <>
                        <VolumeX className="size-3.5 text-white" />
                        Silence
                      </>
                    ) : (
                      <>
                        <Volume2 className="size-3.5 text-amber-700" />
                        Trigger
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-8 gap-1.5 border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                    title="Cannot trigger disabled siren"
                  >
                    <Volume2 className="size-3.5 text-slate-400" />
                    Trigger
                  </Button>
                )}

                {/* 4. Disable / Reactivate (Gray / Black) */}
                {row.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSirenToDisable(row)}
                    disabled={deactivateMutation.isPending}
                    className="h-8 gap-1.5 border-neutral-300 bg-neutral-100 px-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200 hover:text-neutral-950 cursor-pointer"
                    title="Disable Siren"
                  >
                    <PowerOff className="size-3.5 text-neutral-600" />
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reactivateMutation.mutate(row.id)}
                    disabled={reactivateMutation.isPending}
                    className="h-8 gap-1.5 border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    title="Reactivate Siren"
                  >
                    <Power className="size-3.5 text-emerald-600" />
                    Reactivate
                  </Button>
                )}

                {/* 5. Edit (Modal) */}
                <EditSirenDialog
                  siren={row}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 border-amber-300/80 bg-amber-50 px-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      title="Edit Siren"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  }
                />

                {/* 6. Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSirenToDelete(row)}
                  disabled={deleteMutation.isPending}
                  className="h-8 gap-1.5 border-rose-200 bg-rose-50/60 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  title="Delete Siren Station (Soft Delete)"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            )}
          />
        </div>

        {/* Column 2: Past Latest Events (History Timeline) */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shadow-2xs">
                <History className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  Past Latest Events
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Live audit trail of siren triggers, drills, and station status changes
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200 shrink-0">
              {audits.length} Events
            </span>
          </div>

          {/* Scrollable Audit Feed */}
          <div className="flex max-h-[560px] flex-col gap-2.5 overflow-y-auto pr-1.5 custom-scrollbar">
            {isAuditsLoading ? (
              <div className="flex flex-col gap-2 py-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : audits.length > 0 ? (
              audits.map((log) => {
                const isDrill =
                  log.classification === "Drill" || log.action.includes("drill");
                const isSilence = log.action.includes("silence");
                const isCreate = log.action.includes("create");
                const isDeactivate = log.action.includes("deactivate");
                const isReactivate = log.action.includes("reactivate");
                const isDelete = log.action.includes("delete");

                const stationName =
                  (typeof log.changes?.name === "string" && log.changes.name) ||
                  allSirens.find((s) => s.id === log.entity_id)?.name ||
                  (isDrill ? "All Active Siren Stations" : "Siren Station");

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-xs transition-all shadow-2xs",
                      isDrill
                        ? "border-sky-200 bg-sky-50/40"
                        : isSilence
                          ? "border-slate-200 bg-slate-50/60"
                          : isCreate || isReactivate
                            ? "border-emerald-200 bg-emerald-50/40"
                            : isDeactivate
                              ? "border-neutral-200 bg-neutral-50/70"
                              : isDelete
                                ? "border-rose-200 bg-rose-50/40"
                                : "border-rose-200 bg-rose-50/60",
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-7.5 shrink-0 place-items-center rounded-lg font-bold shadow-2xs mt-0.5",
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
                        <Radio className="size-3.5" />
                      ) : isSilence ? (
                        <VolumeX className="size-3.5" />
                      ) : isCreate || isReactivate ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : isDeactivate ? (
                        <PowerOff className="size-3.5" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-900 truncate text-xs">
                          {isDrill
                            ? isSilence
                              ? "Drill Concluded & Silenced"
                              : "Drill Simulation Sounding"
                            : isSilence
                              ? "Operational Alarm Silenced"
                              : isCreate
                                ? "Station Deployed & Armed"
                                : isDeactivate
                                  ? "Station Unit Disabled"
                                  : isReactivate
                                    ? "Station Unit Reactivated"
                                    : isDelete
                                      ? "Station Soft-Deleted"
                                      : "Emergency Alarm Activated"}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                            isDrill
                              ? "bg-sky-100 text-sky-800 border border-sky-300"
                              : isSilence
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : isCreate || isReactivate
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isDeactivate
                                    ? "bg-neutral-100 text-neutral-800 border border-neutral-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300",
                          )}
                        >
                          {log.classification || (isDrill ? "Drill" : "Operational")}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                        <span className="font-medium truncate text-slate-700">
                          {stationName}
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] text-slate-400">
                          {new Date(log.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center text-slate-400">
                <History className="size-8 stroke-1 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">
                  No Past Events Recorded Yet
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Trigger a siren test chime, run a drill simulation, or deploy stations to view real-time audit records here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disable Siren Confirmation Modal */}
      <AlertDialog
        open={!!sirenToDisable}
        onOpenChange={(open) => !open && setSirenToDisable(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200">
                <PowerOff className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Disable Siren Station?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-slate-500 truncate mt-0.5">
                  {sirenToDisable?.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Placing this siren station into standby disabled state will temporarily deactivate its acoustic broadcasting and disarm emergency simulation triggers until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSirenToDisable(null)}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (sirenToDisable) {
                  deactivateMutation.mutate(sirenToDisable.id, {
                    onSettled: () => setSirenToDisable(null),
                  });
                }
              }}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs cursor-pointer"
            >
              {deactivateMutation.isPending ? "Disabling…" : "Confirm Disable"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Siren Confirmation Modal */}
      <AlertDialog
        open={!!sirenToDelete}
        onOpenChange={(open) => !open && setSirenToDelete(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Delete Siren Station?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-rose-700 truncate mt-0.5">
                  {sirenToDelete?.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Are you sure you want to delete this siren station? This will remove the unit from active GIS map views and operational monitoring while preserving all historical audit logs and simulation records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSirenToDelete(null)}
              disabled={deleteMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (sirenToDelete) {
                  deleteMutation.mutate(sirenToDelete.id, {
                    onSettled: () => setSirenToDelete(null),
                  });
                }
              }}
              disabled={deleteMutation.isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
            >
              {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
