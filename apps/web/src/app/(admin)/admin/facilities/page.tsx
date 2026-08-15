"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building,
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
  School,
  Shield,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  ResourceTable,
  plainValue,
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

const FACILITY_TYPES = [
  { value: "evacuation_center", label: "Evacuation Center" },
  { value: "barangay_hall", label: "Barangay Hall / Outpost" },
  { value: "health_center", label: "Health Center / Clinic" },
  { value: "hospital", label: "Hospital / Medical Facility" },
  { value: "school", label: "Public / Private School" },
  { value: "covered_court", label: "Covered Court / Gymnasium" },
  { value: "police_station", label: "Police / Security Station" },
  { value: "fire_station", label: "Fire Station" },
  { value: "other", label: "Other Community Asset" },
];

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
  const [showHazard, setShowHazard] = React.useState(true);
  const [showAreas, setShowAreas] = React.useState(true);

  const [typeFilter, setTypeFilter] = React.useState("all");
  const [areaFilter, setAreaFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("active");

  const [countdown, setCountdown] = React.useState(60);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const { data: facilities, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/facilities/${id}`),
    onSuccess: () => {
      toast.success("Facility deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
    onError: (err) => toast.error(toDisplayError(err).detail || "Could not deactivate facility"),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/facilities/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Facility reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
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
    const evacCount = active.filter((f) => f.type === "evacuation_center").length;
    const healthCount = active.filter(
      (f) =>
        f.type === "health_center" ||
        f.type === "hospital" ||
        f.type.includes("health") ||
        f.type.includes("clinic"),
    ).length;
    const hallCount = active.filter(
      (f) => f.type === "barangay_hall" || f.type.includes("hall"),
    ).length;

    return {
      total,
      activeCount: active.length,
      inactiveCount: total - active.length,
      evacCount,
      healthCount,
      hallCount,
    };
  }, [allFacilities]);

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
      label: "Active Assets",
      value: stats.activeCount,
      unit: `/ ${stats.total}`,
      sub: `${stats.inactiveCount} inactive/archived`,
      tone: "emerald",
      badge: (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
          Operational
        </span>
      ),
    },
    {
      icon: Shield,
      label: "Evacuation Shelters",
      value: stats.evacCount,
      unit: "centers",
      sub: "Designated shelter sites",
      tone: "sky",
    },
    {
      icon: Stethoscope,
      label: "Health Stations",
      value: stats.healthCount,
      unit: "clinics",
      sub: "Medical & triage hubs",
      tone: "rose",
    },
    {
      icon: Building,
      label: "Administrative Halls",
      value: stats.hallCount,
      unit: "outposts",
      sub: "Command & sitio desks",
      tone: "amber",
    },
  ];

  /* Filter items for Map and Table */
  const filteredFacilities = React.useMemo(() => {
    return allFacilities.filter((facility) => {
      if (statusFilter === "active" && !facility.is_active) return false;
      if (statusFilter === "inactive" && facility.is_active) return false;

      if (typeFilter !== "all" && facility.type !== typeFilter) return false;

      if (areaFilter !== "all") {
        const itemArea = areaName(facility);
        if (itemArea !== areaFilter) return false;
      }

      return true;
    });
  }, [allFacilities, statusFilter, typeFilter, areaFilter, areaName]);

  /* Map Items */
  const mapItems = React.useMemo(() => {
    return filteredFacilities.map((facility) => {
      const isEvac = facility.type === "evacuation_center";
      const isHealth =
        facility.type.includes("health") ||
        facility.type.includes("clinic") ||
        facility.type.includes("hospital");

      const tone: "emerald" | "amber" | "rose" | "slate" | "sky" = !facility.is_active
        ? "slate"
        : isEvac
          ? "sky"
          : isHealth
            ? "rose"
            : "emerald";

      return {
        id: facility.id,
        name: facility.name,
        category: "facility" as const,
        location: facility.location,
        area_name: areaName(facility),
        statusLabel: facility.is_active ? plainValue(facility.type) : "Inactive Asset",
        tone,
        facilityType: facility.type,
        subDetail: facility.address || "Barangay San Jose",
        detailUrl: `/admin/facilities/${facility.id}`,
      };
    });
  }, [filteredFacilities, areaName]);

  /* Columns for ResourceTable */
  const columns: ResourceColumn<Facility>[] = [
    {
      key: "name",
      header: "Facility & Address",
      render: (row) => {
        const isHealth =
          row.type.includes("health") ||
          row.type.includes("clinic") ||
          row.type.includes("hospital");
        const isEvac = row.type === "evacuation_center";
        const isSchool = row.type.includes("school");

        return (
          <div className="flex items-start gap-3 min-w-56 max-w-sm">
            <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold overflow-hidden shadow-2xs">
              {isHealth ? (
                <Stethoscope className="size-4 text-emerald-700" />
              ) : isEvac ? (
                <Building2 className="size-4 text-emerald-700" />
              ) : isSchool ? (
                <School className="size-4 text-emerald-700" />
              ) : (
                <Building className="size-4 text-emerald-700" />
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/facilities/${row.id}`}
                className="font-bold text-neutral-900 hover:text-emerald-700 hover:underline transition-colors truncate block"
              >
                {row.name}
              </Link>
              <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                {row.address || "No detailed address notes"}
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
      key: "type",
      header: "Infrastructure Type",
      render: (row) => {
        const isEvac = row.type === "evacuation_center";
        const isHealth =
          row.type.includes("health") ||
          row.type.includes("clinic") ||
          row.type.includes("hospital");

        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold border",
              isEvac
                ? "bg-sky-50 text-sky-800 border-sky-200"
                : isHealth
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-neutral-50 text-neutral-800 border-neutral-200",
            )}
          >
            {plainValue(row.type)}
          </span>
        );
      },
    },
    {
      key: "contact_number",
      header: "Hotline / Desk",
      render: (row) => (
        <span className="text-xs font-mono text-neutral-700">
          {row.contact_number || "—"}
        </span>
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
            "Inactive"
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Barangay Facilities"
        description="Public infrastructure catalog and spatial inventory: evacuation centers, health clinics, schools, and barangay offices."
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

            <Link href="/admin/facilities/new">
              <Button
                variant="primary"
                className="h-9 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="size-3.5" />
                Register Facility
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top 5 Metric Cards */}
      <AssetMetricStrip items={metricCards} />

      {/* Two-Column Map Workspace */}
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
              showFacilityLegend={true}
              showEvacLegend={false}
              showSirenLegend={false}
            />
          </div>
        </div>

        {/* Column 2: Filter Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Map Layers */}
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-100">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              GIS Overlays
            </p>
            <div className="flex flex-col gap-2.5">
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

          {/* Filters Card */}
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between h-6">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-100">
                <Filter className="size-3.5 text-emerald-400" aria-hidden />
                Facility Filters
              </p>
              {(typeFilter !== "all" ||
                areaFilter !== "all" ||
                statusFilter !== "active") && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setAreaFilter("all");
                    setStatusFilter("active");
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
                  Facility Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-slate-700 bg-slate-800 text-xs font-semibold text-white shadow-xs focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Facility Types</SelectItem>
                    {FACILITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
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

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-slate-700 bg-slate-800 text-xs font-semibold text-white shadow-xs focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Spatial Inventory Diagnostics Card */}
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-slate-100">
                Spatial Resolution
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 border border-slate-700">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                100% Pinned
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              All {stats.total} facilities are mapped with high-accuracy GPS
              coordinates for dispatch and public map display.
            </p>
          </div>
        </div>
      </div>

      {/* ResourceTable */}
      <ResourceTable
        columns={columns}
        data={filteredFacilities}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        getRowKey={(row) => row.id}
        selectedRowKey={selectedId}
        onRowSelect={(row) => setSelectedId(row.id)}
        searchPlaceholder="Search facility name, type, address, hotline…"
        filterSlots={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                <SlidersHorizontal className="size-3 text-emerald-600 shrink-0" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-44">
                <SelectItem value="all">All Types</SelectItem>
                {FACILITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
        toolbarAction={
          <Link href="/admin/facilities/new">
            <Button
              variant="primary"
              className="h-9 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="size-3.5" />
              Register Facility
            </Button>
          </Link>
        }
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

            <Link href={`/admin/facilities/${row.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:text-emerald-700"
                title="View Facility Details"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </Link>

            <Link href={`/admin/facilities/${row.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                title="Edit Facility"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>

            {row.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Deactivate ${row.name}?`)) {
                    deleteMutation.mutate(row.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="h-8 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200"
                title="Deactivate Facility"
              >
                <Trash2 className="size-3.5" />
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
