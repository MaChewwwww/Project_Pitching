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
  MapPin,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Power,
  PowerOff,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
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

  /* Donut Chart Data */
  const chartData = React.useMemo(() => {
    return [
      { name: "Open & Available", value: Math.max(0, stats.openCount - stats.atCapacity - stats.nearCapacity), color: "#10b981" },
      { name: "Near Capacity", value: stats.nearCapacity, color: "#f59e0b" },
      { name: "Full / At Capacity", value: stats.atCapacity, color: "#ef4444" },
      { name: "Closed / Standby", value: stats.closedCount, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [stats]);

  /* Filtered Centers */
  const filteredCenters = React.useMemo(() => {
    return allCenters.filter((center) => {
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
  }, [allCenters, statusFilter, areaFilter, occupancyTier]);

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

      {/* Main 2-Column GIS Workspace & Control Sidebar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Column 1: Leaflet Interactive Map View */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-emerald-900/40 bg-neutral-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-950/80 bg-gradient-to-r from-[#064e3b] to-[#022c22] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <BedDouble className="size-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Evacuation Shelter Spatial Workspace
              </span>
            </div>
            <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60 shadow-2xs">
              {mapItems.length} Mapped Shelters
            </span>
          </div>

          <div className="h-[460px] w-full">
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

        {/* Column 2: Filter and Distribution Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Card 1: Map Overlays */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
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

          {/* Card 2: Shelter Distribution & Status Donut Chart */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <PieChartIcon className="size-3.5 text-emerald-400" aria-hidden />
                Shelter Status Breakdown
              </p>
              <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60 shadow-2xs">
                {stats.total} Total
              </span>
            </div>

            {/* Donut Chart */}
            <div className="relative h-44 w-full" role="img" aria-label="Evacuation shelter status breakdown">
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white tabular-nums">
                  {stats.openCount}
                </span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-300/80">
                  Open Shelters
                </span>
              </div>

              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <RechartsTooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    formatter={(val, name) => [`${val ?? 0} Shelters`, name]}
                    contentStyle={{
                      backgroundColor: "#064e3b",
                      borderColor: "#059669",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      color: "#ffffff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="#052e16"
                    strokeWidth={2.5}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
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

              {/* 6. Link to Detailed Page */}
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
    </div>
  );
}
