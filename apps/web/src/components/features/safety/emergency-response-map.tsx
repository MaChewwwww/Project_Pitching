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
  const width = 24;
  const height = 30;

  return L.divIcon({
    className: "evac-center-pin-icon",
    html: `
      <div class="transition-transform hover:scale-110 cursor-pointer" style="width:${width}px; height:${height}px;">
        <svg width="${width}" height="${height}" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.55));">
          <path d="M12 0.75C5.787 0.75 0.75 5.787 0.75 12C0.75 18.5 10.5 28.75 12 29.25C13.5 28.75 23.25 18.5 23.25 12C23.25 5.787 18.213 0.75 12 0.75Z" fill="${bgColor}" stroke="#FFFFFF" stroke-width="1.5"/>
          <path d="M12 5.5L5.5 11H8V17H16V11H18.5L12 5.5Z" fill="#FFFFFF"/>
          <rect x="10.5" y="13" width="3" height="4" rx="0.5" fill="${bgColor}"/>
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

/* -------------------------------------------------------------------------- */
/* Inline CSS injected into the map DOM                                        */
/* -------------------------------------------------------------------------- */

const ADMIN_MAP_CSS = `
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
  max-width: 280px;
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
  const [showFacilities, setShowFacilities] = React.useState(false);

  /* --- UI state --- */
  const [selected, setSelected] = React.useState<WorkspaceHouseholdOut | null>(null);
  const [listTab, setListTab] = React.useState<ListTab>("mapped");
  const [filtersExpanded, setFiltersExpanded] = React.useState(true);

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
      (safety === "rescue" && household.needs_rescue_count > 0) ||
      (safety === "unaccounted" && household.unaccounted_count > 0);
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

        {/* Map canvas */}
        <div className="admin-emergency-map relative h-[500px] sm:h-[580px] lg:h-[680px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
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
          </MapContainer>

          {/* Top-left full Legend card inside the map */}
          <div
            aria-label="Map legend"
            className="absolute top-3.5 left-3.5 z-[1000] w-64 max-w-[calc(100%-6rem)] rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-3 text-white shadow-2xl backdrop-blur-md transition-all"
          >
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Shield className="size-3.5 text-emerald-400" aria-hidden />
              Legend
            </p>
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
                        <svg width="12" height="15" viewBox="0 0 24 30" fill="none">
                          <path d="M12 0.75C5.787 0.75 0.75 5.787 0.75 12C0.75 18.5 10.5 28.75 12 29.25C13.5 28.75 23.25 18.5 23.25 12C23.25 5.787 18.213 0.75 12 0.75Z" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5"/>
                          <path d="M12 5.5L5.5 11H8V17H16V11H18.5L12 5.5Z" fill="#FFFFFF"/>
                          <rect x="10.5" y="13" width="3" height="4" rx="0.5" fill="#059669"/>
                        </svg>
                      </span>
                      <span className="text-emerald-100/90">Available Capacity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="flex shrink-0 items-center justify-center">
                        <svg width="12" height="15" viewBox="0 0 24 30" fill="none">
                          <path d="M12 0.75C5.787 0.75 0.75 5.787 0.75 12C0.75 18.5 10.5 28.75 12 29.25C13.5 28.75 23.25 18.5 23.25 12C23.25 5.787 18.213 0.75 12 0.75Z" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5"/>
                          <path d="M12 5.5L5.5 11H8V17H16V11H18.5L12 5.5Z" fill="#FFFFFF"/>
                          <rect x="10.5" y="13" width="3" height="4" rx="0.5" fill="#DC2626"/>
                        </svg>
                      </span>
                      <span className="text-emerald-100/90">At / Over Capacity</span>
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
          </div>

          {/* Bottom-right Data Sources citation overlay */}
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
              <LayerCheckbox checked={showCenters} onChange={setShowCenters} label="Evacuation Facilities" />
              <LayerCheckbox checked={showHouseholds} onChange={setShowHouseholds} label="Households" />
              <LayerCheckbox checked={showFacilities} onChange={setShowFacilities} label="Other Facilities" />
            </fieldset>
          </div>

          {/* Filters panel matching dark emerald card style */}
          <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 text-white shadow-xl backdrop-blur-md overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-primary-900/40 transition-colors"
              aria-expanded={filtersExpanded}
            >
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
                <Filter className="size-3.5 text-primary-400" aria-hidden />
                Filters
              </p>
              <ChevronDown
                className={cn(
                  "size-4 text-primary-400 transition-transform duration-200",
                  filtersExpanded && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {filtersExpanded && (
              <div className="px-4 pb-4 flex flex-col gap-3.5 border-t border-primary-800/60 pt-3">
                {/* Search */}
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 size-4 text-primary-400"
                    aria-hidden
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Household, Head, Or Member..."
                    className="h-9 w-full rounded-lg border border-primary-700/60 bg-primary-900/60 pr-3 pl-9 text-xs text-white placeholder:text-primary-300/40 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
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
                    { value: "rescue", label: "Needs Rescue" },
                    { value: "unaccounted", label: "Unaccounted" },
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
                    { value: "over", label: "At / Over Capacity" },
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
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline pt-1 text-left"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-300/80">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8.5 w-full rounded-lg border border-primary-700/60 bg-primary-900/60 px-2.5 text-xs font-medium text-white shadow-inner hover:bg-primary-900/80 focus-visible:ring-emerald-400">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-primary-800 bg-primary-950 text-white shadow-2xl z-[1100] max-h-60">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer text-xs text-primary-100 hover:bg-primary-900 focus:bg-primary-900 focus:text-emerald-300"
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

function CompactHouseholdTooltip({
  household,
  risk,
}: {
  household: WorkspaceHouseholdOut;
  risk: Risk;
  riskSource?: string;
}) {
  const isSafe = household.all_safe;
  const color = isSafe ? "#64748B" : riskColor(risk);
  const safeTotal = household.members.filter((m) => m.status === "safe").length;
  const totalMembers = household.members.length;

  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-2.5 text-white shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: "#090d16fa",
        border: `1.5px solid ${color}`,
        boxShadow: `0 10px 25px -5px rgba(0,0,0,0.7), 0 0 12px -2px ${color}55`,
        minWidth: 170,
        maxWidth: 240,
      }}
    >
      <div
        className="flex items-center justify-between gap-1.5 border-b pb-1.5"
        style={{ borderColor: `${color}40` }}
      >
        <span className="truncate text-xs font-black text-white">{household.reference_no}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {isSafe ? "All Safe" : `${riskLabel(risk)} Risk`}
        </span>
      </div>
      <div className="pt-0.5">
        <p className="truncate text-[11px] font-bold text-slate-200">{household.head_name}</p>
        <p className="truncate text-[10px] text-slate-400">{household.area_name}</p>
      </div>
      <div
        className="mt-0.5 flex items-center justify-between border-t pt-1.5 text-[10px]"
        style={{ borderColor: `${color}30` }}
      >
        <span className="text-slate-400">{totalMembers} Member{totalMembers !== 1 ? "s" : ""}</span>
        <span className="font-bold" style={{ color: isSafe ? "#86efac" : "#f1f5f9" }}>
          {isSafe ? "✓ All Safe" : `${safeTotal}/${totalMembers} Confirmed Safe`}
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
  const color = isOver ? "#DC2626" : "#059669";

  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-2.5 text-white shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: "#090d16fa",
        border: `1.5px solid ${color}`,
        boxShadow: `0 10px 25px -5px rgba(0,0,0,0.7), 0 0 12px -2px ${color}55`,
        minWidth: 180,
        maxWidth: 260,
      }}
    >
      <div
        className="flex items-center justify-between gap-1.5 border-b pb-1.5"
        style={{ borderColor: `${color}40` }}
      >
        <span className="truncate text-xs font-black text-white">{center.facility.name}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {isOver ? "At Capacity" : "Available"}
        </span>
      </div>
      <div className="pt-0.5 text-[10.5px]">
        <span className="text-slate-400">Occupancy: </span>
        <span className="font-bold text-white">
          {center.occupancy} / {center.capacity ?? "—"}
        </span>
      </div>
      {center.facility.address ? (
        <p className="truncate text-[10px] text-slate-400">{center.facility.address}</p>
      ) : null}
    </div>
  );
}

function FacilityTooltip({ facility }: { facility: PublicFacility }) {
  const color = "#38BDF8"; // Sky Blue
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-2.5 text-white shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: "#090d16fa",
        border: `1.5px solid ${color}`,
        boxShadow: `0 10px 25px -5px rgba(0,0,0,0.7), 0 0 12px -2px ${color}55`,
        minWidth: 160,
        maxWidth: 240,
      }}
    >
      <div
        className="flex items-center justify-between gap-1.5 border-b pb-1.5"
        style={{ borderColor: `${color}40` }}
      >
        <span className="truncate text-xs font-black text-white">{facility.name}</span>
      </div>
      <p className="pt-0.5 text-[10.5px] font-semibold" style={{ color }}>
        {statusLabel(facility.type)}
      </p>
      {facility.address ? (
        <p className="truncate text-[10px] text-slate-400">{facility.address}</p>
      ) : null}
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
                    {person.vulnerability_flags.map(statusLabel).join(", ")}
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
                        {member.vulnerability_flags.map(statusLabel).join(", ")}
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
