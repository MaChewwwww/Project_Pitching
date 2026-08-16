"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  CheckCircle2,
  Compass,
  Crosshair,
  Eye,
  Filter,
  Layers,
  MapPin,
  Pencil,
  PieChart as PieChartIcon,
  Power,
  PowerOff,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { RegisterFacilityDialog } from "@/components/features/admin/register-facility-dialog";
import {
  EditFacilityDialog,
  type FacilityEditable,
} from "@/components/features/admin/edit-facility-dialog";
import { FacilityDetailsDialog } from "@/components/features/admin/facility-details-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ALL_FACILITY_TYPES,
  FACILITY_TYPE_CONFIGS,
  type FacilityType,
  getFacilityTypeConfig,
} from "@/lib/facility-types";
import { cn } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_number: string | null;
  location: { coordinates: [number, number] };
  area_id: string | null;
  area_name?: string | null;
  is_active: boolean;
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

export default function AdminFacilitiesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showAreas, setShowAreas] = React.useState(true);
  const [showHazard, setShowHazard] = React.useState(false);

  // Selected types set for sidebar type filters
  const [selectedTypes, setSelectedTypes] = React.useState<Set<FacilityType>>(
    () => new Set(ALL_FACILITY_TYPES),
  );

  const [typeDropdownFilter, setTypeDropdownFilter] = React.useState("all");
  const [areaFilter, setAreaFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("active");

  const [facilityToDeactivate, setFacilityToDeactivate] =
    React.useState<Facility | null>(null);
  const [facilityToDelete, setFacilityToDelete] =
    React.useState<Facility | null>(null);

  const mapSectionRef = React.useRef<HTMLDivElement>(null);

  const handleLocate = React.useCallback((id: string) => {
    setSelectedId(id);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const {
    data: facilities,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/facilities/${id}`),
    onSuccess: () => {
      toast.success("Facility deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "facilities"] });
    },
    onError: (err) =>
      toast.error(toDisplayError(err).detail || "Could not deactivate facility"),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/facilities/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Facility reactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "facilities"] });
    },
    onError: (err) =>
      toast.error(toDisplayError(err).detail || "Could not reactivate facility"),
  });

  const allFacilities = React.useMemo(() => facilities ?? [], [facilities]);

  const areaName = React.useCallback(
    (item: Facility) => {
      if (item.area_name) return item.area_name;
      return areas.find((a) => a.id === item.area_id)?.name ?? "—";
    },
    [areas],
  );

  /* Compute Stats */
  const stats = React.useMemo(() => {
    const total = allFacilities.length;
    const active = allFacilities.filter((f) => f.is_active);
    const evacCount = active.filter(
      (f) => f.type === "evacuation_center" || f.type.includes("evac"),
    ).length;
    const healthCount = active.filter(
      (f) =>
        f.type === "clinic" ||
        f.type === "hospital" ||
        f.type === "health_center" ||
        f.type.includes("health") ||
        f.type.includes("clinic"),
    ).length;
    const emergencyCount = active.filter(
      (f) =>
        f.type === "police" ||
        f.type === "fire" ||
        f.type === "rescue_station" ||
        f.type === "police_station" ||
        f.type === "fire_station" ||
        f.type.includes("rescue"),
    ).length;
    const hallCount = active.filter(
      (f) => f.type === "barangay_hall" || f.type.includes("hall"),
    ).length;

    // Count per type
    const countByType = new Map<FacilityType, number>();
    ALL_FACILITY_TYPES.forEach((t) => countByType.set(t, 0));
    allFacilities.forEach((f) => {
      const cfg = getFacilityTypeConfig(f.type);
      countByType.set(cfg.type, (countByType.get(cfg.type) ?? 0) + 1);
    });

    // Count per area
    const countByArea = new Map<string, number>();
    SAN_JOSE_AREAS.forEach((a) => countByArea.set(a, 0));
    allFacilities.forEach((f) => {
      const a = areaName(f);
      if (countByArea.has(a)) {
        countByArea.set(a, (countByArea.get(a) ?? 0) + 1);
      }
    });

    return {
      total,
      activeCount: active.length,
      inactiveCount: total - active.length,
      evacCount,
      healthCount,
      emergencyCount,
      hallCount,
      countByType,
      countByArea,
    };
  }, [allFacilities, areaName]);

  /* 5 Operational Metric Cards */
  const metricCards: AssetMetricCardProps[] = [
    {
      icon: Building2,
      label: "Total Infrastructure",
      value: stats.total,
      unit: "facilities",
      sub: "Geocoded in San Jose GIS",
      tone: "neutral",
    },
    {
      icon: CheckCircle2,
      label: "Operational Assets",
      value: stats.activeCount,
      unit: `/ ${stats.total} total`,
      sub: `${stats.inactiveCount} inactive/archived`,
      tone: "emerald",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          Ready
        </span>
      ),
    },
    {
      icon: BedDouble,
      label: "Evacuation Shelters",
      value: stats.evacCount,
      unit: "centers",
      sub: "Designated shelter sites",
      tone: "emerald",
    },
    {
      icon: Stethoscope,
      label: "Health & Medical",
      value: stats.healthCount,
      unit: "facilities",
      sub: "Clinics & hospitals",
      tone: "rose",
    },
    {
      icon: Shield,
      label: "Emergency & Safety",
      value: stats.emergencyCount,
      unit: "stations",
      sub: "Police, fire, rescue units",
      tone: "sky",
    },
  ];

  /* Distribution Breakdown for Sidebar Pie Chart */
  const pieChartData = React.useMemo(() => {
    return FACILITY_TYPE_CONFIGS.map((cfg) => {
      const count = stats.countByType.get(cfg.type) ?? 0;
      return {
        name: cfg.singleLabel,
        shortLabel: cfg.label,
        value: count,
        color: cfg.hexColor,
        type: cfg.type,
      };
    }).filter((item) => item.value > 0);
  }, [stats.countByType]);

  /* Toggle Facility Type in Sidebar Checklist */
  const toggleType = React.useCallback((type: FacilityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleAllTypes = React.useCallback(() => {
    setSelectedTypes((prev) => {
      if (prev.size === ALL_FACILITY_TYPES.length) {
        return new Set();
      } else {
        return new Set(ALL_FACILITY_TYPES);
      }
    });
  }, []);

  /* Filter items for Map and Table */
  const filteredFacilities = React.useMemo(() => {
    return allFacilities.filter((facility) => {
      const typeCfg = getFacilityTypeConfig(facility.type);

      // 1. Sidebar Type Checkbox Filter
      if (selectedTypes.size > 0 && !selectedTypes.has(typeCfg.type)) {
        return false;
      }

      // 2. Table Dropdown Type Filter
      if (typeDropdownFilter !== "all" && typeCfg.type !== typeDropdownFilter) {
        return false;
      }

      // 3. Area Filter
      if (areaFilter !== "all") {
        const itemArea = areaName(facility);
        if (itemArea !== areaFilter) return false;
      }

      // 4. Status Filter
      if (statusFilter === "active" && !facility.is_active) return false;
      if (statusFilter === "inactive" && facility.is_active) return false;

      return true;
    });
  }, [
    allFacilities,
    selectedTypes,
    typeDropdownFilter,
    areaFilter,
    statusFilter,
    areaName,
  ]);

  /* Map Items - active and selected facilities */
  const mapItems = React.useMemo(() => {
    return filteredFacilities.map((facility) => {
      const typeCfg = getFacilityTypeConfig(facility.type);
      const tone = !facility.is_active
        ? "slate"
        : (typeCfg.tone as "emerald" | "amber" | "rose" | "slate" | "sky");

      return {
        id: facility.id,
        name: facility.name,
        category: "facility" as const,
        location: facility.location,
        area_name: areaName(facility),
        statusLabel: facility.is_active ? typeCfg.singleLabel : "Inactive Asset",
        tone,
        facilityType: typeCfg.type,
        subDetail: facility.address || "Barangay San Jose, Rodriguez",
      };
    });
  }, [filteredFacilities, areaName]);

  /* Columns for ResourceTable */
  const columns: ResourceColumn<Facility>[] = [
    {
      key: "name",
      header: "Facility & Location",
      render: (row) => {
        const typeCfg = getFacilityTypeConfig(row.type);
        const Icon = typeCfg.icon;

        return (
          <div className="flex items-start gap-3 min-w-56 max-w-sm">
            <div
              className={cn(
                "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg font-bold shadow-2xs overflow-hidden",
                typeCfg.bg,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
              <FacilityDetailsDialog
                facility={row as FacilityEditable}
                onLocate={setSelectedId}
                onToggleStatus={(f) =>
                  f.is_active
                    ? setFacilityToDeactivate(f as Facility)
                    : reactivateMutation.mutate(f.id)
                }
                trigger={
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-sm text-neutral-900 hover:text-emerald-700 hover:underline transition-colors truncate block text-left cursor-pointer"
                  >
                    {row.name}
                  </button>
                }
              />
              <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                {row.address || "Barangay San Jose"}
              </p>
              {areaName(row) !== "—" ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                  <MapPin className="size-2.5 text-emerald-700" />
                  {areaName(row)}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Infrastructure Category",
      render: (row) => {
        const typeCfg = getFacilityTypeConfig(row.type);
        const Icon = typeCfg.icon;

        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border",
              typeCfg.badge,
            )}
          >
            <span className={cn("size-1.5 rounded-full shrink-0", typeCfg.dot)} />
            <Icon className="size-3.5 shrink-0" />
            <span>{typeCfg.singleLabel}</span>
          </span>
        );
      },
    },
    {
      key: "contact_number",
      header: "Hotline / Desk",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.contact_number ? (
            <span className="text-xs font-mono font-medium text-neutral-800">
              {row.contact_number}
            </span>
          ) : (
            <span className="text-xs text-neutral-400 font-mono">—</span>
          )}
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs",
            row.is_active
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-100 text-slate-600",
          )}
        >
          {row.is_active ? (
            <>
              <CheckCircle2 className="size-3 text-emerald-600" />
              Active
            </>
          ) : (
            <>
              <PowerOff className="size-3 text-slate-400" />
              Inactive
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Barangay Facilities & Services"
        description="Public infrastructure spatial catalog and emergency services directory: evacuation centers, health clinics, hospitals, police, and fire stations across San Jose."
        action={<RegisterFacilityDialog />}
      />

      {/* Top 5 Metrics Strip */}
      <AssetMetricStrip items={metricCards} />

      {/* Two-Column Map Workspace */}
      <div ref={mapSectionRef} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5 scroll-mt-6">
        {/* Column 1: Map Canvas */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="relative h-[480px] sm:h-[580px] lg:h-[620px] w-full overflow-hidden">
            <AdminAssetWorkspaceMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showHazard={showHazard}
              showAreas={showAreas}
              showFacilityLegend={true}
              showEvacLegend={false}
              showSirenLegend={false}
            />
          </div>
        </div>

        {/* Column 2: Filter and Layer Control Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Card 1: Map Overlays (Switched Order: Boundaries ON TOP, Flood Hazard BELOW) */}
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

          {/* Card 2: Facilities per Type Filter (Matching Attached Image UI) */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-1">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Compass className="size-3.5 text-emerald-400" aria-hidden />
                Facilities per Type
              </p>
              <button
                type="button"
                onClick={toggleAllTypes}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
              >
                {selectedTypes.size === ALL_FACILITY_TYPES.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {/* Checklist of 7 types */}
            <div className="flex flex-col gap-1.5 pt-1">
              {FACILITY_TYPE_CONFIGS.map((cfg) => {
                const isSelected = selectedTypes.has(cfg.type);
                const count = stats.countByType.get(cfg.type) ?? 0;
                const Icon = cfg.icon;

                return (
                  <button
                    key={cfg.type}
                    type="button"
                    onClick={() => toggleType(cfg.type)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer border text-left",
                      isSelected
                        ? "border-emerald-700/60 bg-white/10 text-white shadow-xs"
                        : "border-transparent text-emerald-200/60 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        className="size-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 accent-emerald-500 cursor-pointer pointer-events-none"
                      />
                      <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />
                      <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-emerald-300" : "text-emerald-400/60")} />
                      <span className="truncate font-semibold text-[11.5px]">
                        {cfg.label}
                      </span>
                    </div>

                    <span className="rounded-full bg-white/15 px-2 py-0.2 text-[10px] font-mono font-bold text-white shrink-0 ml-1">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Distribution Breakdown Pie Chart */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            {/* Donut Chart with Center Counter */}
            <div className="relative h-44 w-full" role="img" aria-label="Facility distribution breakdown">
              {/* Background center counter (z-0) so tooltips render on top */}
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white tabular-nums">
                  {stats.total}
                </span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-300/80">
                  Facilities
                </span>
              </div>

              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <RechartsTooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    formatter={(val, name) => [`${val ?? 0} Facilities`, name]}
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
                    data={pieChartData}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="#052e16"
                    strokeWidth={2.5}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities Management Table (Full Width) */}
      <div className="flex flex-col gap-3 w-full">
        <ResourceTable
          columns={columns}
          data={filteredFacilities}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          getRowKey={(row) => row.id}
          selectedRowKey={selectedId}
          searchPlaceholder="Search facility name, category, address, hotline…"
          filterSlots={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                  <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-44">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeDropdownFilter}
                onValueChange={setTypeDropdownFilter}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[140px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                  <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-48">
                  <SelectItem value="all">All Categories</SelectItem>
                  {FACILITY_TYPE_CONFIGS.map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", t.dot)} />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
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
          toolbarAction={<RegisterFacilityDialog />}
          rowActions={(row) => (
            <div
              className="flex flex-wrap items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Locate (Icon Only) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLocate(row.id)}
                aria-label={`Locate ${row.name}`}
                className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
                title="Locate on Map"
              >
                <Crosshair aria-hidden className="size-3.5 text-slate-700" />
              </Button>

              {/* 2. Details (Green Modal) */}
              <FacilityDetailsDialog
                facility={row as FacilityEditable}
                onLocate={handleLocate}
                onToggleStatus={(f) =>
                  f.is_active
                    ? setFacilityToDeactivate(f as Facility)
                    : reactivateMutation.mutate(f.id)
                }
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer shrink-0"
                    title="View Facility Details"
                    aria-label={`View Details for ${row.name}`}
                  >
                    <Eye className="size-3.5 text-emerald-700" />
                  </Button>
                }
              />

              {/* 3. Edit (Modal) */}
              <EditFacilityDialog
                facility={row as FacilityEditable}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shrink-0"
                    title="Edit Facility"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil className="size-3.5 text-amber-800" />
                  </Button>
                }
              />

              {/* 4. Deactivate / Reactivate */}
              {row.is_active ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFacilityToDeactivate(row)}
                  disabled={deactivateMutation.isPending}
                  className="h-8 gap-1.5 border-neutral-300 bg-neutral-100 px-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200 hover:text-neutral-950 cursor-pointer"
                  title="Deactivate Facility"
                >
                  <PowerOff className="size-3.5 text-neutral-600" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMutation.mutate(row.id)}
                  disabled={reactivateMutation.isPending}
                  className="h-8 gap-1.5 border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  title="Reactivate Facility"
                >
                  <Power className="size-3.5 text-emerald-600" />
                  Reactivate
                </Button>
              )}

              {/* 5. Delete Confirmation Modal */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFacilityToDelete(row)}
                disabled={deactivateMutation.isPending}
                className="h-8 gap-1.5 border-rose-200 bg-rose-50/60 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Delete Facility (Soft Delete)"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          )}
        />
      </div>

      {/* Deactivate Facility Confirmation Modal */}
      <AlertDialog
        open={!!facilityToDeactivate}
        onOpenChange={(open) => !open && setFacilityToDeactivate(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200">
                <PowerOff className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Deactivate Facility?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-slate-500 truncate mt-0.5">
                  {facilityToDeactivate?.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Placing this facility into an inactive state will remove its marker pin from public GIS maps while retaining its registry record for administration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFacilityToDeactivate(null)}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (facilityToDeactivate) {
                  deactivateMutation.mutate(facilityToDeactivate.id, {
                    onSettled: () => setFacilityToDeactivate(null),
                  });
                }
              }}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs cursor-pointer"
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Confirm Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Facility Confirmation Modal */}
      <AlertDialog
        open={!!facilityToDelete}
        onOpenChange={(open) => !open && setFacilityToDelete(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-black text-slate-900 leading-tight">
                  Delete Facility Record?
                </AlertDialogTitle>
                <p className="text-xs font-bold text-rose-700 truncate mt-0.5">
                  {facilityToDelete?.name}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed mt-2">
              Are you sure you want to delete this facility record? This will archive the physical asset from GIS maps and emergency routing while keeping historical audit entries intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFacilityToDelete(null)}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (facilityToDelete) {
                  deactivateMutation.mutate(facilityToDelete.id, {
                    onSettled: () => setFacilityToDelete(null),
                  });
                }
              }}
              disabled={deactivateMutation.isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
            >
              {deactivateMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
