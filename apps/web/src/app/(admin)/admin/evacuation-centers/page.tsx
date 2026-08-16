"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Layers,
  Power,
  PowerOff,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Users,
  Users2,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
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
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  AssetMetricStrip,
  type AssetMetricCardProps,
} from "@/components/features/admin/asset-metric-strip";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { CreateEvacuationCenterDialog } from "@/components/features/admin/create-evacuation-center-dialog";
import { EditEvacuationCenterDialog, type EvacCenterEditable } from "@/components/features/admin/edit-evacuation-center-dialog";
import { EvacuationCenterDetailsDialog } from "@/components/features/admin/evacuation-center-details-dialog";
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api.get<EvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });

  const [centerToDelete, setCenterToDelete] = React.useState<EvacCenter | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update center status");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (centerId: string) =>
      api.delete(`/admin/evacuation-centers/${centerId}`),
    onSuccess: () => {
      toast.success("Evacuation center deactivated and archived");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
    },
    onError: (err) => {
      toast.error(
        toDisplayError(err).detail || "Failed to deactivate evacuation center",
      );
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (centerId: string) =>
      api.post(`/admin/evacuation-centers/${centerId}/reactivate`),
    onSuccess: () => {
      toast.success("Evacuation center reactivated successfully");
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

  const allCenters = React.useMemo(() => data ?? [], [data]);

  /* Stats calculation */
  const stats = React.useMemo(() => {
    const total = allCenters.length;
    const active = allCenters.filter((c) => c.is_active !== false);
    const open = active.filter((c) => c.is_open);
    const totalCapacity = active.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
    const totalOccupancy = active.reduce((acc, c) => acc + (c.occupancy ?? 0), 0);
    const remainingSlots = Math.max(0, totalCapacity - totalOccupancy);
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
      remainingSlots,
      atCapacity,
      nearCapacity,
      pctOccupied:
        totalCapacity > 0
          ? Math.round((totalOccupancy / totalCapacity) * 100)
          : 0,
    };
  }, [allCenters]);

  /* Top 5 Metrics Strip */
  const metricCards: AssetMetricCardProps[] = [
    {
      icon: Building2,
      label: "Operational Shelters",
      value: stats.openCount,
      unit: `/ ${stats.total} total`,
      sub: stats.openCount > 0 ? "Ready to accept evacuees" : "No open shelters",
      tone: stats.openCount > 0 ? "emerald" : "amber",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          Ready
        </span>
      ),
    },
    {
      icon: Users2,
      label: "Gross Capacity",
      value: stats.totalCapacity.toLocaleString(),
      unit: "slots",
      sub: "Across all designated shelters",
      tone: "neutral",
    },
    {
      icon: Users,
      label: "Active Evacuees",
      value: stats.totalOccupancy.toLocaleString(),
      unit: "persons",
      sub: `${stats.atCapacity} sites at capacity`,
      tone: stats.totalOccupancy > 0 ? "rose" : "neutral",
    },
    {
      icon: CheckCircle2,
      label: "Available Spaces",
      value: stats.remainingSlots.toLocaleString(),
      unit: "slots",
      sub: `${stats.openCount} open shelter sites`,
      tone: "emerald",
    },
    {
      icon: BedDouble,
      label: "Overall Occupancy",
      value: `${stats.pctOccupied}%`,
      unit: "load",
      sub: `${stats.totalOccupancy} / ${stats.totalCapacity} capacity`,
      tone: stats.pctOccupied >= 80 ? "rose" : "sky",
    },
  ];

  const [deselectedCenterIds, setDeselectedCenterIds] = React.useState<Set<string>>(new Set());

  const toggleCenter = (id: string) => {
    setDeselectedCenterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllCenters = () => {
    if (deselectedCenterIds.size === 0) {
      setDeselectedCenterIds(new Set(allCenters.map((c) => c.id)));
    } else {
      setDeselectedCenterIds(new Set());
    }
  };

  /* Filtered Centers */
  const filteredCenters = React.useMemo(() => {
    return allCenters.filter((center) => {
      // 0. Checklist Filter
      if (deselectedCenterIds.has(center.id)) {
        return false;
      }

      // 1. Status Filter
      if (statusFilter === "open" && !center.is_open) return false;
      if (statusFilter === "closed" && center.is_open) return false;

      // 2. Area Filter
      if (areaFilter !== "all") {
        const itemArea = center.facility.area_name;
        if (itemArea !== areaFilter) return false;
      }

      // 3. Occupancy Tier Filter
      if (occupancyTier !== "all") {
        const cap = center.capacity ?? 0;
        const occ = center.occupancy ?? 0;
        if (occupancyTier === "full" && (!cap || occ < cap)) return false;
        if (occupancyTier === "near" && (!cap || occ / cap < 0.8 || occ >= cap)) return false;
        if (occupancyTier === "available" && cap > 0 && occ / cap >= 0.8) return false;
      }

      return true;
    });
  }, [allCenters, deselectedCenterIds, statusFilter, areaFilter, occupancyTier]);

  /* Map Items */
  const mapItems = React.useMemo(() => {
    return filteredCenters.map((center) => {
      const isFull = center.capacity && (center.occupancy ?? 0) >= center.capacity;
      const isNear =
        center.capacity &&
        (center.occupancy ?? 0) / center.capacity >= 0.8 &&
        !isFull;

      const tone = !center.is_open
        ? "slate"
        : isFull
          ? "rose"
          : isNear
            ? "amber"
            : "emerald";

      return {
        id: center.id,
        name: center.facility.name,
        category: "evacuation_center" as const,
        location: center.facility.location,
        area_name: center.facility.area_name,
        statusLabel: center.is_open
          ? isFull
            ? "Full (At Capacity)"
            : isNear
              ? "Near Capacity"
              : "Open for Intake"
          : "Closed (Standby)",
        tone: tone as "emerald" | "amber" | "rose" | "slate" | "sky",
        occupancy: center.occupancy,
        capacity: center.capacity,
      };
    });
  }, [filteredCenters]);

  /* ResourceTable Columns */
  const columns: ResourceColumn<EvacCenter>[] = [
    {
      key: "name",
      header: "Shelter & Facility Name",
      render: (row: EvacCenter) => (
        <div className="flex flex-col gap-0.5 py-0.5">
          <Link
            href={`/admin/evacuation-centers/${row.id}`}
            className="font-bold text-slate-900 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <BedDouble className="size-4 text-emerald-700 shrink-0" />
            <span>{row.facility.name}</span>
          </Link>
          <span className="text-[11px] text-slate-500">
            {row.facility.address || "San Jose Municipality, Rodriguez (Montalban), Rizal"}
          </span>
        </div>
      ),
    },
    {
      key: "area",
      header: "Assigned Area",
      render: (row: EvacCenter) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
          {row.facility.area_name || "San Jose"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: EvacCenter) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs",
            row.is_open
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-slate-100 text-slate-600 border border-slate-300",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              row.is_open ? "bg-emerald-600 animate-pulse" : "bg-slate-400",
            )}
          />
          {row.is_open ? "Open" : "Closed"}
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Live Occupancy & Load",
      render: (row: EvacCenter) => {
        const occ = row.occupancy ?? 0;
        const cap = row.capacity ?? 0;
        const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
        const isFull = cap > 0 && occ >= cap;
        const isNear = cap > 0 && occ / cap >= 0.8 && !isFull;

        return (
          <div className="flex flex-col gap-1 min-w-[140px] py-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="font-mono">
                {occ} / {cap > 0 ? cap : "—"}
              </span>
              <span
                className={cn(
                  "text-[11px]",
                  isFull ? "text-rose-600 font-black" : isNear ? "text-amber-600 font-bold" : "text-emerald-700 font-semibold",
                )}
              >
                {pct}% Full
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isFull ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Officer & Hotline",
      render: (row: EvacCenter) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-slate-800">
            {row.contact_person || "Command Center"}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {row.contact_number || "Barangay San Jose Hotline"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Admin Page Header with Designate Dialog */}
      <AdminPageHeader
        title="Evacuation Centers Management"
        description="Monitor disaster shelter capacities, live evacuee headcounts, operational intake availability, and check-in stations."
        action={<CreateEvacuationCenterDialog />}
      />

      {/* 5 Top Operational Metric Cards */}
      <AssetMetricStrip items={metricCards} />

      {/* Main 2-Column GIS Workspace & Control Sidebar (Seamless Equal-Height on Desktop) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5 lg:h-[620px]">
        {/* Column 1: Leaflet Interactive Map View */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl h-[480px] sm:h-[580px] lg:h-full">
          <div className="relative h-full w-full overflow-hidden">
            <AdminAssetWorkspaceMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
              showAreas={showAreas}
              showEvacLegend={true}
            />
          </div>
        </div>

        {/* Column 2: Filter and Capacity Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0 lg:h-full">
          {/* Card 1: Map Overlays */}
          <div className="w-full shrink-0 rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              Map Overlays
            </p>
            <div className="flex flex-col gap-2">
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

          {/* Card 2: Shelter Capacity & Filter Checklist with Custom Green Scrollbar */}
          <div className="w-full flex-1 min-h-0 rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md flex flex-col">
            <div className="mb-2.5 flex items-center justify-between shrink-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Users className="size-3.5 text-emerald-400" aria-hidden />
                Capacity & Shelter Filters
              </p>
              <button
                type="button"
                onClick={toggleAllCenters}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
              >
                {deselectedCenterIds.size === 0
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {/* Scrollable Checklist with Custom Green Scrollbar */}
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1.5 pt-1 [scrollbar-width:thin] [scrollbar-color:#059669_#022c22] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-emerald-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-600/90 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-400">
              {allCenters.map((center) => {
                const isSelected = !deselectedCenterIds.has(center.id);
                const occ = center.occupancy ?? 0;
                const cap = center.capacity ?? 0;
                const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
                const isFull = cap > 0 && occ >= cap;
                const isNear = cap > 0 && occ / cap >= 0.8 && !isFull;

                return (
                  <button
                    key={center.id}
                    type="button"
                    onClick={() => toggleCenter(center.id)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg p-2.5 text-xs transition-all cursor-pointer border text-left shrink-0",
                      isSelected
                        ? "border-emerald-700/60 bg-white/10 text-white shadow-xs"
                        : "border-transparent text-emerald-200/50 hover:bg-white/5 hover:text-emerald-100",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="size-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 accent-emerald-500 cursor-pointer pointer-events-none shrink-0"
                        />
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            !center.is_open
                              ? "bg-slate-400"
                              : isFull
                                ? "bg-rose-500"
                                : isNear
                                  ? "bg-amber-400"
                                  : "bg-emerald-400",
                          )}
                        />
                        <span className="truncate font-semibold text-[11.5px] text-white">
                          {center.facility.name}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-950/80 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-300 border border-emerald-800/80 shrink-0">
                        {center.facility.area_name || "San Jose"}
                      </span>
                    </div>

                    {/* Capacity Bar & Ratio */}
                    <div className="flex flex-col gap-1 pl-5.5">
                      <div className="flex items-center justify-between text-[10px] text-emerald-200/80 font-mono">
                        <span>
                          {occ} / {cap > 0 ? cap : "—"} slots
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            isFull
                              ? "text-rose-400 font-black"
                              : isNear
                                ? "text-amber-300"
                                : "text-emerald-300",
                          )}
                        >
                          {pct}% Load
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-emerald-950/90 border border-emerald-900/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            !center.is_open
                              ? "bg-slate-500"
                              : isFull
                                ? "bg-rose-500"
                                : isNear
                                  ? "bg-amber-400"
                                  : "bg-emerald-400",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Overall Capacity Load Meter */}
            <div className="mt-3 shrink-0 flex flex-col gap-1.5 border-t border-emerald-900/80 pt-3">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-300">
                <span>Barangay Evac Load</span>
                <span className="tabular-nums font-mono text-white">
                  {stats.totalOccupancy} / {stats.totalCapacity} ({stats.pctOccupied}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/90 border border-emerald-900/60">
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

      {/* Evacuation Centers Management Table (Full Width) */}
      <div className="flex flex-col gap-3 w-full">
        <ResourceTable
          columns={columns}
          data={filteredCenters}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          getRowKey={(row) => row.id}
          selectedRowKey={selectedId}
          searchPlaceholder="Search shelter name, area, officer, address…"
          filterSlots={
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                  <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-44">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open Only</SelectItem>
                  <SelectItem value="closed">Closed Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Area Filter */}
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

              {/* Occupancy Tier Filter */}
              <Select value={occupancyTier} onValueChange={setOccupancyTier}>
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[140px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                  <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="All Occupancy" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-48">
                  <SelectItem value="all">All Occupancy</SelectItem>
                  <SelectItem value="available">Available (&lt;80%)</SelectItem>
                  <SelectItem value="near">Near Capacity (80-99%)</SelectItem>
                  <SelectItem value="full">At Capacity (100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          toolbarAction={<CreateEvacuationCenterDialog />}
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
                aria-label={`Locate ${row.facility.name}`}
                className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
                title="Locate on Map"
              >
                <Crosshair aria-hidden className="size-3.5 text-slate-700" />
              </Button>

              {/* 2. Details Modal */}
              <EvacuationCenterDetailsDialog
                center={row as EvacCenterEditable}
                onLocateOnMap={() => setSelectedId(row.id)}
              />

              {/* 3. Check-In Station Modal (UserCheck icon) */}
              <EvacCheckinManagerDialog
                centerId={row.id}
                centerName={row.facility.name}
                capacity={row.capacity}
              />

              {/* 4. Edit Modal (Pencil icon) */}
              <EditEvacuationCenterDialog
                center={row as EvacCenterEditable}
              />

              {/* 5. Toggle Open/Close State (Power icon) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toggleOpenMutation.mutate({
                    id: row.id,
                    is_open: !row.is_open,
                  })
                }
                className={cn(
                  "h-8 w-8 p-0 border cursor-pointer shrink-0",
                  row.is_open
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                )}
                title={row.is_open ? "Close Shelter" : "Open Shelter for Intake"}
                aria-label={row.is_open ? "Close Shelter" : "Open Shelter"}
              >
                {row.is_open ? (
                  <PowerOff className="size-3.5" />
                ) : (
                  <Power className="size-3.5" />
                )}
              </Button>

              {/* 6. Soft Delete / Deactivate (Trash2) or Reactivate */}
              {row.is_active !== false ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCenterToDelete(row)}
                  disabled={deactivateMutation.isPending}
                  className="h-8 w-8 p-0 border-rose-300/80 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 cursor-pointer shrink-0"
                  title="Deactivate / Delete Center"
                  aria-label={`Deactivate ${row.facility.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMutation.mutate(row.id)}
                  disabled={reactivateMutation.isPending}
                  className="h-8 w-8 p-0 border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer shrink-0"
                  title="Reactivate Shelter"
                  aria-label={`Reactivate ${row.facility.name}`}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}

              {/* 7. Link to Detailed Page */}
              <Link href={`/admin/evacuation-centers/${row.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
                  title="View Full Details Page"
                  aria-label="View Full Details Page"
                >
                  <ExternalLink className="size-3.5 text-slate-700" />
                </Button>
              </Link>
            </div>
          )}
        />
      </div>

      {/* Delete / Deactivate Evacuation Center Confirmation Modal */}
      <AlertDialog
        open={!!centerToDelete}
        onOpenChange={(open) => !open && setCenterToDelete(null)}
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
                  {centerToDelete?.facility.name}
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
              onClick={() => setCenterToDelete(null)}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (centerToDelete) {
                  deactivateMutation.mutate(centerToDelete.id, {
                    onSettled: () => setCenterToDelete(null),
                  });
                }
              }}
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
