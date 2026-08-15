"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Crosshair,
  Eye,
  Filter,
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

  const [countdown, setCountdown] = React.useState(60);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const { data: sirens, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin", "sirens"],
    queryFn: () => api.get<Siren[]>("/admin/sirens").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setCountdown(60);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
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

  /* Map Items */
  const mapItems = React.useMemo(() => {
    return filteredSirens.map((siren) => {
      const isSounding = siren.is_active && siren.status === "sounding";
      const isTesting = siren.is_active && siren.status === "testing";

      const tone: "emerald" | "amber" | "rose" | "slate" = !siren.is_active
        ? "slate"
        : isSounding
          ? "rose"
          : isTesting
            ? "amber"
            : "emerald";

      const statusLabel = !siren.is_active
        ? "Inactive Siren"
        : isSounding
          ? "Sounding (Simulated)"
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
        return (
          <div className="flex items-start gap-3 min-w-56 max-w-sm">
            <div
              className={cn(
                "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg font-bold shadow-2xs overflow-hidden transition-all",
                isSounding
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-emerald-100 text-emerald-800",
              )}
            >
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/sirens/${row.id}`}
                className="font-bold text-neutral-900 hover:text-emerald-700 hover:underline transition-colors truncate block"
              >
                {row.name}
              </Link>
              <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                500m Acoustic Coverage Radius • Omnidirectional
              </p>
              {areaName(row) !== "—" ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                  <MapPin className="size-2.5" />
                  {areaName(row)}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: "area",
      header: "Assigned Area",
      render: (row) => (
        <span className="text-xs font-semibold text-neutral-800">
          {areaName(row)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Audio State",
      render: (row) => {
        const isSounding = row.is_active && row.status === "sounding";
        const isTesting = row.is_active && row.status === "testing";
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs",
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
                <Volume2 className="size-3 text-rose-600 animate-bounce" />
                Sounding (Alarm)
              </>
            ) : isTesting ? (
              <>
                <Activity className="size-3 text-amber-700" />
                Testing Drill
              </>
            ) : (
              <>
                <VolumeX className="size-3 text-emerald-600" />
                Idle Standby
              </>
            )}
          </span>
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
        action={
          <div className="flex items-center gap-2.5">
            {/* Auto refresh badge */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 py-1 pr-1.5 pl-3 text-xs font-semibold text-emerald-900 shadow-xs">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>
                Live Feed{" "}
                <span className="font-bold text-emerald-950 tabular-nums">
                  ({countdown}s)
                </span>
              </span>
              <button
                type="button"
                onClick={handleManualRefresh}
                title="Refresh now"
                disabled={isManualRefreshing || isFetching}
                className="flex size-5 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-200/80 hover:text-emerald-950 transition-colors cursor-pointer"
              >
                <RotateCcw
                  className={cn(
                    "size-3",
                    (isFetching || isManualRefreshing) && "animate-spin",
                  )}
                />
              </button>
            </div>

            <DeploySirenDialog />
          </div>
        }
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
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-100">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              Acoustic Overlays
            </p>
            <div className="flex flex-col gap-2.5">
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
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-100">
                <Radio
                  className={cn(
                    "size-3.5",
                    stats.soundingCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400",
                  )}
                />
                Drill Simulation
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xs",
                  stats.soundingCount > 0
                    ? "bg-rose-500/20 text-rose-200 border border-rose-500/40 animate-pulse"
                    : "bg-slate-800 text-slate-200 border border-slate-700",
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

            <p className="text-xs text-slate-300 leading-relaxed">
              Conducts a barangay-wide auditory drill across all {stats.activeCount} active stations. Audit records are logged as <strong>Drill</strong>.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {stats.soundingCount > 0 ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={silenceAllDrillMutation.isPending}
                  onClick={() => silenceAllDrillMutation.mutate()}
                  className="h-10 justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md cursor-pointer animate-pulse"
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
                  className="h-10 justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700"
                >
                  <Radio className="size-3.5" />
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
                  toast.info("Playing 3-second local test chime");
                }}
                className="h-8 justify-center gap-1.5 border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <Activity className="size-3.5 text-amber-400" />
                Play 3s Diagnostic Chime
              </Button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between h-6">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-100">
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
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="size-2.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-slate-700 bg-slate-800 text-xs font-semibold text-white shadow-xs focus:ring-emerald-500">
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
                <label className="text-[11px] font-semibold text-slate-300">
                  Assigned Area
                </label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-slate-700 bg-slate-800 text-xs font-semibold text-white shadow-xs focus:ring-emerald-500">
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

      {/* ResourceTable */}
      <ResourceTable
        columns={columns}
        data={filteredSirens}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        getRowKey={(row) => row.id}
        selectedRowKey={selectedId}
        onRowSelect={(row) => setSelectedId(row.id)}
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
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(row.id)}
              aria-label={`Locate ${row.name}`}
              className="h-8 px-2 text-xs"
              title="Locate on Map"
            >
              <Crosshair aria-hidden className="size-3.5 text-slate-700" />
            </Button>

            {row.is_active ? (
              <>
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
                    "h-8 gap-1 text-xs font-bold shadow-2xs",
                    row.status === "sounding"
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "border-emerald-600/60 text-emerald-800 hover:bg-emerald-50",
                  )}
                >
                  {row.status === "sounding" ? (
                    <>
                      <VolumeX className="size-3.5" />
                      Silence
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5" />
                      Trigger
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Disable siren station "${row.name}"?\n\nThe station will be set to an inactive standby state.`,
                      )
                    ) {
                      deactivateMutation.mutate(row.id);
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  className="h-8 gap-1 border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-800 cursor-pointer"
                  title="Disable Siren"
                >
                  <PowerOff className="size-3 text-slate-500" />
                  <span className="hidden xl:inline">Disable</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reactivateMutation.mutate(row.id)}
                disabled={reactivateMutation.isPending}
                className="h-8 gap-1 border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                title="Reactivate Siren"
              >
                <Power className="size-3.5 text-emerald-600" />
                Reactivate
              </Button>
            )}

            <Link href={`/admin/sirens/${row.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:text-emerald-700"
                title="View Siren Telemetry & History"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </Link>

            <Link href={`/admin/sirens/${row.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                title="Edit Siren"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete siren station "${row.name}"?\n\nThis will remove the unit from active GIS maps while safely preserving all historical audit logs and event records in the backend.`,
                  )
                ) {
                  deleteMutation.mutate(row.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="h-8 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
              title="Delete Siren Station (Soft Delete)"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
