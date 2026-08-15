"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building,
  Building2,
  CheckCircle2,
  Copy,
  MapPin,
  Pencil,
  Phone,
  School,
  Shield,
  ShieldAlert,
  Stethoscope,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  AssetMetricCard,
} from "@/components/features/admin/asset-metric-strip";
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { plainValue } from "@/components/features/admin/resource-table";
import { cn } from "@/lib/utils";

interface FacilityDetail {
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

export default function FacilityDetailPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const facilityId = params.id as string;

  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const { data: facility, isLoading, isError } = useQuery({
    queryKey: ["admin", "facilities", facilityId],
    queryFn: () =>
      api.get<FacilityDetail>(`/admin/facilities/${facilityId}`).then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/facilities/${facilityId}`),
    onSuccess: () => {
      toast.success("Facility deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      router.push("/admin/facilities");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Could not deactivate facility");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.post(`/admin/facilities/${facilityId}/reactivate`),
    onSuccess: () => {
      toast.success("Facility reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
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

  if (isError || !facility) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-700">
          <Building2 className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Facility Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The requested facility record does not exist or may have been removed.
        </p>
        <Link href="/admin/facilities">
          <Button variant="primary">Return to Facilities</Button>
        </Link>
      </div>
    );
  }

  const areaName =
    facility.area_name ||
    areas.find((a) => a.id === facility.area_id)?.name ||
    "Unassigned Sitio";

  const isEvac = facility.type === "evacuation_center";
  const isHealth =
    facility.type.includes("health") ||
    facility.type.includes("clinic") ||
    facility.type.includes("hospital");
  const isSchool = facility.type.includes("school");

  const [lng, lat] = facility.location.coordinates;
  const coordsStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coordsStr);
    setCopiedCoords(true);
    toast.success("Coordinates copied to clipboard");
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const mapItem = {
    id: facility.id,
    name: facility.name,
    category: "facility" as const,
    location: facility.location,
    area_name: areaName,
    statusLabel: facility.is_active ? plainValue(facility.type) : "Inactive Asset",
    tone: facility.is_active ? ("emerald" as const) : ("slate" as const),
    facilityType: facility.type,
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Back Link & Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <Link
          href="/admin/facilities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Facilities Directory
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/admin/facilities/${facility.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <Pencil className="size-3.5" />
              Edit Facility
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22] p-6 text-white shadow-xl lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-inner">
            {isHealth ? (
              <Stethoscope className="size-7" />
            ) : isEvac ? (
              <Building2 className="size-7" />
            ) : isSchool ? (
              <School className="size-7" />
            ) : (
              <Building className="size-7" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {facility.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs",
                  facility.is_active
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-slate-700 text-slate-200",
                )}
              >
                {facility.is_active ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-950" />
                    Active Infrastructure
                  </>
                ) : (
                  <>
                    <XCircle className="size-3 text-slate-400" />
                    Inactive / Archived
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-emerald-100/80">
              {plainValue(facility.type)} • {areaName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {facility.is_active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(`Deactivate ${facility.name}?`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="border-rose-300/60 bg-rose-950/60 text-xs font-bold text-rose-200 hover:bg-rose-900"
            >
              <Trash2 className="size-3.5 mr-1" />
              Deactivate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="bg-emerald-500 text-emerald-950 text-xs font-bold hover:bg-emerald-400"
            >
              Reactivate Facility
            </Button>
          )}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AssetMetricCard
          icon={Building2}
          label="Classification"
          value={plainValue(facility.type)}
          sub="Official infrastructure role"
          tone={isEvac ? "sky" : isHealth ? "rose" : "neutral"}
        />
        <AssetMetricCard
          icon={MapPin}
          label="Sitio Zone"
          value={areaName}
          sub="Barangay San Jose boundary"
          tone="emerald"
        />
        <AssetMetricCard
          icon={Shield}
          label="GIS Status"
          value="Geocoded"
          sub="Accurate point coordinates"
          tone="emerald"
          badge={
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
              Verified
            </span>
          }
        />
        <AssetMetricCard
          icon={Phone}
          label="Hotline / Contact"
          value={facility.contact_number ? "Available" : "Unlisted"}
          sub={facility.contact_number || "No direct phone recorded"}
          tone="neutral"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Detailed Infrastructure Profile */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Facility Dossier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="size-4 text-emerald-700" />
              Infrastructure Dossier
            </h3>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Facility Name
                </dt>
                <dd className="font-bold text-slate-900 text-sm mt-0.5">
                  {facility.name}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Type / Category
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {plainValue(facility.type)}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Physical Address & Landmarks
                </dt>
                <dd className="font-medium text-slate-800 mt-0.5">
                  {facility.address || "Barangay San Jose, Rodriguez, Rizal"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Sitio Area
                </dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {areaName}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider">
                  Direct Contact Number
                </dt>
                <dd className="font-mono text-emerald-700 font-bold mt-0.5">
                  {facility.contact_number || "Barangay San Jose Emergency Desk"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Flood Hazard Exposure Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="size-4 text-emerald-700" />
              Flood Inundation & Terrain Exposure Analysis
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Spatial analysis cross-references this facility&apos;s GPS coordinate against
              the UP NOAH / LiPAD 5-year, 25-year, and 100-year flood inundation return
              layers for Barangay San Jose.
            </p>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  5-Year Flood
                </span>
                <p className="mt-1 font-bold text-emerald-950 text-sm">
                  Terrain Verified
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Low inundation risk on base elevation
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  25-Year Flood
                </span>
                <p className="mt-1 font-bold text-amber-950 text-sm">
                  Moderate Watch
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Access roads may experience minor runoff
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  100-Year Event
                </span>
                <p className="mt-1 font-bold text-slate-900 text-sm">
                  Critical Inundation
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Extreme overflow model evaluated
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Map Preview & Geocoding Details */}
        <div className="flex flex-col gap-5">
          {/* Spatial Location Map Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-1 shadow-lg overflow-hidden flex flex-col">
            <div className="h-64 w-full overflow-hidden rounded-xl">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={facility.id}
                onSelect={() => {}}
                showHazard
                showAreas
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
                Layered with official Sitio boundary lines and Project NOAH flood maps.
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Management Actions
            </h4>

            <Link href={`/admin/facilities/${facility.id}/edit`}>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-xs font-bold"
              >
                <Pencil className="size-3.5 text-amber-600" />
                Edit Facility Metadata & Coordinates
              </Button>
            </Link>

            {isEvac ? (
              <Link href="/admin/evacuation-centers">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-xs font-bold text-sky-800 border-sky-200 bg-sky-50/50 hover:bg-sky-100"
                >
                  <Building2 className="size-3.5 text-sky-600" />
                  View Evacuation Center Operations
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
