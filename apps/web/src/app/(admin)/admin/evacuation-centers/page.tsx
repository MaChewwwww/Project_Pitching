"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Crosshair,
  Eye,
  Filter,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Users2,
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
import { EvacCheckinManagerDialog } from "@/components/features/admin/evac-checkin-manager-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { cn } from "@/lib/utils";

interface EvacCenter {
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
    is_active?: boolean;
    address?: string | null;
  };
  is_active?: boolean;
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

export default function AdminEvacuationCentersPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showHazard, setShowHazard] = React.useState(true);
  const [showAreas, setShowAreas] = React.useState(true);

  /* Map and Table Filter States */
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [areaFilter, setAreaFilter] = React.useState("all");
  const [occupancyTier, setOccupancyTier] = React.useState("all");

  const [countdown, setCountdown] = React.useState(60);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api.get<EvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
    refetchInterval: 60_000,
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



  const reactivateMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/evacuation-centers/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Evacuation center reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not reactivate center");
    },
  });

  const toggleOpenMutation = useMutation({
    mutationFn: ({ id, is_open }: { id: string; is_open: boolean }) =>
      api.patch(`/admin/evacuation-centers/${id}`, { is_open }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.is_open
          ? "Evacuation center marked OPEN"
          : "Evacuation center marked CLOSED",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update center status");
    },
  });

  const allCenters = React.useMemo(() => data ?? [], [data]);

  /* Stats calculation */
  const stats = React.useMemo(() => {
    const total = allCenters.length;
    const active = allCenters.filter((c) => c.is_active !== false);
    const open = active.filter((c) => c.is_open);
    const totalCapacity = active.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
    const totalOccupancy = active.reduce((acc, c) => acc + (c.occupancy ?? 0), 0);
    const atCapacity = active.filter(
      (c) => c.capacity && (c.occupancy ?? 0) >= c.capacity,
    ).length;
    const nearCapacity = active.filter((c) => {
      if (!c.capacity || (c.occupancy ?? 0) >= c.capacity) return false;
      return (c.occupancy ?? 0) / c.capacity >= 0.8;
    }).length;

    return {
      total,
      openCount: open.length,
      closedCount: active.length - open.length,
      totalCapacity,
      totalOccupancy,
      atCapacity,
      nearCapacity,
      pctOccupied:
        totalCapacity > 0
          ? Math.round((totalOccupancy / totalCapacity) * 100)
          : 0,
    };
  }, [allCenters]);

  /* Top 5 Metrics */
  const metricCards: AssetMetricCardProps[] = [
    {
      icon: Building2,
      label: "Operational Centers",
      value: stats.openCount,
      unit: `/ ${stats.total} total`,
      sub: stats.openCount > 0 ? "Ready to accept evacuees" : "No open centers",
      tone: stats.openCount > 0 ? "emerald" : "amber",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          {stats.openCount} Open
        </span>
      ),
    },
    {
      icon: Users2,
      label: "Gross Capacity",
      value: stats.totalCapacity.toLocaleString(),
      unit: "slots",
      sub: "Across all verified facilities",
      tone: "neutral",
    },
    {
      icon: Users,
      label: "Current Occupancy",
      value: stats.totalOccupancy.toLocaleString(),
      unit: `(${stats.pctOccupied}%)`,
      sub: `${stats.totalCapacity - stats.totalOccupancy} slots available`,
      tone: stats.pctOccupied > 80 ? "rose" : "sky",
      badge: (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider border",
            stats.pctOccupied > 80
              ? "bg-rose-100 text-rose-800 border-rose-300"
              : "bg-sky-100 text-sky-800 border-sky-300",
          )}
        >
          {stats.pctOccupied}% Loaded
        </span>
      ),
    },
    {
      icon: ShieldAlert,
      label: "Congestion Alert",
      value: stats.atCapacity + stats.nearCapacity,
      unit: "centers",
      sub:
        stats.atCapacity > 0
          ? `${stats.atCapacity} at max, ${stats.nearCapacity} near capacity`
          : stats.nearCapacity > 0
            ? `${stats.nearCapacity} centers near capacity`
            : "No capacity bottlenecks",
      tone:
        stats.atCapacity > 0
          ? "rose"
          : stats.nearCapacity > 0
            ? "amber"
            : "neutral",
      badge:
        stats.atCapacity > 0 ? (
          <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs animate-pulse">
            Full
          </span>
        ) : null,
    },
    {
      icon: MapPin,
      label: "Spatial Pinning",
      value: "100%",
      unit: "Mapped",
      sub: "Geocoded to Barangay San Jose",
      tone: "emerald",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          GIS Active
        </span>
      ),
    },
  ];

  /* Filtered Items for Table and Map */
  const filteredCenters = React.useMemo(() => {
    return allCenters.filter((center) => {
      if (statusFilter === "open" && !center.is_open) return false;
      if (statusFilter === "closed" && center.is_open) return false;
      if (statusFilter === "inactive" && center.is_active !== false) return false;

      if (areaFilter !== "all") {
        if (center.facility.area_name !== areaFilter) return false;
      }

      if (occupancyTier !== "all") {
        const ratio = center.capacity
          ? (center.occupancy ?? 0) / center.capacity
          : 0;
        if (occupancyTier === "full" && ratio < 1) return false;
        if (occupancyTier === "near" && (ratio < 0.8 || ratio >= 1)) return false;
        if (occupancyTier === "available" && ratio >= 0.8) return false;
      }

      return true;
    });
  }, [allCenters, statusFilter, areaFilter, occupancyTier]);

  /* Map Items */
  const mapItems = React.useMemo(() => {
    return filteredCenters.map((center) => {
      const inactive =
        center.is_active === false || center.facility.is_active === false;
      const ratio = center.capacity
        ? (center.occupancy ?? 0) / center.capacity
        : 0;

      const tone: "emerald" | "amber" | "rose" | "slate" = inactive
        ? "slate"
        : !center.is_open
          ? "slate"
          : center.capacity && ratio >= 1
            ? "rose"
            : ratio >= 0.8
              ? "amber"
              : "emerald";

      const statusLabel = inactive
        ? "Inactive Center"
        : !center.is_open
          ? "Closed"
          : center.capacity && ratio >= 1
            ? "At Capacity (100%)"
            : ratio >= 0.8
              ? `Near Capacity (${Math.round(ratio * 100)}%)`
              : `Open (${center.occupancy ?? 0}/${center.capacity ?? "—"})`;

      return {
        id: center.id,
        name: center.facility.name,
        category: "evacuation_center" as const,
        location: center.facility.location,
        area_name: center.facility.area_name,
        statusLabel,
        tone,
        occupancy: center.occupancy,
        capacity: center.capacity,
        subDetail: center.notes || center.facility.address || undefined,
        detailUrl: `/admin/evacuation-centers/${center.id}`,
      };
    });
  }, [filteredCenters]);

  /* ResourceTable Columns */
  const columns: ResourceColumn<EvacCenter>[] = [
    {
      key: "facility",
      header: "Center & Facility",
      render: (row) => (
        <div className="flex items-start gap-3 min-w-56 max-w-sm">
          <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold overflow-hidden shadow-2xs">
            <Building2 className="size-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/evacuation-centers/${row.id}`}
              className="font-bold text-neutral-900 hover:text-emerald-700 hover:underline transition-colors truncate block"
            >
              {row.facility.name}
            </Link>
            <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
              {row.facility.address || row.notes || "No additional address notes"}
            </p>
            {row.facility.area_name ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                <MapPin className="size-2.5" />
                {row.facility.area_name}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "occupancy",
      header: "Occupancy & Capacity",
      render: (row) => {
        const occ = row.occupancy ?? 0;
        const cap = row.capacity;
        const pct = cap ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
        const isFull = cap ? occ >= cap : false;
        const isNear = cap ? occ / cap >= 0.8 && occ < cap : false;

        return (
          <div className="min-w-44 max-w-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tabular-nums text-neutral-900">
                {occ}{" "}
                <span className="font-normal text-neutral-500">
                  / {cap ?? "—"}
                </span>
              </span>
              {cap ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10.5px] font-bold",
                    isFull
                      ? "bg-rose-100 text-rose-800"
                      : isNear
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {pct}%
                </span>
              ) : null}
            </div>
            {cap ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isFull
                      ? "bg-rose-600"
                      : isNear
                        ? "bg-amber-500"
                        : "bg-emerald-600",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact & Personnel",
      render: (row) => (
        <div className="min-w-36 text-xs text-neutral-700">
          <p className="font-semibold text-neutral-900">
            {row.contact_person || "Barangay Admin"}
          </p>
          <p className="mt-0.5 text-neutral-500 font-mono text-[11px]">
            {row.contact_number || "Emergency Desk"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Operational State",
      render: (row) => {
        const isInactive = row.is_active === false;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs",
              isInactive
                ? "border-slate-200 bg-slate-100 text-slate-600"
                : row.is_open
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            {isInactive ? (
              "Inactive"
            ) : row.is_open ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-600" />
                Open
              </>
            ) : (
              "Closed"
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Evacuation Centers"
        description="Monitor real-time shelter capacity, live family check-in rosters, flood hazard exposure, and center activations."
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

            <Link href="/admin/evacuation-centers/new">
              <Button
                variant="primary"
                className="h-9 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="size-3.5" />
                Register Center
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top 5 Metrics Strip */}
      <AssetMetricStrip items={metricCards} />

      {/* Two-Column Interactive Workspace: Map Canvas + Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Column 1: Leaflet Map */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="relative h-[480px] sm:h-[580px] lg:h-[620px] w-full overflow-hidden">
            <AdminAssetWorkspaceMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
              showAreas={showAreas}
              showEvacLegend={true}
              showSirenLegend={false}
            />
          </div>
        </div>

        {/* Column 2: Filter and Capacity Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Map Layers */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              GIS Overlays
            </p>
            <div className="flex flex-col gap-2">
              <LayerCheckbox
                checked={showHazard}
                onChange={setShowHazard}
                label="5-Year Flood Hazard"
              />
              <LayerCheckbox
                checked={showAreas}
                onChange={setShowAreas}
                label="Barangay Area Boundaries"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between h-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Filter className="size-3.5 text-emerald-400" aria-hidden />
                Filter Workspace
              </p>
              {(statusFilter !== "all" ||
                areaFilter !== "all" ||
                occupancyTier !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setAreaFilter("all");
                    setOccupancyTier("all");
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
                    <SelectItem value="open">Open Only</SelectItem>
                    <SelectItem value="closed">Closed Only</SelectItem>
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

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-white">
                  Occupancy Tier
                </label>
                <Select value={occupancyTier} onValueChange={setOccupancyTier}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="available">Available (&lt;80%)</SelectItem>
                    <SelectItem value="near">Near Capacity (80-99%)</SelectItem>
                    <SelectItem value="full">At Capacity (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Capacity Diagnostic Panel */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-3.5 text-white shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-white">
                Evacuation Readiness
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-emerald-700/80">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {stats.openCount} Open
              </span>
            </div>
            <p className="mt-1.5 text-xs text-white/90 leading-relaxed">
              Total sheltered headcount:{" "}
              <strong className="text-white font-bold">
                {stats.totalOccupancy.toLocaleString()}
              </strong>{" "}
              of{" "}
              <strong className="text-white font-bold">
                {stats.totalCapacity.toLocaleString()}
              </strong>{" "}
              capacity.
            </p>

            <div className="mt-2.5 flex flex-col gap-1 border-t border-emerald-900/60 pt-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                <span>Barangay Load</span>
                <span className="tabular-nums font-bold text-white">
                  {stats.pctOccupied}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950 border border-emerald-900/80">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    stats.pctOccupied > 80 ? "bg-rose-400" : "bg-emerald-400",
                  )}
                  style={{ width: `${stats.pctOccupied}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ResourceTable */}
      <ResourceTable
        columns={columns}
        data={filteredCenters}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        getRowKey={(row) => row.id}
        selectedRowKey={selectedId}
        onRowSelect={(row) => setSelectedId(row.id)}
        searchPlaceholder="Search center name, address, sitio area, contact…"
        filterSlots={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="inline-flex h-9 w-fit min-w-[125px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-44">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open Only</SelectItem>
                <SelectItem value="closed">Closed Only</SelectItem>
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
        toolbarAction={
          <Link href="/admin/evacuation-centers/new">
            <Button
              variant="primary"
              className="h-9 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="size-3.5" />
              Register Center
            </Button>
          </Link>
        }
        rowActions={(row) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(row.id)}
              aria-label={`Locate ${row.facility.name}`}
              className="h-8 px-2 text-xs"
              title="Locate on Map"
            >
              <Crosshair aria-hidden className="size-3.5 text-slate-700" />
            </Button>

            <EvacCheckinManagerDialog
              centerId={row.id}
              centerName={row.facility.name}
              capacity={row.capacity}
            />

            <Link href={`/admin/evacuation-centers/${row.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:text-emerald-700"
                title="View Comprehensive Details"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </Link>

            <Link href={`/admin/evacuation-centers/${row.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                title="Edit Center"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>

            {row.is_active !== false ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toggleOpenMutation.mutate({
                    id: row.id,
                    is_open: !row.is_open,
                  })
                }
                disabled={toggleOpenMutation.isPending}
                className={cn(
                  "h-8 text-xs font-bold",
                  row.is_open
                    ? "text-amber-700 hover:bg-amber-50"
                    : "text-emerald-700 hover:bg-emerald-50",
                )}
              >
                {row.is_open ? "Close" : "Open"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reactivateMutation.mutate(row.id)}
                disabled={reactivateMutation.isPending}
                className="h-8 text-xs text-emerald-700 hover:bg-emerald-50"
              >
                Reactivate
              </Button>
            )}
          </div>
        )}
      />
    </div>
  );
}
