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
} from "react-leaflet";
import L from "leaflet";
import type { Layer } from "leaflet";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
import { hazardLevelForPoint, useHazardGeoJson } from "@/lib/hazard-geojson";
import type {
  EmergencyWorkspaceOut,
  WorkspaceHouseholdOut,
} from "@/lib/api/safety-types";
import {
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  HAZARD_LEVELS,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import { api, toDisplayError } from "@/lib/api/client";
import type { SafetyStatusAdminIn } from "@/lib/api/safety-types";
import type { PublicFacility } from "@/lib/api/public-types";
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
  return risk === 3 ? "#EF4444" : risk === 2 ? "#F59E0B" : "#FFED4A";
}

function riskLabel(risk: Risk) {
  return risk === 3 ? "High" : risk === 2 ? "Medium" : "Low";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
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
    if (!map.getPane("topMarkerPane")) {
      const pane = map.createPane("topMarkerPane");
      pane.style.zIndex = "670";
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "750";
  }, [map]);
  return null;
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
.admin-emergency-map .leaflet-tooltip {
  background: #052e16;
  color: #f8fafc;
  border: 1px solid #166534;
  border-radius: 0.5rem;
  padding: 8px 10px;
  font-size: 11.5px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
  max-width: 240px;
  pointer-events: none;
}
.admin-emergency-map .leaflet-tooltip-top::before {
  border-top-color: #166534;
}
.admin-emergency-map .leaflet-control-attribution {
  display: none;
}
.admin-emergency-map .leaflet-control-zoom {
  border: 1px solid rgba(74,222,128,0.25) !important;
  border-radius: 8px !important;
  overflow: hidden;
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
  const [showHouseholds, setShowHouseholds] = React.useState(true);
  const [showCenters, setShowCenters] = React.useState(true);
  const [showFacilities, setShowFacilities] = React.useState(false);
  const [showWalkIns, setShowWalkIns] = React.useState(false);

  /* --- UI state --- */
  const [selected, setSelected] = React.useState<WorkspaceHouseholdOut | null>(null);
  const [listTab, setListTab] = React.useState<ListTab>("mapped");
  const [filtersExpanded, setFiltersExpanded] = React.useState(true);

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
  const rescueCount = filtered.filter((e) => e.household.needs_rescue_count > 0).length;
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
      {/* Two-column: map + sidebar                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">

        {/* Map canvas */}
        <div className="admin-emergency-map relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <style>{ADMIN_MAP_CSS}</style>
          <MapContainer
            center={[14.7415, 121.1315]}
            zoom={14}
            className="h-[480px] min-h-[380px] w-full lg:h-[580px]"
            scrollWheelZoom
            minZoom={11}
            maxZoom={18}
            attributionControl={false}
          >
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

            {/* Household pins — topMarkerPane keeps them above hazard fills */}
            {showHouseholds &&
              filtered.map(({ household, risk: riskLevel, riskSource }) => {
                if (!household.location) return null;
                const [longitude, latitude] = household.location.coordinates;
                const needsRescue = household.needs_rescue_count > 0;
                const safeColor = "#6B7280";
                return (
                  <CircleMarker
                    key={household.household_id}
                    center={[latitude, longitude]}
                    radius={needsRescue ? 10 : 8}
                    pane="topMarkerPane"
                    pathOptions={{
                      fillColor: household.all_safe ? safeColor : riskColor(riskLevel),
                      fillOpacity: 0.95,
                      color: needsRescue ? "#111827" : "#ffffff",
                      weight: needsRescue ? 4 : 2,
                      dashArray: needsRescue ? "3 2" : undefined,
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

            {/* Evacuation center pins */}
            {showCenters
              ? visibleCenters.map((center) => {
                  const point = center.facility.location?.coordinates;
                  if (!point) return null;
                  return (
                    <CircleMarker
                      key={center.id}
                      center={[point[1], point[0]]}
                      radius={9}
                      pane="topMarkerPane"
                      pathOptions={{
                        color: "#075985",
                        fillColor: center.is_at_capacity ? "#EF4444" : "#0EA5E9",
                        fillOpacity: 0.9,
                        weight: 3,
                      }}
                    >
                      <Tooltip direction="top" opacity={1}>
                        <b>{center.facility.name}</b>
                        <br />
                        <span>
                          {center.occupancy}/{center.capacity ?? "?"} occupants
                          {center.is_at_capacity ? " · At capacity" : ""}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  );
                })
              : null}

            {/* Pinned walk-ins */}
            {showWalkIns
              ? data.unregistered_pins.map((person) => (
                  <CircleMarker
                    key={person.id}
                    center={[
                      person.location.coordinates[1],
                      person.location.coordinates[0],
                    ]}
                    radius={6}
                    pane="topMarkerPane"
                    pathOptions={{
                      color: "#7C3AED",
                      fillColor: "#C4B5FD",
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Tooltip direction="top" opacity={1}>
                      <b>{person.full_name}</b>
                      <br />
                      <span className="capitalize">{statusLabel(person.status)}</span>
                      {person.evac_center_name ? (
                        <>
                          <br />
                          <span>{person.evac_center_name}</span>
                        </>
                      ) : null}
                    </Tooltip>
                  </CircleMarker>
                ))
              : null}

            {/* Other public facilities */}
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
                        radius={5}
                        pane="topMarkerPane"
                        pathOptions={{
                          color: "#166534",
                          fillColor: "#86EFAC",
                          fillOpacity: 1,
                          weight: 2,
                        }}
                      >
                        <Tooltip direction="top" opacity={1}>
                          <b>{facility.name}</b>
                          <br />
                          <span className="capitalize">{statusLabel(facility.type)}</span>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })
              : null}
          </MapContainer>

          {/* Floating legend overlay */}
          <div
            aria-label="Map legend"
            className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-900/80 bg-[#052e16]/95 px-3 py-2 text-[11px] font-medium text-slate-100 shadow-xl backdrop-blur-sm"
          >
            <span className="font-bold text-white/90">Households</span>
            <LegendDot color="#FFED4A" label="Low risk" />
            <LegendDot color="#F59E0B" label="Medium" />
            <LegendDot color="#EF4444" label="High risk" />
            <LegendDot color="#6B7280" label="All safe" />
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2 border-white bg-transparent" />
              Rescue
            </span>
            {showCenters && (
              <>
                <span className="text-white/40">·</span>
                <LegendDot color="#0EA5E9" label="Evac center" />
              </>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-3 lg:w-80 lg:shrink-0">

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <SidebarStat
              icon={Users}
              label="In Scope"
              value={filtered.length}
              sub={`${data.households.length} total`}
              tone="neutral"
            />
            <SidebarStat
              icon={MapPin}
              label="Mapped"
              value={mappedHouseholds.length}
              sub={`${unmappedHouseholds.length} without pin`}
              tone="neutral"
            />
            <SidebarStat
              icon={CheckCircle2}
              label="All Safe"
              value={safeCount}
              sub={
                filtered.length > 0
                  ? `${((safeCount / filtered.length) * 100).toFixed(0)}% of scope`
                  : "—"
              }
              tone="success"
            />
            <SidebarStat
              icon={AlertTriangle}
              label="Rescue Needed"
              value={rescueCount}
              sub={rescueCount > 0 ? "Requires action" : "Zero distress"}
              tone={rescueCount > 0 ? "danger" : "neutral"}
            />
          </div>

          {/* Layers panel */}
          <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
              <Layers className="size-3.5 text-primary-400" aria-hidden />
              Layers
            </p>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Map layer visibility</legend>
              <LayerCheckbox checked={showHazard} onChange={setShowHazard} label="Flood hazard (NOAH)" />
              <LayerCheckbox checked={showHouseholds} onChange={setShowHouseholds} label="Households" />
              <LayerCheckbox checked={showCenters} onChange={setShowCenters} label="Evacuation facilities" />
              <LayerCheckbox checked={showFacilities} onChange={setShowFacilities} label="Other facilities" />
              <LayerCheckbox checked={showWalkIns} onChange={setShowWalkIns} label="Pinned walk-ins" />
            </fieldset>
          </div>

          {/* Legend panel */}
          <div className="rounded-xl border border-primary-800/60 bg-primary-950/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400">
              <Shield className="size-3.5 text-primary-400" aria-hidden />
              Legend
            </p>
            <div className="mb-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-300/60">
                Flood Hazard (NOAH)
              </p>
              <ul className="flex flex-col gap-1.5">
                {HAZARD_LEVELS.map((level) => (
                  <li key={level.level} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: level.color, opacity: 0.9 }}
                    />
                    <span className="text-xs text-primary-100/80">
                      <span className="font-semibold">{level.label} Hazard</span>{" "}
                      ({level.depth})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-primary-800/60 pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-300/60">
                Household Pins
              </p>
              <ul className="flex flex-col gap-1.5">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#FFED4A" }} />
                  <span className="text-xs text-primary-100/80">Low flood risk</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#F59E0B" }} />
                  <span className="text-xs text-primary-100/80">Medium flood risk</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#EF4444" }} />
                  <span className="text-xs text-primary-100/80">High flood risk</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#6B7280" }} />
                  <span className="text-xs text-primary-100/80">All members safe</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3.5 shrink-0 rounded-full border-2 border-white bg-transparent" />
                  <span className="text-xs text-primary-100/80">Rescue needed (dashed ring)</span>
                </li>
              </ul>
            </div>
            {showCenters && (
              <div className="border-t border-primary-800/60 pt-3 mt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-300/60">
                  Evacuation Centers
                </p>
                <ul className="flex flex-col gap-1.5">
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#0EA5E9" }} />
                    <span className="text-xs text-primary-100/80">Available capacity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: "#EF4444" }} />
                    <span className="text-xs text-primary-100/80">At or over capacity</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Filters panel */}
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
              aria-expanded={filtersExpanded}
            >
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                <Filter className="size-3.5" aria-hidden />
                Filters
              </p>
              <ChevronDown
                className={cn("size-4 text-neutral-400 transition-transform duration-200", filtersExpanded && "rotate-180")}
                aria-hidden
              />
            </button>
            {filtersExpanded && (
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-neutral-100">
                {/* Search */}
                <div className="relative pt-3">
                  <Search className="pointer-events-none absolute top-6 left-3 size-4 text-neutral-400" aria-hidden />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Household, head, or member"
                    className="focus-visible:ring-primary-500 min-h-10 w-full rounded-lg border border-neutral-200 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
                    aria-label="Search households"
                  />
                </div>
                <FilterSelect label="Area" value={area} onChange={setArea}>
                  <option value="all">All areas</option>
                  {areas.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Risk level" value={risk} onChange={setRisk}>
                  <option value="all">All risks</option>
                  <option value="3">High</option>
                  <option value="2">Medium</option>
                  <option value="1">Low</option>
                </FilterSelect>
                <FilterSelect label="Safety status" value={safety} onChange={setSafety}>
                  <option value="all">All safety states</option>
                  <option value="safe">All safe</option>
                  <option value="rescue">Needs rescue</option>
                  <option value="unaccounted">Unaccounted</option>
                </FilterSelect>
                <FilterSelect label="Special needs" value={support} onChange={setSupport}>
                  <option value="all">All support needs</option>
                  <option value="is_child">Child</option>
                  <option value="is_senior">Senior</option>
                  <option value="is_pwd">PWD</option>
                  <option value="is_pregnant">Pregnant</option>
                  <option value="is_lactating">Lactating</option>
                  <option value="is_bedridden">Mobility-limited</option>
                  <option value="has_chronic_condition">Chronic condition</option>
                </FilterSelect>
                <FilterSelect label="Center capacity" value={capacity} onChange={setCapacity}>
                  <option value="all">All centers</option>
                  <option value="over">At/over capacity</option>
                  <option value="available">Below capacity</option>
                </FilterSelect>
                {(search || area !== "all" || risk !== "all" || safety !== "all" || support !== "all" || capacity !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch(""); setArea("all"); setRisk("all");
                      setSafety("all"); setSupport("all"); setCapacity("all");
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 text-left"
                  >
                    Clear all filters
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 rounded-full border border-white/70"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

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

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-visible:ring-primary-500 min-h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus-visible:ring-2 focus-visible:outline-none"
      >
        {children}
      </select>
    </label>
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

/* --- Compact tooltip shown on hover --------------------------------------- */

function CompactHouseholdTooltip({
  household,
  risk,
}: {
  household: WorkspaceHouseholdOut;
  risk: Risk;
  riskSource?: string;
}) {
  const safeTotal = household.members.filter((m) => m.status === "safe").length;
  const totalMembers = household.members.length;
  const needsRescue = household.needs_rescue_count;
  return (
    <div style={{ minWidth: 160, maxWidth: 240 }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
        {household.reference_no}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
        {household.head_name} · {household.area_name}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
        <span
          style={{
            background: riskColor(risk),
            color: risk === 1 ? "#1a1a00" : "#fff",
            borderRadius: 4,
            padding: "1px 6px",
            fontWeight: 700,
            fontSize: 10,
          }}
        >
          {riskLabel(risk)} risk
        </span>
        {household.all_safe ? (
          <span style={{ color: "#86efac", fontWeight: 600 }}>✓ All safe</span>
        ) : (
          <span style={{ opacity: 0.8 }}>
            {safeTotal}/{totalMembers} safe
            {needsRescue > 0 ? ` · ${needsRescue} rescue` : ""}
          </span>
        )}
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
                needsRescue
                  ? "border-rose-200 bg-rose-50/60 hover:border-rose-300"
                  : household.all_safe
                    ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                    : "border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20",
              )}
            >
              {/* Risk accent bar */}
              <div
                className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
                style={{
                  backgroundColor: household.all_safe ? "#6B7280" : riskColor(risk),
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
                      needsRescue
                        ? "bg-rose-600 text-white"
                        : household.all_safe
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {needsRescue ? "Rescue" : household.all_safe ? "Safe" : "Unverified"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-neutral-500">
                    {household.area_name} · {totalMembers} member{totalMembers !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10.5px] font-medium text-neutral-500">
                    {safeMembers}/{totalMembers} safe
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
  const needsRescueCount = household.needs_rescue_count;

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
                    {safeMembers}/{totalMembers} safe
                    {needsRescueCount > 0 ? ` · ${needsRescueCount} need rescue` : ""}
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
