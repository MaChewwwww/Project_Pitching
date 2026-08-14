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
  CheckCircle2,
  ChevronDown,
  Database,
  Filter,
  Home,
  Layers,
  MapPin,
  Search,
  Shield,
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
import { hazardLevelForPoint, useHazardGeoJson } from "@/lib/hazard-geojson";
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
import type { AreaBoundaryFeature, PublicFacility } from "@/lib/api/public-types";
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
    html: `<div class="bg-white text-slate-900 border border-slate-300 shadow-md px-3 py-1 rounded-md font-bold text-[11px] whitespace-nowrap flex items-center justify-center">Barangay San Jose Boundary</div>`,
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
  const [selected, setSelected] = React.useState<WorkspaceHouseholdOut | null>(null);
  const [listTab, setListTab] = React.useState<ListTab>("mapped");
  const [legendExpanded, setLegendExpanded] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setLegendExpanded(false);
    }
  }, []);

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
    const matchesSupport =
      support === "all" ||
      household.members.some((m) => m.vulnerability_flags.includes(support));
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
  const safeCount = filtered.filter((e) => e.household.all_safe).length;

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
        <SidebarStat
          icon={Users}
          label="In Scope"
          value={filtered.length}
          sub={`${data.households.length} Total`}
          tone="neutral"
        />
        <SidebarStat
          icon={MapPin}
          label="Mapped"
          value={mappedHouseholds.length}
          sub={`${unmappedHouseholds.length} Without Pin`}
          tone="neutral"
        />
        <SidebarStat
          icon={CheckCircle2}
          label="All Safe"
          value={safeCount}
          sub={
            filtered.length > 0
              ? `${((safeCount / filtered.length) * 100).toFixed(0)}% Of Scope`
              : "—"
          }
          tone="success"
        />
        <SidebarStat
          icon={Users}
          label="Pending Check-In"
          value={filtered.length - safeCount}
          sub={
            filtered.length > 0
              ? `${(((filtered.length - safeCount) / filtered.length) * 100).toFixed(0)}% Pending`
              : "—"
          }
          tone="neutral"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column: map (col 1) + sidebar (col 2)                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">

        {/* Column 1: Map canvas + mobile outside footer */}
        <div className="flex flex-1 flex-col gap-2.5 min-w-0">
          {/* Map canvas */}
          <div className="admin-emergency-map relative h-[480px] sm:h-[580px] lg:h-[680px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
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
            <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />

            {/* Flood hazard overlay */}
            {showHazard && hazard.status === "ready" ? (
              <GeoJSON
                key="hazard"
                data={hazard.data as GeoJSON.GeoJsonObject}
                style={(feature) => hazardStyle(Number(feature?.properties?.Var ?? 0))}
              />
            ) : null}

            {/* Area divisions (Areas 1–6) */}
            {showAreas && areaBoundariesQuery.data ? (
              <GeoJSON
                key="areas-boundaries"
                data={areaBoundariesQuery.data as GeoJSON.GeoJsonObject}
                style={(feature) =>
                  distinctAreaStyle(
                    (feature?.properties as { name?: string })?.name ?? "",
                  )
                }
              />
            ) : null}

            {/* San Jose boundary */}
            <GeoJSON
              data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
              interactive={false}
              pane="topBoundaryPane"
              style={() => BOUNDARY_LINE_STYLE}
            />
            <Marker
              position={[14.7615, 121.133]}
              icon={createBoundaryLabelIcon()}
              interactive={false}
              pane="topBoundaryPane"
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
                      click: () => setSelected(household),
                      add: (event) =>
                        makeKeyboardReachable(event.target, () => setSelected(household)),
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
                ? "w-64 max-w-[calc(100%-6rem)] max-h-[calc(100%-2rem)] overflow-y-auto p-3"
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

              {/* Other Public Facilities */}
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

          {/* Mobile outside Map Footer (docked below the map canvas) */}
          <div className="flex sm:hidden flex-col gap-1 rounded-xl border border-primary-800/60 bg-primary-950/95 p-3 text-[10px] text-primary-200/90 shadow-lg">
            <div className="flex items-center justify-between font-bold uppercase tracking-wider text-primary-300 text-[9.5px]">
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3 text-primary-400" aria-hidden />
                Data Sources & Attributions
              </span>
              <span className="font-medium normal-case text-primary-300/80">
                Brgy. San Jose, Rizal
              </span>
            </div>
            <div className="text-[10px] text-white/90">
              <span className="font-semibold text-primary-300">Data:</span> UP NOAH / LiPAD (ODC-ODbL)
            </div>
            <div className="text-[9px] text-primary-300/60 pt-1 border-t border-primary-800/60 mt-0.5">
              Map: Leaflet · © OpenStreetMap · CARTO
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar (Column 2)                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-3 lg:w-72 lg:shrink-0">

          {/* Layers panel */}
          <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
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
          <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
              <Filter className="size-3.5 text-primary-400" aria-hidden />
              Filters
            </p>
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
                label="Special Needs"
                value={support}
                onValueChange={setSupport}
                options={[
                  { value: "all", label: "All Support Needs" },
                  { value: "is_child", label: "Children (Under 18)" },
                  { value: "is_senior", label: "Senior Citizens (60+)" },
                  { value: "is_pwd", label: "Persons With Disabilities (PWD)" },
                  { value: "is_pregnant", label: "Pregnant" },
                  { value: "is_lactating", label: "Lactating" },
                  { value: "is_bedridden", label: "Mobility-Limited / Bedridden" },
                  { value: "has_chronic_condition", label: "Chronic Health Condition" },
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

              {(search ||
                area !== "all" ||
                risk !== "all" ||
                safety !== "all" ||
                support !== "all" ||
                capacity !== "all") && (
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
                  className="text-xs font-bold text-emerald-300 hover:text-white hover:underline pt-1 text-left"
                >
                  Clear All Filters
                </button>
              )}
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
              onSelect={(h) => setSelected(h)}
              readOnly={data.is_read_only}
            />
          )}
          {listTab === "unmapped" && (
            <HouseholdListPanel
              items={unmappedHouseholds}
              emptyTitle="No households without a location"
              emptyDescription="All households in the current filter have GPS pins on the map."
              onSelect={(h) => setSelected(h)}
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
        onClose={() => setSelected(null)}
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

function SidebarStat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub: string;
  tone: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
      : tone === "danger"
        ? "text-rose-700 bg-rose-50 border-rose-200/80"
        : "text-neutral-700 bg-white border-neutral-200/80";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-3 shadow-2xs transition-colors",
        toneClass,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="text-[10.5px] font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <span className="text-2xl font-black leading-none tabular-nums">{value}</span>
      <span className="text-[10.5px] font-medium opacity-60">{sub}</span>
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
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-xs font-black text-neutral-900 tracking-tight">
          {household.reference_no}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide",
            isSafe
              ? "bg-slate-100 text-slate-700 border border-slate-300"
              : risk === 3
                ? "bg-rose-100 text-rose-800 border border-rose-300"
                : risk === 2
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300",
          )}
        >
          {isSafe ? "All Safe" : `${riskLabel(risk)} Risk`}
        </span>
      </div>

      <div className="mt-1">
        <p className="text-[12.5px] font-black leading-snug text-neutral-950 break-words">
          {household.head_name}
        </p>
        <p className="text-[11px] leading-tight text-neutral-500 break-words">
          {household.street_address ? `${household.street_address}, ` : ""}{household.area_name}
        </p>
      </div>

      {specialNeeds.length > 0 && (
        <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
            <AlertTriangle className="size-3 text-amber-600 shrink-0" aria-hidden />
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

      <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px]">
        <span className="text-neutral-500 font-medium">
          {totalMembers} Member{totalMembers !== 1 ? "s" : ""}
        </span>
        <span
          className={cn(
            "font-black",
            isSafe
              ? "text-emerald-700"
              : safeTotal > 0
                ? "text-amber-700"
                : "text-neutral-700",
          )}
        >
          {isSafe
            ? "✓ All Safe"
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
          const needsRescue = household.needs_rescue_count > 0;
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
  const [pending, setPending] = React.useState<{
    scope: "member" | "household";
    status: "safe" | "needs_rescue";
    memberIds: string[];
    title: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const mutation = useMutation({
    mutationFn: (payload: SafetyStatusAdminIn) =>
      api.post("/admin/safety-status", payload),
    onSuccess: async () => {
      toast.success("Safety status updated");
      setConfirmOpen(false);
      setPending(null);
      setCenterId("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "emergency-workspace", data.event.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "accounted-for", data.event.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "safety"] }),
      ]);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const base = {
    event_id: data.event.id,
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
  const riskSource = enriched?.riskSource ?? "Household survey fallback";
  const totalMembers = household.members.length;
  const safeMembers = household.members.filter((m) => m.status === "safe").length;

  return (
    <>
      {/* Main detail dialog */}
      <Dialog open={household !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-neutral-100 pb-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl shadow-sm"
                style={{
                  backgroundColor: household.all_safe ? "#F1F5F9" : `${riskColor(risk)}22`,
                  color: household.all_safe ? "#6B7280" : riskColor(risk),
                }}
                aria-hidden
              >
                <Home className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-black text-neutral-900">
                  {household.reference_no} · {household.head_name}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-neutral-500">
                  {household.area_name}
                  {household.street_address ? ` · ${household.street_address}` : ""}
                </DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
                    style={{
                      backgroundColor: `${riskColor(risk)}22`,
                      color: riskColor(risk),
                    }}
                  >
                    {riskLabel(risk)} Flood Risk
                  </span>
                  <span className="text-[10px] text-neutral-400">{riskSource}</span>
                  <span className="text-[10px] font-medium text-neutral-500">
                    {safeMembers}/{totalMembers} confirmed safe
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable member roster */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-neutral-100">
              {household.members.map((member) => (
                <div key={member.member_id} className="flex flex-col gap-2 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900">
                        {member.full_name}
                        {member.is_head ? (
                          <span className="ml-1 text-[10px] font-bold text-neutral-400">(Head)</span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
                          member.status === "safe"
                            ? "bg-emerald-100 text-emerald-800"
                            : member.status === "needs_rescue"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {statusLabel(member.status)}
                      </span>
                    </div>
                    {member.vulnerability_flags.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {member.vulnerability_flags.map(formatVulnerabilityFlag).join(", ")}
                      </p>
                    )}
                    {member.evac_center_name && (
                      <p className="mt-0.5 text-[11px] text-primary-700">
                        At {member.evac_center_name}
                      </p>
                    )}
                  </div>
                  {!data.is_read_only && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutation.isPending}
                        className="h-7 rounded-full px-2.5 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                        onClick={() =>
                          openConfirm({
                            scope: "member",
                            status: "safe",
                            memberIds: [member.member_id],
                            title: `Mark ${member.full_name} safe`,
                          })
                        }
                      >
                        Safe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutation.isPending}
                        className="h-7 rounded-full px-2.5 text-[11px] font-bold text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-400"
                        onClick={() =>
                          openConfirm({
                            scope: "member",
                            status: "needs_rescue",
                            memberIds: [member.member_id],
                            title: `Flag ${member.full_name} — needs rescue`,
                          })
                        }
                      >
                        Rescue
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bulk actions footer */}
          {!data.is_read_only ? (
            <div className="shrink-0 border-t border-neutral-100 pt-4 flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Whole household
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={mutation.isPending}
                  className="h-9 rounded-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() =>
                    openConfirm({
                      scope: "household",
                      status: "safe",
                      memberIds: household.members.map((m) => m.member_id),
                      title: "Mark the whole household safe",
                    })
                  }
                >
                  Mark all safe
                </Button>
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  className="h-9 rounded-full text-sm font-bold text-rose-700 border-rose-200 hover:bg-rose-50"
                  onClick={() =>
                    openConfirm({
                      scope: "household",
                      status: "needs_rescue",
                      memberIds: household.members.map((m) => m.member_id),
                      title: "Flag the whole household — needs rescue",
                    })
                  }
                >
                  All need rescue
                </Button>
              </div>
            </div>
          ) : (
            <p className="shrink-0 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600 border-t border-neutral-100 mt-2">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            <DialogDescription>
              {pending?.scope === "household"
                ? "Confirm the exact live roster below. If it changed since you opened this dialog, the server will reject the bulk action."
                : "Confirm this individual event-scoped safety update."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
            {household.members
              .filter((m) => pending?.memberIds.includes(m.member_id))
              .map((m) => (
                <div key={m.member_id} className="py-1 text-sm text-neutral-800">
                  {m.full_name}
                  {m.is_head ? " (head)" : ""}
                </div>
              ))}
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Optional evacuation center
            <select
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="focus-visible:ring-primary-500 min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">No new center assignment</option>
              {data.evacuation_centers
                .filter((c) => c.is_open)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.facility.name} · {c.occupancy}/{c.capacity ?? "?"}
                    {c.is_at_capacity ? " · at capacity" : ""}
                  </option>
                ))}
            </select>
            <span className="font-normal text-neutral-500">
              Leave blank to keep any existing physical assignment unchanged.
            </span>
          </label>
          <DialogFooter>
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
            <Button disabled={mutation.isPending} onClick={submitPending}>
              {mutation.isPending ? "Saving…" : "Confirm update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
