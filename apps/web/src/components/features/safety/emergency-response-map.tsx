"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import type { Layer } from "leaflet";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Filter,
  Home,
  Layers,
  MapPin,
  RotateCcw,
  Search,
  Shield,
  Siren,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hazardLevelForPoint,
  pointInGeometry,
  useHazardGeoJson,
  type HazardGeometry,
} from "@/lib/hazard-geojson";
import type {
  EmergencyWorkspaceOut,
  WorkspaceHouseholdOut,
} from "@/lib/api/safety-types";
import {
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  distinctAreaStyle,
  HAZARD_LEVELS,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import { api, toDisplayError } from "@/lib/api/client";
import type { SafetyStatusAdminIn } from "@/lib/api/safety-types";
import type { AreaBoundaryFeature, PublicEmergencyEvent, PublicFacility } from "@/lib/api/public-types";
import "@/lib/leaflet-setup";
import "leaflet/dist/leaflet.css";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type Risk = 1 | 2 | 3;
type ListTab = "mapped" | "unmapped" | "walkins";

export interface PublicSiren {
  id: string;
  name: string;
  location: { type: "Point"; coordinates: [number, number] };
  status: "idle" | "sounding";
  area_id?: string | null;
}

interface EnrichedHousehold {
  household: WorkspaceHouseholdOut;
  risk: Risk;
  riskSource: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function fallbackRisk(value: WorkspaceHouseholdOut["waterway_proximity"]): Risk {
  if (value === "very_near") return 3;
  if (value === "near") return 2;
  return 1;
}

function riskColor(risk: Risk) {
  return risk === 3 ? "#EF4444" : risk === 2 ? "#F59E0B" : "#15803D";
}

function riskLabel(risk: Risk) {
  return risk === 3 ? "High" : risk === 2 ? "Medium" : "Low";
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Map panes — keep markers strictly above hazard overlay                      */
/* -------------------------------------------------------------------------- */

function EmergencyMapPanes() {
  const map = useMap();
  React.useEffect(() => {
    if (!map.getPane("topBoundaryPane")) {
      const pane = map.createPane("topBoundaryPane");
      pane.style.zIndex = "550";
    }
    if (!map.getPane("householdPane")) {
      const pane = map.createPane("householdPane");
      pane.style.zIndex = "660"; // Layer 3 (Bottom): Households
    }
    if (!map.getPane("facilityPane")) {
      const pane = map.createPane("facilityPane");
      pane.style.zIndex = "670"; // Layer 2 (Middle): Other Facilities
    }
    if (!map.getPane("evacPane")) {
      const pane = map.createPane("evacPane");
      pane.style.zIndex = "680"; // Layer 1 (Topmost): Evacuation Centers
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "750";

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function createEvacCenterIcon(isAtCapacity: boolean) {
  const bgColor = isAtCapacity ? "#DC2626" : "#059669";
  const width = 18;
  const height = 24;

  return L.divIcon({
    className: "evac-center-pin-icon",
    html: `
      <div class="transition-transform hover:scale-115 cursor-pointer" style="width:${width}px; height:${height}px;">
        <svg width="${width}" height="${height}" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.7));">
          <path d="M9 0.75C4.444 0.75 0.75 4.444 0.75 9C0.75 14.5 7.8 22.8 9 23.25C10.2 22.8 17.25 14.5 17.25 9C17.25 4.444 13.556 0.75 9 0.75Z" fill="${bgColor}"/>
          <!-- Civic Building / Center (Pediment, Columns, Base) -->
          <polygon points="9,4.2 4.5,6.8 13.5,6.8" fill="#FFFFFF"/>
          <rect x="4.5" y="7.1" width="9" height="0.75" rx="0.2" fill="#FFFFFF"/>
          <rect x="5.2" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
          <rect x="8.35" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
          <rect x="11.5" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
          <rect x="4.2" y="11.8" width="9.6" height="0.85" rx="0.2" fill="#FFFFFF"/>
        </svg>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
    tooltipAnchor: [0, -height],
  });
}

function createBoundaryLabelIcon() {
  return L.divIcon({
    className: "san-jose-boundary-badge-container",
    html: `<div class="bg-white text-slate-900 border border-slate-300 shadow-md px-3 py-1 rounded-md font-bold text-[11px] whitespace-nowrap flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:text-emerald-700 transition-colors">Barangay San Jose Boundary</div>`,
    iconSize: [200, 26],
    iconAnchor: [100, 48],
  });
}

function makeKeyboardReachable(layer: Layer, open: () => void) {
  window.setTimeout(() => {
    const element = (layer as Layer & { getElement?: () => SVGElement }).getElement?.();
    if (!element) return;
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

const ADMIN_MAP_CSS = `
@keyframes sagip-ripple {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(2.5); opacity: 0;   }
}
.sagip-siren-ripple {
  animation: sagip-ripple 1.5s ease-out infinite;
}
.admin-emergency-map .leaflet-container {
  background: #090d16;
}
.evac-center-pin-icon {
  background: transparent !important;
  border: none !important;
}
.admin-emergency-map .leaflet-tooltip {
  background: transparent !important;
  color: #f8fafc !important;
  border: none !important;
  border-radius: 0.5rem;
  padding: 0 !important;
  box-shadow: none !important;
  max-width: 340px !important;
  white-space: normal !important;
  pointer-events: none;
}
.admin-emergency-map .leaflet-tooltip::before,
.admin-emergency-map .leaflet-tooltip::after {
  display: none !important;
}
.admin-emergency-map .leaflet-control-attribution {
  display: none;
}
.admin-emergency-map .leaflet-top.leaflet-right {
  top: 4px;
  right: 4px;
}
.admin-emergency-map .leaflet-control-zoom {
  border: 1px solid rgba(74,222,128,0.3) !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5) !important;
}
.admin-emergency-map .leaflet-control-zoom a {
  background: #052e16 !important;
  color: #4ade80 !important;
  border-bottom: 1px solid rgba(74,222,128,0.2) !important;
  font-size: 16px !important;
}
.admin-emergency-map .leaflet-control-zoom a:hover {
  background: #064e3b !important;
}
.sagip-legend-scroll {
  scrollbar-width: thin;
  scrollbar-color: #34d399 rgba(5, 46, 22, 0.6);
}
.sagip-legend-scroll::-webkit-scrollbar {
  width: 5px;
}
.sagip-legend-scroll::-webkit-scrollbar-track {
  background: rgba(5, 46, 22, 0.6);
  border-radius: 9999px;
}
.sagip-legend-scroll::-webkit-scrollbar-thumb {
  background: #34d399;
  border-radius: 9999px;
}
.sagip-legend-scroll::-webkit-scrollbar-thumb:hover {
  background: #6ee7b7;
}
.sagip-modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: #34d399 rgba(241, 245, 249, 0.8);
}
.sagip-modal-scroll::-webkit-scrollbar {
  width: 6px;
}
.sagip-modal-scroll::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 9999px;
}
.sagip-modal-scroll::-webkit-scrollbar-thumb {
  background: #34d399;
  border-radius: 9999px;
}
.sagip-modal-scroll::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}
.san-jose-interactive-area {
  cursor: pointer !important;
}
.san-jose-interactive-boundary {
  cursor: pointer !important;
}
`;

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export function EmergencyResponseMap({ data }: { data: EmergencyWorkspaceOut }) {
  const hazard = useHazardGeoJson(true);

  /* --- filter state --- */
  const [search, setSearch] = React.useState("");
  const [area, setArea] = React.useState("all");
  const [risk, setRisk] = React.useState("all");
  const [safety, setSafety] = React.useState("all");
  const [support, setSupport] = React.useState("all");
  const [capacity, setCapacity] = React.useState("all");

  /* --- layer visibility --- */
  const [showHazard, setShowHazard] = React.useState(true);
  const [showAreas, setShowAreas] = React.useState(true);
  const [showHouseholds, setShowHouseholds] = React.useState(true);
  const [showCenters, setShowCenters] = React.useState(true);
  const [showSirens, setShowSirens] = React.useState(true);
  const [showFacilities, setShowFacilities] = React.useState(false);

  /* --- UI state --- */
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState<string | null>(null);
  const selected = React.useMemo(() => {
    if (!selectedHouseholdId) return null;
    return data.households.find((h) => h.household_id === selectedHouseholdId) ?? null;
  }, [data.households, selectedHouseholdId]);
  const [selectedAreaName, setSelectedAreaName] = React.useState<string | null>(null);
  const [showBarangaySummary, setShowBarangaySummary] = React.useState(false);
  const [listTab, setListTab] = React.useState<ListTab>("mapped");
  const [legendExpanded, setLegendExpanded] = React.useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  /* --- area boundaries layer --- */
  const areaBoundariesQuery = useQuery({
    queryKey: ["public", "area-boundaries", "emergency-map"],
    queryFn: () =>
      api
        .get<{ type: "FeatureCollection"; features: AreaBoundaryFeature[] }>(
          "/public/area-boundaries",
        )
        .then((response) => response.data),
    enabled: showAreas,
  });

  /* --- optional public facilities --- */
  const facilitiesQuery = useQuery({
    queryKey: ["public", "facilities", "emergency-map"],
    queryFn: () =>
      api.get<PublicFacility[]>("/public/facilities").then((response) => response.data),
    enabled: showFacilities,
  });

  /* --- siren units layer --- */
  const sirensQuery = useQuery({
    queryKey: ["public", "sirens", "emergency-map"],
    queryFn: () =>
      api.get<PublicSiren[]>("/public/sirens").then((response) => response.data),
    enabled: showSirens,
  });

  /* --- risk enrichment --- */
  const enriched: EnrichedHousehold[] = React.useMemo(
    () =>
      data.households.map((household) => {
        const point = household.location?.coordinates;
        const mappedRisk = point
          ? hazardLevelForPoint(
              hazard.status === "ready" ? hazard.data : null,
              point[1],
              point[0],
            )
          : null;
        return {
          household,
          risk: (mappedRisk ?? fallbackRisk(household.waterway_proximity)) as Risk,
          riskSource: mappedRisk
            ? "NOAH 5-year flood layer"
            : "Household survey fallback",
        };
      }),
    [data.households, hazard],
  );

  /* --- filtered set --- */
  const filtered = enriched.filter(({ household, risk: riskLevel }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      household.reference_no.toLowerCase().includes(query) ||
      household.head_name.toLowerCase().includes(query) ||
      household.members.some((m) => m.full_name.toLowerCase().includes(query));
    const matchesSafety =
      safety === "all" ||
      (safety === "safe" && household.all_safe) ||
      (safety === "not_safe" && !household.all_safe);
    const hasSpecialNeeds = household.members.some(
      (m) => (m.vulnerability_flags || []).length > 0,
    );
    const matchesSupport =
      support === "all" ||
      (support === "with_special_needs" && hasSpecialNeeds) ||
      (support === "without_special_needs" && !hasSpecialNeeds);
    return (
      matchesSearch &&
      (area === "all" || household.area_id === area) &&
      (risk === "all" || riskLevel === Number(risk)) &&
      matchesSafety &&
      matchesSupport
    );
  });

  const areas = Array.from(
    new Map(data.households.map((h) => [h.area_id, h.area_name])),
  );

  const visibleCenters = data.evacuation_centers.filter(
    (c) =>
      capacity === "all" ||
      (capacity === "over" ? c.is_at_capacity : !c.is_at_capacity),
  );

  const mappedHouseholds = filtered.filter((e) => e.household.location);
  const unmappedHouseholds = filtered.filter((e) => !e.household.location);

  const totalHouseholds = filtered.length;
  const totalCitizens = filtered.reduce(
    (sum, e) => sum + e.household.members.length,
    0,
  );

  const safeHouseholds = filtered.filter((e) => e.household.all_safe).length;
  const safeCitizens = filtered.reduce(
    (sum, e) =>
      sum + e.household.members.filter((m) => m.status === "safe").length,
    0,
  );

  const specialNeedsHouseholds = filtered.filter((e) =>
    e.household.members.some((m) => (m.vulnerability_flags || []).length > 0),
  ).length;
  const specialNeedsCitizens = filtered.reduce(
    (sum, e) =>
      sum +
      e.household.members.filter(
        (m) => (m.vulnerability_flags || []).length > 0,
      ).length,
    0,
  );

  const pendingHouseholds = Math.max(0, totalHouseholds - safeHouseholds);
  const pendingCitizens = Math.max(0, totalCitizens - safeCitizens);

  const safePct =
    totalHouseholds > 0
      ? Math.round((safeHouseholds / totalHouseholds) * 100)
      : 0;

  const pendingPct =
    totalHouseholds > 0 ? Math.max(0, 100 - safePct) : 0;

  /* --- derived enriched lookup --- */
  const enrichedMap = React.useMemo(() => {
    const map = new Map<string, EnrichedHousehold>();
    enriched.forEach((e) => map.set(e.household.household_id, e));
    return map;
  }, [enriched]);

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------------ */}
      {/* Metrics bar (occupies full width across both columns)               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={Users}
          label="In Scope"
          value={totalHouseholds}
          unit="Households"
          sub={`${totalCitizens} Citizens registered`}
          badge={
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
              Barangay
            </span>
          }
          tone="neutral"
        />
        <MetricCard
          icon={Shield}
          label="Special Needs"
          value={specialNeedsCitizens}
          unit="Citizens"
          sub={
            specialNeedsHouseholds > 0
              ? `${specialNeedsHouseholds} ${specialNeedsHouseholds === 1 ? "Household" : "Households"} with special needs`
              : "No Special Needs Flags"
          }
          badge={
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
              Priority Care
            </span>
          }
          tone={specialNeedsCitizens > 0 ? "warning" : "neutral"}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Confirmed Safe"
          value={safeHouseholds}
          unit="Households"
          sub={`${safeCitizens} Citizens verified safe`}
          badge={
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
              {safePct}% Safe
            </span>
          }
          tone="success"
        />
        <MetricCard
          icon={Clock}
          label="Pending Contact"
          value={pendingHouseholds}
          unit="Households"
          sub={`${pendingCitizens} Citizens awaiting status`}
          badge={
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
              {pendingPct}% Pending
            </span>
          }
          tone={pendingHouseholds > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column: map (col 1) + sidebar (col 2)                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">

        {/* Column 1: Map card with seamlessly docked mobile footer */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Map canvas */}
          <div className="admin-emergency-map relative h-[480px] sm:h-[580px] lg:h-[680px] w-full overflow-hidden">
            <style>{ADMIN_MAP_CSS}</style>
            <MapContainer
              center={[14.7415, 121.1315]}
              zoom={14}
              zoomControl={false}
              className="h-full w-full min-h-[500px]"
              scrollWheelZoom
              minZoom={11}
              maxZoom={18}
              attributionControl={false}
            >
              <ZoomControl position="topright" />
              <EmergencyMapPanes />
              <TileLayer
                url={DARK_TILE_URL}
                attribution={DARK_TILE_ATTRIBUTION}
                maxZoom={18}
                maxNativeZoom={18}
              />

            {/* Flood hazard overlay */}
            {showHazard && hazard.status === "ready" ? (
              <GeoJSON
                key="hazard"
                data={hazard.data as GeoJSON.GeoJsonObject}
                style={(feature) => hazardStyle(Number(feature?.properties?.Var ?? 0))}
              />
            ) : null}

            {/* Area divisions (Areas 1–6) with interactive hover glow and click modal */}
            {showAreas && areaBoundariesQuery.data ? (
              <GeoJSON
                key="areas-boundaries"
                data={areaBoundariesQuery.data as GeoJSON.GeoJsonObject}
                style={(feature) => ({
                  ...distinctAreaStyle(
                    (feature?.properties as { name?: string })?.name ?? "",
                  ),
                  className: "san-jose-interactive-area",
                })}
                onEachFeature={(feature, layer) => {
                  const areaName =
                    (feature.properties as { name?: string })?.name ?? "Area";
                  layer.on({
                    mouseover: (e) => {
                      const l = e.target as L.Path;
                      l.setStyle({
                        color: "#34d399",
                        weight: 3.5,
                        dashArray: "",
                        fillOpacity: 0.28,
                      });
                      l.bringToFront();
                    },
                    mouseout: (e) => {
                      const l = e.target as L.Path;
                      l.setStyle(distinctAreaStyle(areaName));
                    },
                    click: () => {
                      setSelectedAreaName(areaName);
                    },
                  });
                }}
              />
            ) : null}

            {/* San Jose boundary with interactive hover glow and click modal */}
            <GeoJSON
              data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
              pane="topBoundaryPane"
              style={() => ({
                ...BOUNDARY_LINE_STYLE,
                className: "san-jose-interactive-boundary",
              })}
              onEachFeature={(feature, layer) => {
                layer.on({
                  mouseover: (e) => {
                    const l = e.target as L.Path;
                    l.setStyle({
                      color: "#22c55e",
                      weight: 6,
                      dashArray: "12, 6",
                      opacity: 1,
                    });
                  },
                  mouseout: (e) => {
                    const l = e.target as L.Path;
                    l.setStyle(BOUNDARY_LINE_STYLE);
                  },
                  click: () => {
                    setShowBarangaySummary(true);
                  },
                });
              }}
            />
            <Marker
              position={[14.7615, 121.133]}
              icon={createBoundaryLabelIcon()}
              pane="topBoundaryPane"
              eventHandlers={{
                click: () => setShowBarangaySummary(true),
              }}
            />

            {/* Household pins — circular pins with white border (pane: householdPane, z-index 660) */}
            {showHouseholds &&
              filtered.map(({ household, risk: riskLevel, riskSource }) => {
                if (!household.location) return null;
                const [longitude, latitude] = household.location.coordinates;
                const safeColor = "#64748B";
                return (
                  <CircleMarker
                    key={household.household_id}
                    center={[latitude, longitude]}
                    radius={8}
                    pane="householdPane"
                    pathOptions={{
                      fillColor: household.all_safe ? safeColor : riskColor(riskLevel),
                      fillOpacity: 0.95,
                      color: "#ffffff",
                      weight: 2.5,
                    }}
                    eventHandlers={{
                      click: () => setSelectedHouseholdId(household.household_id),
                      add: (event) =>
                        makeKeyboardReachable(event.target, () =>
                          setSelectedHouseholdId(household.household_id),
                        ),
                    }}
                  >
                    <Tooltip
                      direction="top"
                      opacity={1}
                      sticky={false}
                    >
                      <CompactHouseholdTooltip
                        household={household}
                        risk={riskLevel}
                        riskSource={riskSource}
                      />
                    </Tooltip>
                  </CircleMarker>
                );
              })}

            {/* Other public facilities (pane: facilityPane, z-index 670) */}
            {showFacilities
              ? facilitiesQuery.data
                  ?.filter((f) => f.type !== "evacuation_center")
                  .map((facility) => {
                    const point = facility.location?.coordinates;
                    if (!point) return null;
                    return (
                      <CircleMarker
                        key={facility.id}
                        center={[point[1], point[0]]}
                        radius={8}
                        pane="facilityPane"
                        pathOptions={{
                          color: "#334155",
                          fillColor: "#F8FAFC",
                          fillOpacity: 0.95,
                          weight: 2,
                        }}
                      >
                        <Tooltip direction="top" opacity={1}>
                          <FacilityTooltip facility={facility} />
                        </Tooltip>
                      </CircleMarker>
                    );
                  })
              : null}

            {/* Evacuation center pins — squircle shelter badges (pane: evacPane, z-index 680, topmost) */}
            {/* Evacuation Centers */}
            {showCenters
              ? visibleCenters.map((center) => {
                  const point = center.facility.location?.coordinates;
                  if (!point) return null;
                  return (
                    <Marker
                      key={center.id}
                      position={[point[1], point[0]]}
                      icon={createEvacCenterIcon(center.is_at_capacity)}
                      pane="evacPane"
                    >
                      <Tooltip direction="top" opacity={1}>
                        <EvacCenterTooltip center={center} />
                      </Tooltip>
                    </Marker>
                  );
                })
              : null}

            {/* Siren Units Layer */}
            {showSirens
              ? (sirensQuery.data ?? []).map((siren) => {
                  const [lon, lat] = siren.location.coordinates;
                  const isSounding = siren.status === "sounding";
                  return (
                    <CircleMarker
                      key={siren.id}
                      center={[lat, lon]}
                      radius={8}
                      pathOptions={{
                        color: isSounding ? "#EF4444" : "#94A3B8",
                        weight: isSounding ? 3 : 1.5,
                        fillColor: isSounding ? "#EF4444" : "#64748B",
                        fillOpacity: 0.9,
                        className: isSounding ? "sagip-siren-ripple" : undefined,
                      }}
                    >
                      <Tooltip direction="top" opacity={1}>
                        <SirenTooltip siren={siren} />
                      </Tooltip>
                    </CircleMarker>
                  );
                })
              : null}
          </MapContainer>

          {/* Top-left collapsible Legend card inside the map */}
          <div
            aria-label="Map legend"
            className={cn(
              "absolute top-3.5 left-3.5 z-[1000] rounded-xl border border-emerald-900/80 bg-[#052e16]/95 text-white shadow-2xl backdrop-blur-md transition-all duration-200",
              legendExpanded
                ? "w-64 max-w-[calc(100%-6rem)] max-h-[calc(100%-2rem)] overflow-y-auto sagip-legend-scroll p-3"
                : "w-auto p-2"
            )}
          >
            <button
              type="button"
              onClick={() => setLegendExpanded((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors",
                legendExpanded ? "w-full justify-between mb-2 pb-1.5 border-b border-emerald-900/60" : "w-auto"
              )}
              aria-expanded={legendExpanded}
              title={legendExpanded ? "Collapse Legend" : "Expand Legend"}
            >
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-400" aria-hidden />
                Legend
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-emerald-400/80 transition-transform duration-200",
                  legendExpanded ? "rotate-180" : "rotate-0"
                )}
                aria-hidden
              />
            </button>

            {legendExpanded && (
              <div className="flex flex-col gap-2 text-[11px]">
              {/* Flood Hazard */}
              {showHazard && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                    Flood Hazard (NOAH)
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {HAZARD_LEVELS.map((level) => (
                      <li key={level.level} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-4 shrink-0 rounded-[2px] border border-white/30 shadow-2xs"
                          style={{ backgroundColor: level.color, opacity: 0.85 }}
                        />
                        <span className="text-emerald-100/90">
                          <span className="font-semibold">{level.label} Hazard</span> ({level.depth})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Map Boundaries */}
              <div className={showHazard ? "border-t border-emerald-900/60 pt-1.5" : ""}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                  Map Boundaries
                </p>
                <ul className="flex flex-col gap-1">
                  <li className="flex items-center gap-2">
                    <span className="inline-block w-3.5 border-b-2 border-dashed border-emerald-400" />
                    <span className="text-emerald-100/90">San Jose Boundary</span>
                  </li>
                  {showAreas && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3.5 border-b border-dashed border-slate-300" />
                      <span className="text-emerald-100/90">Area Divisions (1–6)</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Evacuation Centers */}
              {showCenters && (
                <div className="border-t border-emerald-900/60 pt-1.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                    Evacuation Centers
                  </p>
                  <ul className="flex flex-col gap-1">
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="flex shrink-0 items-center justify-center">
                        <svg width="11" height="15" viewBox="0 0 18 24" fill="none">
                          <path d="M9 0.75C4.444 0.75 0.75 4.444 0.75 9C0.75 14.5 7.8 22.8 9 23.25C10.2 22.8 17.25 14.5 17.25 9C17.25 4.444 13.556 0.75 9 0.75Z" fill="#059669"/>
                          <polygon points="9,4.2 4.5,6.8 13.5,6.8" fill="#FFFFFF"/>
                          <rect x="4.5" y="7.1" width="9" height="0.75" rx="0.2" fill="#FFFFFF"/>
                          <rect x="5.2" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="8.35" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="11.5" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="4.2" y="11.8" width="9.6" height="0.85" rx="0.2" fill="#FFFFFF"/>
                        </svg>
                      </span>
                      <span className="text-emerald-100/90">Available Capacity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="flex shrink-0 items-center justify-center">
                        <svg width="11" height="15" viewBox="0 0 18 24" fill="none">
                          <path d="M9 0.75C4.444 0.75 0.75 4.444 0.75 9C0.75 14.5 7.8 22.8 9 23.25C10.2 22.8 17.25 14.5 17.25 9C17.25 4.444 13.556 0.75 9 0.75Z" fill="#DC2626"/>
                          <polygon points="9,4.2 4.5,6.8 13.5,6.8" fill="#FFFFFF"/>
                          <rect x="4.5" y="7.1" width="9" height="0.75" rx="0.2" fill="#FFFFFF"/>
                          <rect x="5.2" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="8.35" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="11.5" y="8.2" width="1.3" height="3.2" rx="0.2" fill="#FFFFFF"/>
                          <rect x="4.2" y="11.8" width="9.6" height="0.85" rx="0.2" fill="#FFFFFF"/>
                        </svg>
                      </span>
                      <span className="text-emerald-100/90">Overloading Capacity</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Siren Units */}
              {showSirens && (
                <div className="border-t border-emerald-900/60 pt-1.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                    Siren Units
                  </p>
                  <ul className="flex flex-col gap-1">
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-slate-400 bg-slate-500" />
                      <span className="text-emerald-100/90">Idle Siren</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-rose-300 bg-rose-500" />
                      <span className="text-emerald-100/90">Sounding Siren</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Household Pins */}
              {showHouseholds && (
                <div className="border-t border-emerald-900/60 pt-1.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                    Household Pins
                  </p>
                  <ul className="flex flex-col gap-1">
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60" style={{ backgroundColor: "#15803D" }} />
                      <span className="text-emerald-100/90">Low Flood Risk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60" style={{ backgroundColor: "#F59E0B" }} />
                      <span className="text-emerald-100/90">Medium Flood Risk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60" style={{ backgroundColor: "#EF4444" }} />
                      <span className="text-emerald-100/90">High Flood Risk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60" style={{ backgroundColor: "#64748B" }} />
                      <span className="text-emerald-100/90">All Safe (Checked In)</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Other Facilities */}
              {showFacilities && (
                <div className="border-t border-emerald-900/60 pt-1.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                    Other Facilities
                  </p>
                  <ul className="flex flex-col gap-1">
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-slate-400 bg-slate-100" />
                      <span className="text-emerald-100/90">Barangay & Public Facilities</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            )}
          </div>

            {/* Desktop floating Data Sources card inside the map */}
            <div
              aria-label="Data sources attribution"
              className="pointer-events-none absolute bottom-3 right-3 z-[1000] hidden sm:flex flex-col gap-0.5 rounded-lg border border-emerald-900/80 bg-[#052e16]/95 px-3 py-2 text-[10.5px] text-primary-200/80 shadow-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary-300 text-[10px]">
                <Database className="size-3 text-primary-400" aria-hidden />
                Data Sources
              </div>
              <div>
                <span className="font-semibold text-white/90">Locality:</span> Barangay San Jose, Rodriguez (Montalban), Rizal
              </div>
              <div>
                <span className="font-semibold text-white/90">Data:</span> UP NOAH / LiPAD (ODC-ODbL)
              </div>
              <div className="text-[9.5px] text-primary-300/60 pt-0.5 border-t border-emerald-900/60 mt-0.5">
                Map: Leaflet · © OpenStreetMap · CARTO
              </div>
            </div>
          </div>

          {/* Mobile Docked Map Footer (seamlessly attached beneath map canvas) */}
          <div className="flex sm:hidden flex-col gap-1 border-t border-emerald-900/80 bg-[#052e16] px-3 py-2 text-[9.5px] text-emerald-200/90">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                <Database className="size-3 text-emerald-400 shrink-0" aria-hidden />
                UP NOAH / LiPAD (ODC-ODbL)
              </span>
              <span className="font-medium text-emerald-300/80 shrink-0">
                Brgy. San Jose, Rizal
              </span>
            </div>
            <div className="flex items-center justify-between text-[8.5px] text-emerald-400/60 pt-0.5 border-t border-emerald-900/40">
              <span>Map: Leaflet · © OpenStreetMap · CARTO</span>
              <span>Barangay San Jose Platform</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar (Column 2)                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-3.5 w-full lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px] lg:shrink-0">

          {/* Layers panel */}
          <div className="w-full rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
              <Layers className="size-3.5 text-primary-400" aria-hidden />
              Layers
            </p>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Map Layer Visibility</legend>
              <LayerCheckbox checked={showHazard} onChange={setShowHazard} label="Flood Hazard (5-Year)" />
              <LayerCheckbox checked={showAreas} onChange={setShowAreas} label="Area List" />
              <LayerCheckbox checked={showCenters} onChange={setShowCenters} label="Evacuation Centers" />
              <LayerCheckbox checked={showSirens} onChange={setShowSirens} label="Siren Units" />
              <LayerCheckbox checked={showHouseholds} onChange={setShowHouseholds} label="Households" />
              <LayerCheckbox checked={showFacilities} onChange={setShowFacilities} label="Other Facilities" />
            </fieldset>
          </div>

          {/* Filters panel (non-collapsible) */}
          <div className="w-full rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between h-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
                <Filter className="size-3.5 text-primary-400" aria-hidden />
                Filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setArea("all");
                  setRisk("all");
                  setSafety("all");
                  setSupport("all");
                  setCapacity("all");
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded bg-emerald-900/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800 hover:text-white transition-all shadow-2xs cursor-pointer shrink-0",
                  Boolean(
                    search ||
                    area !== "all" ||
                    risk !== "all" ||
                    safety !== "all" ||
                    support !== "all" ||
                    capacity !== "all",
                  )
                    ? "opacity-100 visible"
                    : "opacity-0 invisible pointer-events-none",
                )}
                title="Reset all filters to default"
              >
                <RotateCcw className="size-2.5" aria-hidden />
                Reset
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-2.5 left-3 size-4 text-neutral-600"
                  aria-hidden
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Household Or Member..."
                  className="h-9 w-full rounded-lg border border-neutral-300 bg-white pr-3 pl-9 text-xs font-semibold text-neutral-900 placeholder:text-neutral-500 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  aria-label="Search households"
                />
              </div>

              <CustomFilterSelect
                label="Area"
                value={area}
                onValueChange={setArea}
                options={[
                  { value: "all", label: "All Areas" },
                  ...areas.map(([id, name]) => ({ value: id, label: name })),
                ]}
              />

              <CustomFilterSelect
                label="Risk Level"
                value={risk}
                onValueChange={setRisk}
                options={[
                  { value: "all", label: "All Risk Levels" },
                  { value: "3", label: "High Risk" },
                  { value: "2", label: "Medium Risk" },
                  { value: "1", label: "Low Risk" },
                ]}
              />

              <CustomFilterSelect
                label="Safety Status"
                value={safety}
                onValueChange={setSafety}
                options={[
                  { value: "all", label: "All Safety Statuses" },
                  { value: "safe", label: "All Safe" },
                  { value: "not_safe", label: "Not Safe Yet" },
                ]}
              />

              <CustomFilterSelect
                label="Household With Special Needs"
                value={support}
                onValueChange={setSupport}
                options={[
                  { value: "all", label: "All Households" },
                  { value: "with_special_needs", label: "Household With Special Needs" },
                  { value: "without_special_needs", label: "Household Without Special Needs" },
                ]}
              />

              <CustomFilterSelect
                label="Center Capacity"
                value={capacity}
                onValueChange={setCapacity}
                options={[
                  { value: "all", label: "All Evacuation Centers" },
                  { value: "over", label: "Overloading Capacity" },
                  { value: "available", label: "With Available Space" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Three-tab household list                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="border-b border-neutral-200 bg-white">
          <div role="tablist" className="flex overflow-x-auto px-2">
            <ListTabButton
              active={listTab === "mapped"}
              onClick={() => setListTab("mapped")}
              icon={<MapPin className="size-3.5 shrink-0" aria-hidden />}
              label="Mapped Households"
              count={mappedHouseholds.length}
            />
            <ListTabButton
              active={listTab === "unmapped"}
              onClick={() => setListTab("unmapped")}
              icon={<Home className="size-3.5 shrink-0" aria-hidden />}
              label="Without Location"
              count={unmappedHouseholds.length}
            />
            <ListTabButton
              active={listTab === "walkins"}
              onClick={() => setListTab("walkins")}
              icon={<UserX className="size-3.5 shrink-0" aria-hidden />}
              label="Unregistered Persons"
              count={data.unregistered_pins.length}
            />
          </div>
        </div>

        {/* Tab panels */}
        <div className="p-4 sm:p-5">
          {listTab === "mapped" && (
            <HouseholdListPanel
              items={mappedHouseholds}
              emptyTitle="No mapped households"
              emptyDescription="No households with GPS coordinates match the current filters."
              onSelect={(h) => setSelectedHouseholdId(h.household_id)}
              readOnly={data.is_read_only}
            />
          )}
          {listTab === "unmapped" && (
            <HouseholdListPanel
              items={unmappedHouseholds}
              emptyTitle="No households without a location"
              emptyDescription="All households in the current filter have GPS pins on the map."
              onSelect={(h) => setSelectedHouseholdId(h.household_id)}
              readOnly={data.is_read_only}
            />
          )}
          {listTab === "walkins" && (
            <WalkInListPanel pins={data.unregistered_pins} />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Household detail + safety action dialog                             */}
      {/* ------------------------------------------------------------------ */}
      <HouseholdDialog
        data={data}
        household={selected}
        enriched={enrichedMap.get(selected?.household_id ?? "")}
        onClose={() => setSelectedHouseholdId(null)}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Area spatial summary dialog                                        */}
      {/* ------------------------------------------------------------------ */}
      <AreaSummaryModal
        areaName={selectedAreaName}
        data={data}
        enriched={enriched}
        areaBoundaries={areaBoundariesQuery.data?.features}
        onClose={() => setSelectedAreaName(null)}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Barangay San Jose jurisdiction overview dialog                     */}
      {/* ------------------------------------------------------------------ */}
      <BarangaySummaryModal
        open={showBarangaySummary}
        data={data}
        enriched={enriched}
        facilities={facilitiesQuery.data || []}
        sirens={sirensQuery.data || []}
        onClose={() => setShowBarangaySummary(false)}
        onSelectArea={(name) => {
          setShowBarangaySummary(false);
          setSelectedAreaName(name);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

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
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary-100/80 hover:text-white">
      <input
        type="checkbox"
        className="size-3.5 rounded accent-primary-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function CustomFilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-xs hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500">
          <SelectValue className="text-slate-900" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 bg-white text-slate-900 shadow-2xl z-[1100] max-h-60 rounded-lg">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer text-xs font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 focus:bg-emerald-50 focus:text-emerald-900"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  badge,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  sub: string;
  badge?: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const toneClasses = {
    neutral: {
      card: "bg-white border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300/90",
      iconBox: "bg-slate-100 text-slate-700",
      sub: "text-slate-500",
    },
    success: {
      card: "bg-emerald-50/50 border-emerald-200/80 text-emerald-950 shadow-2xs hover:border-emerald-300",
      iconBox: "bg-emerald-100 text-emerald-700",
      sub: "text-emerald-700 font-medium",
    },
    danger: {
      card: "bg-rose-50/70 border-rose-200 text-rose-950 shadow-2xs hover:border-rose-300",
      iconBox: "bg-rose-100 text-rose-700",
      sub: "text-rose-700 font-medium",
    },
    warning: {
      card: "bg-amber-50/40 border-amber-200/80 text-amber-950 shadow-2xs hover:border-amber-300",
      iconBox: "bg-amber-100 text-amber-800",
      sub: "text-amber-800 font-medium",
    },
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 transition-all",
        toneClasses.card,
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "grid size-7 place-items-center rounded-lg shadow-2xs shrink-0",
              toneClasses.iconBox,
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 truncate">
            {label}
          </span>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>

      <div className="mt-2 sm:mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
            {value}
          </span>
          {unit ? (
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
              {unit}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col justify-center text-right min-w-0 flex-1 pl-1">
          <span
            className={cn(
              "text-[10.5px] sm:text-[11.5px] font-semibold leading-tight line-clamp-2 text-right",
              toneClasses.sub,
            )}
          >
            {sub}
          </span>
        </div>
      </div>
    </div>
  );
}

function ListTabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-12 flex-1 min-w-[140px] items-center justify-center gap-1.5 border-b-2 px-4 text-xs font-extrabold transition-all",
        active
          ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
          : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(" ")[0]}</span>
      {count > 0 ? (
        <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] leading-none font-black text-emerald-800">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* --- Compact tooltips shown on hover with dynamic matching colors --- */

function formatVulnerabilityFlag(flag: string): string {
  const clean = flag.replace(/^is[_\s]+/i, "").toLowerCase();
  const map: Record<string, string> = {
    pwd: "PWD",
    senior: "Senior Citizen",
    senior_citizen: "Senior Citizen",
    pregnant: "Pregnant",
    infant: "Infant",
    child: "Child",
    solo_parent: "Solo Parent",
    lactating: "Lactating Mother",
    bedridden: "Bedridden",
    dialysis: "Dialysis Patient",
  };
  if (map[clean]) return map[clean];
  return clean
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CompactHouseholdTooltip({
  household,
  risk,
}: {
  household: WorkspaceHouseholdOut;
  risk: Risk;
  riskSource?: string;
}) {
  const isSafe = household.all_safe;
  const accentColor = isSafe ? "#64748B" : riskColor(risk);
  const safeTotal = household.members.filter((m) => m.status === "safe").length;
  const rescueTotal = household.members.filter((m) => m.status === "needs_rescue").length;
  const totalMembers = household.members.length;

  const specialNeeds = Array.from(
    new Set(household.members.flatMap((m) => m.vulnerability_flags || []).filter(Boolean)),
  );

  return (
    <div
      className="flex flex-col rounded-2xl bg-white/98 p-3 text-slate-900 shadow-2xl backdrop-blur-md whitespace-normal break-words"
      style={{
        border: `1.5px solid ${accentColor}`,
        boxShadow: `0 12px 30px -6px rgba(0,0,0,0.35), 0 0 16px -2px ${accentColor}40`,
        width: 275,
        maxWidth: 315,
      }}
    >
      {/* Top Header: Reference No + Risk Category Badge with bottom divider */}
      <div className="flex items-center justify-between gap-1.5 border-b border-neutral-100 pb-2">
        <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-black tracking-tight text-neutral-900 border border-neutral-200 shadow-2xs">
          {household.reference_no}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide border shadow-2xs",
            risk === 3
              ? "bg-rose-100 text-rose-800 border-rose-300"
              : risk === 2
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-emerald-100 text-emerald-800 border-emerald-300",
          )}
        >
          {riskLabel(risk)} Risk
        </span>
      </div>

      {/* Household Head & Address */}
      <div className="pt-2">
        <p className="text-[12.5px] font-black leading-snug text-neutral-950 break-words">
          {household.head_name}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-neutral-500 break-words">
          {household.street_address ? `${household.street_address}, ` : ""}{household.area_name}
        </p>
      </div>

      {/* Special Needs Section without icon */}
      {specialNeeds.length > 0 && (
        <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
            Household Special Needs
          </span>
          <div className="flex flex-wrap gap-1">
            {specialNeeds.map((need) => (
              <span
                key={need}
                className="rounded-md bg-amber-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs"
              >
                {formatVulnerabilityFlag(need)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Metrics with bolder member count */}
      <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px]">
        <span className="font-extrabold text-neutral-900">
          {totalMembers} Member{totalMembers !== 1 ? "s" : ""}
        </span>
        <span
          className={cn(
            "font-black",
            isSafe
              ? "text-emerald-700"
              : rescueTotal > 0
                ? "text-rose-700"
                : safeTotal > 0
                  ? "text-amber-700"
                  : "text-neutral-700",
          )}
        >
          {isSafe
            ? "✓ All Safe"
            : rescueTotal > 0
              ? `⚠️ ${rescueTotal} Need Rescue`
              : `${safeTotal}/${totalMembers} Safe`}
        </span>
      </div>
    </div>
  );
}

function EvacCenterTooltip({
  center,
}: {
  center: EmergencyWorkspaceOut["evacuation_centers"][number];
}) {
  const isOver = center.is_at_capacity;
  const accentColor = isOver ? "#EF4444" : "#10B981";

  return (
    <div
      className="flex flex-col rounded-2xl bg-white/98 p-3 text-slate-900 shadow-2xl backdrop-blur-md whitespace-normal break-words"
      style={{
        border: `1.5px solid ${accentColor}`,
        boxShadow: `0 12px 30px -6px rgba(0,0,0,0.35), 0 0 16px -2px ${accentColor}45`,
        width: 280,
        maxWidth: 320,
      }}
    >
      <div>
        <p className="text-[12.5px] font-black leading-snug text-neutral-950 break-words">
          {center.facility.name}
        </p>
        {center.facility.address ? (
          <p className="mt-1 text-[11px] leading-snug text-neutral-500 break-words">
            {center.facility.address}
          </p>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-neutral-600">
          <span className="font-medium text-[10.5px]">Occupancy:</span>
          <span className="font-black text-neutral-950">
            {center.occupancy} / {center.capacity ?? "—"}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-emerald-800 border border-emerald-300">
          Evacuation Center
        </span>
      </div>
    </div>
  );
}

function FacilityTooltip({ facility }: { facility: PublicFacility }) {
  const accentColor = "#0f172a"; // Slate 900 / Dark accent

  return (
    <div
      className="flex flex-col rounded-2xl bg-white/98 p-3 text-slate-900 shadow-2xl backdrop-blur-md whitespace-normal break-words"
      style={{
        border: `1.5px solid ${accentColor}`,
        boxShadow: `0 12px 30px -6px rgba(0,0,0,0.35), 0 0 16px -2px rgba(15,23,42,0.35)`,
        width: 270,
        maxWidth: 310,
      }}
    >
      <div>
        <p className="text-[12.5px] font-black leading-snug text-neutral-950 break-words">
          {facility.name}
        </p>
        {facility.address ? (
          <p className="mt-1 text-[11px] leading-snug text-neutral-500 break-words">
            {facility.address}
          </p>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 text-[11px]">
        <span className="text-[10.5px] font-medium text-neutral-500">
          Barangay Facility
        </span>
        <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-white shadow-2xs">
          {statusLabel(facility.type)}
        </span>
      </div>
    </div>
  );
}

function SirenTooltip({ siren }: { siren: PublicSiren }) {
  const isSounding = siren.status === "sounding";
  const accentColor = isSounding ? "#EF4444" : "#64748B";

  return (
    <div
      className="flex flex-col rounded-2xl bg-white/98 p-3 text-slate-900 shadow-2xl backdrop-blur-md whitespace-normal break-words"
      style={{
        border: `1.5px solid ${accentColor}`,
        boxShadow: `0 12px 30px -6px rgba(0,0,0,0.35), 0 0 16px -2px ${accentColor}35`,
        width: 250,
        maxWidth: 290,
      }}
    >
      <div>
        <p className="text-[12.5px] font-black leading-snug text-neutral-950 break-words">
          {siren.name}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 text-[11px]">
        <span className="text-[10.5px] font-medium text-neutral-500">
          Siren Unit
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide",
            isSounding
              ? "bg-rose-100 text-rose-800 border border-rose-300"
              : "bg-slate-100 text-slate-700 border border-slate-300",
          )}
        >
          {isSounding ? "Sounding Siren" : "Idle Siren"}
        </span>
      </div>
    </div>
  );
}

/* --- Household list panel (mapped / unmapped) ------------------------------ */

function HouseholdListPanel({
  items,
  emptyTitle,
  emptyDescription,
  onSelect,
  readOnly,
}: {
  items: EnrichedHousehold[];
  emptyTitle: string;
  emptyDescription: string;
  onSelect: (h: WorkspaceHouseholdOut) => void;
  readOnly: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Home className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-neutral-700">{emptyTitle}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500">
        {items.length} household{items.length !== 1 ? "s" : ""}
        {readOnly ? " · Read-only" : ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ household, risk }) => {
          const totalMembers = household.members.length;
          const safeMembers = household.members.filter((m) => m.status === "safe").length;
          return (
            <button
              key={household.household_id}
              type="button"
              onClick={() => onSelect(household)}
              className={cn(
                "group relative rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none",
                household.all_safe
                  ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                  : "border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20",
              )}
            >
              {/* Risk accent bar */}
              <div
                className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
                style={{
                  backgroundColor: household.all_safe ? "#64748B" : riskColor(risk),
                  opacity: 0.7,
                }}
                aria-hidden
              />
              <div className="pl-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-neutral-900">
                      {household.reference_no}
                    </p>
                    <p className="truncate text-[11px] text-neutral-600">
                      {household.head_name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide",
                      household.all_safe
                        ? "bg-emerald-600 text-white"
                        : safeMembers > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {household.all_safe ? "All Safe" : safeMembers > 0 ? "Partially Safe" : "Pending Check-In"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-neutral-500">
                    {household.area_name} · {totalMembers} Member{totalMembers !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10.5px] font-medium text-neutral-500">
                    {safeMembers}/{totalMembers} Confirmed Safe
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --- Walk-in / Unregistered persons list ----------------------------------- */

function WalkInListPanel({
  pins,
}: {
  pins: EmergencyWorkspaceOut["unregistered_pins"];
}) {
  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
          <UserX className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-neutral-700">No walk-ins recorded</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Unregistered persons who present at an evacuation center or field operation appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500">
        {pins.length} unregistered person{pins.length !== 1 ? "s" : ""} · Walk-in records
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pins.map((person) => {
          const needsRescue = person.status === "needs_rescue";
          const isSafe = person.status === "safe";
          return (
            <div
              key={person.id}
              className={cn(
                "relative rounded-xl border p-3 text-left",
                needsRescue
                  ? "border-rose-200 bg-rose-50/60"
                  : isSafe
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-neutral-200 bg-white",
              )}
            >
              {/* Purple accent bar for walk-ins */}
              <div
                className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-violet-500"
                style={{ opacity: 0.7 }}
                aria-hidden
              />
              <div className="pl-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="truncate text-xs font-black text-neutral-900">
                    {person.full_name}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide",
                      needsRescue
                        ? "bg-rose-600 text-white"
                        : isSafe
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    {statusLabel(person.status)}
                  </span>
                </div>
                {person.evac_center_name && (
                  <p className="mt-1 text-[10.5px] text-primary-700">
                    At {person.evac_center_name}
                  </p>
                )}
                {person.vulnerability_flags.length > 0 && (
                  <p className="mt-1 text-[10.5px] text-neutral-500">
                    {person.vulnerability_flags.map(formatVulnerabilityFlag).join(", ")}
                  </p>
                )}
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
                  Walk-in
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Household detail dialog ---------------------------------------------- */

function HouseholdDialog({
  data,
  household,
  enriched,
  onClose,
}: {
  data: EmergencyWorkspaceOut;
  household: WorkspaceHouseholdOut | null;
  enriched?: EnrichedHousehold;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [centerId, setCenterId] = React.useState("");
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [pending, setPending] = React.useState<{
    scope: "member" | "household";
    status: "safe" | "needs_rescue";
    memberIds: string[];
    title: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const activeEventsQuery = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((r) => r.data),
  });
  const activeEvents = React.useMemo(() => {
    if (activeEventsQuery.data && activeEventsQuery.data.length > 0) {
      return activeEventsQuery.data;
    }
    return data.event ? [data.event] : [];
  }, [activeEventsQuery.data, data.event]);

  const effectiveEventId = React.useMemo(() => {
    if (selectedEventId && activeEvents.some((e) => e.id === selectedEventId)) {
      return selectedEventId;
    }
    const match = activeEvents.find((e) => e.id === data.event.id);
    return match ? match.id : (activeEvents[0]?.id ?? "");
  }, [selectedEventId, activeEvents, data.event.id]);

  const mutation = useMutation({
    mutationFn: (payload: SafetyStatusAdminIn) =>
      api.post("/admin/safety-status", payload),
    onSuccess: async () => {
      toast.success(
        pending?.status === "needs_rescue"
          ? "Flagged for emergency rescue and queued in Rescue Queue"
          : "Safety status updated (Checked in as Safe)",
      );
      setConfirmOpen(false);
      setPending(null);
      setCenterId("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "emergency-workspace"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "accounted-for"],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "rescue-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "safety"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "active-emergency-events"] }),
      ]);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const base = {
    event_id: effectiveEventId || data.event.id,
    household_id: household?.household_id,
    evac_center_id: centerId || null,
  };

  const submitPending = () => {
    if (!pending) return;
    mutation.mutate(
      pending.scope === "member"
        ? {
            ...base,
            scope: "member",
            status: pending.status,
            member_ids: pending.memberIds,
          }
        : {
            ...base,
            scope: "household",
            status: pending.status,
            acknowledged_member_ids: pending.memberIds,
          },
    );
  };

  const openConfirm = (p: typeof pending) => {
    setPending(p);
    setConfirmOpen(true);
  };

  if (!household) return null;

  const risk = enriched?.risk ?? 1;
  const totalMembers = household.members.length;
  const safeMembers = household.members.filter((m) => m.status === "safe").length;
  const rescueMembers = household.members.filter((m) => m.status === "needs_rescue").length;
  const unaccountedMembers = totalMembers - safeMembers - rescueMembers;

  return (
    <>
      {/* Main detail dialog */}
      <Dialog open={household !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className={cn(
            "w-full sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl transition-all duration-200",
            confirmOpen && "filter blur-[2px] opacity-40 scale-[0.98] pointer-events-none",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-slate-100 p-5 sm:p-6 pb-4 bg-white pr-14 sm:pr-16">
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 shrink-0 place-items-center rounded-xl shadow-xs"
                style={{
                  backgroundColor: household.all_safe
                    ? "#ECFDF5"
                    : rescueMembers > 0
                      ? "#FFF1F2"
                      : `${riskColor(risk)}18`,
                  color: household.all_safe
                    ? "#059669"
                    : rescueMembers > 0
                      ? "#E11D48"
                      : riskColor(risk),
                }}
                aria-hidden
              >
                {household.all_safe ? (
                  <CheckCircle2 className="size-5" />
                ) : rescueMembers > 0 ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <Home className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base sm:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                    <span>{household.reference_no}</span>
                    {rescueMembers > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                        <AlertTriangle className="size-2.5" />
                        Needs Rescue
                      </span>
                    )}
                  </DialogTitle>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border shrink-0",
                      risk === 3
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : risk === 2
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200",
                    )}
                  >
                    {riskLabel(risk)} Flood Risk
                  </span>
                </div>
                <DialogDescription className="mt-0.5 text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">{household.area_name}</span>
                  {household.street_address && (
                    <>
                      <span>·</span>
                      <span>{household.street_address}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable member roster */}
          <div className="flex-1 overflow-y-auto sagip-modal-scroll px-5 sm:px-6 py-2">
            <div className="divide-y divide-slate-100">
              {household.members.map((member) => (
                <div
                  key={member.member_id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {member.full_name}
                      </span>
                      {member.is_head && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Head
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border",
                          member.status === "safe"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : member.status === "needs_rescue"
                              ? "bg-rose-50 text-rose-800 border-rose-200 shadow-2xs animate-pulse"
                              : "bg-amber-50 text-amber-800 border-amber-200",
                        )}
                      >
                        {member.status === "safe" ? (
                          <CheckCircle2 className="size-3 text-emerald-600" />
                        ) : member.status === "needs_rescue" ? (
                          <AlertTriangle className="size-3 text-rose-600" />
                        ) : (
                          <Users className="size-3 text-amber-600" />
                        )}
                        {statusLabel(member.status)}
                      </span>
                    </div>
                    {member.vulnerability_flags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {member.vulnerability_flags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold px-1.5 py-0.5 text-[10px] shadow-2xs"
                          >
                            {formatVulnerabilityFlag(flag)}
                          </span>
                        ))}
                      </div>
                    )}
                    {member.evac_center_name && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                        <Home className="size-3 text-emerald-600" />
                        At {member.evac_center_name}
                      </p>
                    )}
                  </div>
                  {!data.is_read_only && member.status !== "safe" && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutation.isPending}
                        className="h-7 rounded-lg px-2.5 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        onClick={() =>
                          openConfirm({
                            scope: "member",
                            status: "safe",
                            memberIds: [member.member_id],
                            title:
                              member.status === "needs_rescue"
                                ? `Mark ${member.full_name} as Rescued Successfully`
                                : `Mark ${member.full_name} Safe`,
                          })
                        }
                      >
                        <CheckCircle2 className="size-3" />
                        {member.status === "needs_rescue" ? "Rescued Successfully" : "Safe"}
                      </Button>
                      {member.status !== "needs_rescue" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          className="h-7 rounded-lg px-2.5 text-[11px] font-bold text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all cursor-pointer shadow-2xs"
                          onClick={() =>
                            openConfirm({
                              scope: "member",
                              status: "needs_rescue",
                              memberIds: [member.member_id],
                              title: `Flag ${member.full_name} — Needs Rescue`,
                            })
                          }
                        >
                          Rescue
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bulk actions footer */}
          {!data.is_read_only ? (
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Whole Household ({totalMembers} {totalMembers === 1 ? "Member" : "Members"})
                </p>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {safeMembers}/{totalMembers} Confirmed Safe
                  </span>
                  {rescueMembers > 0 && (
                    <span className="text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      {rescueMembers} Rescue
                    </span>
                  )}
                  {unaccountedMembers > 0 && (
                    <span className="text-slate-500">
                      {unaccountedMembers} Unaccounted
                    </span>
                  )}
                </div>
              </div>
              {safeMembers === totalMembers && totalMembers > 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50/90 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 shadow-2xs">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>All Household Members Are Confirmed Safe</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={mutation.isPending}
                    className="h-9.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                    onClick={() =>
                      openConfirm({
                        scope: "household",
                        status: "safe",
                        memberIds: household.members.map((m) => m.member_id),
                        title: "Mark Whole Household Safe",
                      })
                    }
                  >
                    Mark All Safe
                  </Button>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending || (rescueMembers === totalMembers && totalMembers > 0)}
                    className="h-9.5 rounded-xl text-xs font-bold text-rose-700 border-rose-300 hover:bg-rose-50 shadow-2xs cursor-pointer disabled:opacity-50"
                    onClick={() =>
                      openConfirm({
                        scope: "household",
                        status: "needs_rescue",
                        memberIds: household.members.map((m) => m.member_id),
                        title: "Flag Whole Household — Needs Rescue",
                      })
                    }
                  >
                    All Need Rescue
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="shrink-0 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 border-t border-slate-100 m-4">
              This event has ended. Safety records are read-only.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation sub-dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setConfirmOpen(false);
            setPending(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pending?.status === "needs_rescue" ? (
                <span className="flex size-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <AlertTriangle className="size-4" />
                </span>
              ) : (
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                </span>
              )}
              {pending?.title}
            </DialogTitle>
            <DialogDescription>
              {pending?.scope === "household"
                ? "Confirm the exact live roster below. If it changed since you opened this dialog, the server will reject the bulk action."
                : "Confirm this individual event-scoped safety update."}
            </DialogDescription>
          </DialogHeader>

          {pending?.status === "needs_rescue" ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-900 shadow-2xs">
              <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Emergency Rescue Flag</p>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                  This will flag the subject(s) in need of urgent assistance and dispatch an entry to the Rescue Queue for field responders.
                </p>
              </div>
            </div>
          ) : null}

          <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
            {household.members
              .filter((m) => pending?.memberIds.includes(m.member_id))
              .map((m) => (
                <div
                  key={m.member_id}
                  className="py-1 text-sm font-medium text-neutral-800 flex items-center justify-between"
                >
                  <span>
                    {m.full_name}
                    {m.is_head ? " (Head)" : ""}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500 capitalize">
                    {statusLabel(m.status)}
                  </span>
                </div>
              ))}
          </div>

          {/* Active Emergency Event Selector */}
          <div className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-700">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Siren className="size-3.5 text-emerald-600 shrink-0" />
              Active Emergency Event
              <span className="text-rose-500">*</span>
            </span>

            {activeEvents.length > 0 ? (
              <Select
                value={effectiveEventId}
                onValueChange={(val) => setSelectedEventId(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-800 shadow-2xs hover:bg-slate-50 focus-visible:ring-emerald-500">
                  <SelectValue placeholder="Select Active Emergency Event..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-2xl p-1 z-[3000]">
                  {activeEvents.map((evt) => (
                    <SelectItem
                      key={evt.id}
                      value={evt.id}
                      className="rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-bold text-slate-900">{evt.name}</span>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-300">
                          {evt.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 font-medium">
                No active emergency event is currently ongoing. Safety check-in requires an active event.
              </div>
            )}

            <span className="text-[11px] font-normal text-neutral-500 leading-tight">
              Links this check-in directly to the selected incident record for downstream response analysis and post-disaster logs.
            </span>
          </div>

          {pending?.status === "safe" ? (
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-700">
              <span className="font-medium text-neutral-600">
                Optional Evacuation Center
              </span>
              <Select
                value={centerId || "none"}
                onValueChange={(val) => setCenterId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-800 shadow-2xs hover:bg-slate-50 focus-visible:ring-emerald-500">
                  <SelectValue placeholder="No New Center Assignment" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-xl p-1 z-50">
                  <SelectItem
                    value="none"
                    className="rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    No New Center Assignment
                  </SelectItem>
                  {data.evacuation_centers
                    .filter((c) => c.is_open)
                    .map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="font-semibold text-slate-900">
                            {c.facility.name}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {c.occupancy}/{c.capacity ?? "?"}
                            {c.is_at_capacity ? " · At Capacity" : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="font-normal text-neutral-500">
                Leave blank to keep any existing physical assignment unchanged.
              </span>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setConfirmOpen(false);
                setPending(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending || activeEvents.length === 0 || !effectiveEventId}
              onClick={submitPending}
              className={
                pending?.status === "needs_rescue"
                  ? "bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              }
            >
              {mutation.isPending
                ? "Saving…"
                : pending?.status === "needs_rescue"
                  ? "Confirm Rescue Flag"
                  : pending?.title.includes("Rescued Successfully")
                    ? "Confirm Rescued Successfully"
                    : "Confirm Safe Check-In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Area Spatial Summary Modal                                                 */
/* -------------------------------------------------------------------------- */

function AreaSummaryModal({
  areaName,
  data,
  enriched,
  areaBoundaries,
  onClose,
}: {
  areaName: string | null;
  data: EmergencyWorkspaceOut;
  enriched: EnrichedHousehold[];
  areaBoundaries?: AreaBoundaryFeature[];
  onClose: () => void;
}) {
  if (!areaName) return null;

  const areaHouseholds = enriched.filter((e) => e.household.area_name === areaName);
  const areaFeature = (areaBoundaries || []).find(
    (f) => f.properties?.name?.toLowerCase() === areaName.toLowerCase(),
  );
  const areaId = areaHouseholds[0]?.household.area_id ?? areaFeature?.properties?.area_id ?? "";
  const totalHouseholds = areaHouseholds.length;
  const allMembers = areaHouseholds.flatMap((e) => e.household.members);
  const totalResidents = allMembers.length;
  const safeMembers = allMembers.filter((m) => m.status === "safe").length;
  const safePct = totalResidents > 0 ? Math.round((safeMembers / totalResidents) * 100) : 0;
  const pendingMembers = Math.max(0, totalResidents - safeMembers);
  const pendingPct = Math.max(0, 100 - safePct);

  const highRiskCount = areaHouseholds.filter((e) => e.risk === 3).length;
  const medRiskCount = areaHouseholds.filter((e) => e.risk === 2).length;
  const lowRiskCount = areaHouseholds.filter((e) => e.risk === 1).length;

  const pwdCount = allMembers.filter((m) =>
    m.vulnerability_flags.some((f) => f.toLowerCase().includes("pwd")),
  ).length;
  const seniorCount = allMembers.filter((m) =>
    m.vulnerability_flags.some((f) => f.toLowerCase().includes("senior")),
  ).length;
  const childCount = allMembers.filter((m) =>
    m.vulnerability_flags.some((f) => f.toLowerCase().includes("child") || f.toLowerCase().includes("infant")),
  ).length;
  const pregnantCount = allMembers.filter((m) =>
    m.vulnerability_flags.some((f) => f.toLowerCase().includes("pregnant")),
  ).length;
  const bedriddenCount = allMembers.filter((m) =>
    m.vulnerability_flags.some((f) => f.toLowerCase().includes("bedridden") || f.toLowerCase().includes("mobility")),
  ).length;
  const totalSpecialNeedsCount = allMembers.filter((m) => (m.vulnerability_flags || []).length > 0).length;

  // Local evacuation centers matching area
  const areaCenters = data.evacuation_centers.filter((c) => {
    if (areaId && c.facility.area_id === areaId) return true;
    if (c.facility.area_name && c.facility.area_name.toLowerCase() === areaName.toLowerCase()) return true;
    if (areaFeature?.geometry && c.facility.location?.coordinates) {
      const [lon, lat] = c.facility.location.coordinates;
      if (pointInGeometry([lon, lat], areaFeature.geometry as HazardGeometry)) {
        return true;
      }
    }
    if (
      c.facility.address?.toLowerCase().includes(areaName.toLowerCase()) ||
      c.facility.name.toLowerCase().includes(areaName.toLowerCase())
    ) {
      return true;
    }
    return false;
  });

  // Evacuation metrics in area
  const totalAreaCap = areaCenters.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
  const totalAreaOccupancy = areaCenters.reduce((acc, c) => acc + c.occupancy, 0);
  const totalAreaAvailable = Math.max(0, totalAreaCap - totalAreaOccupancy);
  const isEvacFull = totalAreaCap > 0 && totalAreaAvailable === 0;
  const isEvacLow = totalAreaCap > 0 && (totalAreaAvailable / totalAreaCap) < 0.2;

  return (
    <Dialog open={Boolean(areaName)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white pr-10 sm:pr-12">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                Area Division
              </span>
              <span className="text-xs font-semibold text-slate-500">Barangay San Jose</span>
            </div>
            <DialogTitle className="mt-1 text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
              <MapPin className="size-6 text-emerald-600 shrink-0" />
              {areaName} Spatial Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 mt-1">
            Demographic profile, real-time safety status, special needs, and emergency resources in {areaName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto sagip-modal-scroll p-5 sm:p-6 flex flex-col gap-5">
          {/* 4 KPI Summary Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Users className="size-3 text-slate-500 shrink-0" />
                Households
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-3xl font-black text-slate-950 tabular-nums leading-none shrink-0">{totalHouseholds}</span>
                <div className="flex flex-col text-[10.5px] font-medium leading-[13px] text-right text-slate-600">
                  <span>Total</span>
                  <span className="font-bold text-slate-800">{totalResidents} Citizens</span>
                </div>
              </div>
            </div>

            <div className={cn(
              "rounded-xl border p-3 flex flex-col justify-between gap-1.5 shadow-2xs",
              isEvacFull ? "border-rose-200 bg-rose-50/60" : isEvacLow ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"
            )}>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                isEvacFull ? "text-rose-800" : isEvacLow ? "text-amber-800" : "text-emerald-800"
              )}>
                <Home className={cn("size-3 shrink-0", isEvacFull ? "text-rose-700" : isEvacLow ? "text-amber-700" : "text-emerald-700")} />
                Evacuation Capacity
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-3xl font-black tabular-nums leading-none shrink-0",
                  isEvacFull ? "text-rose-900" : isEvacLow ? "text-amber-900" : "text-emerald-900"
                )}>{totalAreaCap > 0 ? totalAreaAvailable : areaCenters.length}</span>
                <div className={cn(
                  "flex flex-col text-[10.5px] font-bold leading-[13px] text-right",
                  isEvacFull ? "text-rose-700" : isEvacLow ? "text-amber-700" : "text-emerald-700"
                )}>
                  <span>{totalAreaCap > 0 ? "Available of" : `${areaCenters.length} Centers`}</span>
                  <span>{totalAreaCap > 0 ? `${totalAreaCap} Capacity` : "Open Network"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-700 shrink-0" />
                Special Needs
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-3xl font-black text-amber-900 tabular-nums leading-none shrink-0">{totalSpecialNeedsCount}</span>
                <div className="flex flex-col text-[10.5px] font-medium leading-[13px] text-right text-amber-800">
                  <span>Citizens with</span>
                  <span className="font-bold text-amber-900">Special Needs</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                <Shield className="size-3 text-rose-700 shrink-0" />
                High Flood Risk
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-3xl font-black text-rose-900 tabular-nums leading-none shrink-0">{highRiskCount}</span>
                <div className="flex flex-col text-[10.5px] font-medium leading-[13px] text-right text-rose-800">
                  <span>Of {totalHouseholds}</span>
                  <span className="font-bold text-rose-900">Households</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Status Breakdown Progress */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span>Safety Accountability Progress</span>
              <span className={cn(
                "font-bold",
                safePct < 50 ? "text-rose-600" : safePct < 80 ? "text-amber-600" : "text-emerald-700"
              )}>
                {safeMembers} / {totalResidents} Citizens Safe ({safePct}%)
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 flex">
              <div
                className="bg-emerald-600 transition-all duration-300"
                style={{ width: `${safePct}%` }}
                title={`Safe: ${safeMembers}`}
              />
              <div
                className="bg-slate-400 transition-all duration-300"
                style={{ width: `${pendingPct}%` }}
                title={`Pending: ${pendingMembers}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                <span className="size-2 rounded-full bg-emerald-600" />
                Safe: {safeMembers}
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                <span className="size-2 rounded-full bg-slate-400" />
                Pending Check-In: {pendingMembers}
              </span>
            </div>
          </div>

          {/* Two-column details: Special Needs Breakdown & Hazard Exposure */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Special Needs breakdown */}
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3.5 flex flex-col gap-2">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                Special Needs Demographics
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {seniorCount > 0 && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {seniorCount} Senior Citizen{seniorCount > 1 ? "s" : ""}
                  </span>
                )}
                {pwdCount > 0 && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {pwdCount} PWD
                  </span>
                )}
                {childCount > 0 && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {childCount} Child{childCount > 1 ? "ren" : ""}
                  </span>
                )}
                {pregnantCount > 0 && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {pregnantCount} Pregnant
                  </span>
                )}
                {bedriddenCount > 0 && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {bedriddenCount} Bedridden
                  </span>
                )}
                {totalSpecialNeedsCount === 0 && (
                  <span className="text-xs text-slate-500 italic">No special needs recorded in this area.</span>
                )}
              </div>
            </div>

            {/* Flood Hazard Exposure */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="size-3.5 text-emerald-700 shrink-0" />
                NOAH Flood Exposure
              </span>
              <div className="flex flex-col gap-1.5 mt-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <span className="size-2.5 rounded-full bg-rose-600" />
                    High Flood Risk:
                  </span>
                  <span className="font-extrabold text-slate-950">{highRiskCount} Households</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    Medium Flood Risk:
                  </span>
                  <span className="font-extrabold text-slate-950">{medRiskCount} Households</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <span className="size-2.5 rounded-full bg-emerald-600" />
                    Low Flood Risk:
                  </span>
                  <span className="font-extrabold text-slate-950">{lowRiskCount} Households</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area Resources: Evacuation Centers */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Home className="size-3.5 text-emerald-700 shrink-0" />
              Evacuation Centers ({areaCenters.length})
            </span>

            {areaCenters.length > 0 ? (
              <div className="flex flex-col gap-2">
                {areaCenters.map((center) => {
                  const cap = center.capacity ?? 0;
                  const capPct = cap > 0 ? Math.round((center.occupancy / cap) * 100) : 0;
                  return (
                    <div key={center.id} className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col gap-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-950 flex items-center gap-1.5">
                          <Home className="size-3.5 text-emerald-700" />
                          {center.facility.name}
                        </span>
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase",
                          center.is_at_capacity ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        )}>
                          {center.is_at_capacity ? "At Capacity" : cap > 0 ? `${cap - center.occupancy} Available` : "Open"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Occupancy: {center.occupancy} / {cap > 0 ? cap : "Open"} {cap > 0 ? `(${capPct}%)` : ""}</span>
                        <span className="text-slate-500 text-[10px]">{center.facility.address}</span>
                      </div>
                      {cap > 0 && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={cn("h-full", capPct > 90 ? "bg-rose-600" : "bg-emerald-600")} style={{ width: `${Math.min(capPct, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No evacuation centers registered directly inside this area.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Barangay San Jose Overview Modal                                           */
/* -------------------------------------------------------------------------- */

function BarangaySummaryModal({
  open,
  data,
  enriched,
  facilities,
  sirens,
  onClose,
  onSelectArea,
}: {
  open: boolean;
  data: EmergencyWorkspaceOut;
  enriched: EnrichedHousehold[];
  facilities: PublicFacility[];
  sirens: PublicSiren[];
  onClose: () => void;
  onSelectArea: (areaName: string) => void;
}) {
  const totalHouseholds = data.households.length;
  const allMembers = data.households.flatMap((h) => h.members);
  const totalCitizens = allMembers.length;
  const safeCitizens = allMembers.filter((m) => m.status === "safe").length;
  const safePct = totalCitizens > 0 ? Math.round((safeCitizens / totalCitizens) * 100) : 0;

  const totalCapUsed = data.evacuation_centers.reduce((acc, c) => acc + c.occupancy, 0);
  const totalCapMax = data.evacuation_centers.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
  const evacCapPct = totalCapMax > 0 ? Math.round((totalCapUsed / totalCapMax) * 100) : 0;

  // Group by Area
  const areaNames = Array.from(
    new Set(data.households.map((h) => h.area_name)),
  ).sort();

  const areaGroups = areaNames.map((areaName) => {
    const households = enriched.filter((e) => e.household.area_name === areaName);
    const members = households.flatMap((e) => e.household.members);
    const safe = members.filter((m) => m.status === "safe").length;
    const highRisk = households.filter((e) => e.risk === 3).length;
    const medRisk = households.filter((e) => e.risk === 2).length;
    return {
      areaName,
      householdCount: households.length,
      residentCount: members.length,
      safeCount: safe,
      safePct: members.length > 0 ? Math.round((safe / members.length) * 100) : 0,
      highRiskCount: highRisk,
      medRiskCount: medRisk,
    };
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white pr-10 sm:pr-12">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                Municipality of Rodriguez (Montalban), Rizal
              </span>
            </div>
            <DialogTitle className="mt-1 text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
              <Shield className="size-6 text-emerald-600 shrink-0" />
              Barangay San Jose Comprehensive Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 mt-1">
            Barangay-wide jurisdiction overview, emergency readiness, area breakdown, and aggregate evacuation capacity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto sagip-modal-scroll p-5 sm:p-6 flex flex-col gap-5">
          {/* 4 Executive Jurisdiction KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Users className="size-3 text-slate-500 shrink-0" />
                Total Population
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-3xl font-black text-slate-950 tabular-nums leading-none shrink-0">{totalCitizens}</span>
                <div className="flex flex-col text-[10.5px] font-medium leading-[13px] text-right text-slate-600">
                  <span className="font-bold text-slate-800">{totalHouseholds} Households</span>
                  <span>(6 Areas)</span>
                </div>
              </div>
            </div>

            <div className={cn(
              "rounded-xl border p-3.5 flex flex-col justify-between gap-1.5 shadow-2xs",
              safePct < 50 ? "border-rose-200 bg-rose-50/60" : safePct < 80 ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"
            )}>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                safePct < 50 ? "text-rose-800" : safePct < 80 ? "text-amber-800" : "text-emerald-800"
              )}>
                <CheckCircle2 className={cn("size-3 shrink-0", safePct < 50 ? "text-rose-700" : safePct < 80 ? "text-amber-700" : "text-emerald-700")} />
                Accounted For
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-3xl font-black tabular-nums leading-none shrink-0",
                  safePct < 50 ? "text-rose-900" : safePct < 80 ? "text-amber-900" : "text-emerald-900"
                )}>{safePct}%</span>
                <div className={cn(
                  "flex flex-col text-[10.5px] font-bold leading-[13px] text-right",
                  safePct < 50 ? "text-rose-700" : safePct < 80 ? "text-amber-700" : "text-emerald-700"
                )}>
                  <span>{safeCitizens} Citizens</span>
                  <span>Confirmed Safe</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Home className="size-3 text-emerald-700 shrink-0" />
                Evacuation Network
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-900 tabular-nums leading-none shrink-0">{totalCapUsed}/{totalCapMax}</span>
                <div className="flex flex-col text-[10.5px] font-bold leading-[13px] text-right text-emerald-700">
                  <span>{data.evacuation_centers.length} Centers</span>
                  <span>({evacCapPct}% Full)</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Siren className="size-3 text-slate-600 shrink-0" />
                Alert & Civic Grid
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-3xl font-black text-slate-950 tabular-nums leading-none shrink-0">{sirens.length}</span>
                <div className="flex flex-col text-[10.5px] font-medium leading-[13px] text-right text-slate-600">
                  <span className="font-bold text-slate-800">Sirens</span>
                  <span>{facilities.length} Facilities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area Comparison Matrix */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Area Divisions Breakdown (Areas 1–6)
              </span>
              <span className="text-[11px] text-slate-500">Area-level summary & hazard exposure</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3">Households</th>
                    <th className="py-2.5 px-3">Population</th>
                    <th className="py-2.5 px-3">Safe %</th>
                    <th className="py-2.5 px-3">High Risk</th>
                    <th className="py-2.5 px-3">Medium Risk</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {areaGroups.map((row) => (
                    <tr
                      key={row.areaName}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-950 flex items-center gap-1.5">
                        <MapPin className="size-3 text-emerald-600" />
                        {row.areaName}
                      </td>
                      <td className="py-2.5 px-3">{row.householdCount}</td>
                      <td className="py-2.5 px-3">{row.residentCount}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn(
                          "font-bold",
                          row.safePct >= 80 ? "text-emerald-700" : row.safePct >= 50 ? "text-amber-700" : "text-rose-700"
                        )}>
                          {row.safePct}% ({row.safeCount})
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {row.highRiskCount > 0 ? (
                          <span className="rounded-md bg-rose-100 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            {row.highRiskCount} High
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.medRiskCount > 0 ? (
                          <span className="rounded-md bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {row.medRiskCount} Med
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 px-2.5 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 ml-auto cursor-pointer"
                          onClick={() => {
                            onClose();
                            onSelectArea(row.areaName);
                          }}
                        >
                          View Area
                          <ArrowRight className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
