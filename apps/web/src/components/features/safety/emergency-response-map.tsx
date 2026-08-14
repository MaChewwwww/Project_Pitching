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
import { Filter, MapPin, Search, TriangleAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { hazardLevelForPoint, useHazardGeoJson } from "@/lib/hazard-geojson";
import type {
  EmergencyWorkspaceOut,
  WorkspaceHouseholdOut,
} from "@/lib/api/safety-types";
import {
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import { api, toDisplayError } from "@/lib/api/client";
import type { SafetyStatusAdminIn } from "@/lib/api/safety-types";
import type { PublicFacility } from "@/lib/api/public-types";
import "@/lib/leaflet-setup";
import "leaflet/dist/leaflet.css";

type Risk = 1 | 2 | 3;

function fallbackRisk(value: WorkspaceHouseholdOut["waterway_proximity"]): Risk {
  if (value === "very_near") return 3;
  if (value === "near") return 2;
  return 1;
}

function riskColor(risk: Risk) {
  return risk === 3 ? "#EF4444" : risk === 2 ? "#F59E0B" : "#FFED4A";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

/** Keep emergency operations maps visually consistent with the finalized public maps. */
function EmergencyMapPanes() {
  const map = useMap();

  React.useEffect(() => {
    if (!map.getPane("topBoundaryPane")) {
      const pane = map.createPane("topBoundaryPane");
      pane.style.zIndex = "550";
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

const ADMIN_MAP_CSS = `
.admin-emergency-map .leaflet-container {
  background: #090d16;
}
.admin-emergency-map .leaflet-tooltip {
  background: #052e16;
  color: #f8fafc;
  border: 1px solid #166534;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}
.admin-emergency-map .leaflet-tooltip-top::before {
  border-top-color: #166534;
}
.admin-emergency-map .leaflet-tooltip .text-neutral-900 {
  color: #f8fafc !important;
}
.admin-emergency-map .leaflet-tooltip .text-neutral-500 {
  color: #cbd5e1 !important;
}
.admin-emergency-map .leaflet-control-attribution {
  display: none;
}
`;

export function EmergencyResponseMap({ data }: { data: EmergencyWorkspaceOut }) {
  const hazard = useHazardGeoJson(true);
  const [search, setSearch] = React.useState("");
  const [area, setArea] = React.useState("all");
  const [risk, setRisk] = React.useState("all");
  const [safety, setSafety] = React.useState("all");
  const [support, setSupport] = React.useState("all");
  const [mapping, setMapping] = React.useState("all");
  const [capacity, setCapacity] = React.useState("all");
  const [facilityType, setFacilityType] = React.useState("all");
  const [showHazard, setShowHazard] = React.useState(true);
  const [showHouseholds, setShowHouseholds] = React.useState(true);
  const [showCenters, setShowCenters] = React.useState(true);
  const [showFacilities, setShowFacilities] = React.useState(false);
  const [showWalkIns, setShowWalkIns] = React.useState(false);
  const [selected, setSelected] = React.useState<WorkspaceHouseholdOut | null>(null);
  const facilitiesQuery = useQuery({
    queryKey: ["public", "facilities", "emergency-map"],
    queryFn: () =>
      api.get<PublicFacility[]>("/public/facilities").then((response) => response.data),
    enabled: showFacilities,
  });

  const enriched = React.useMemo(
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
          risk: mappedRisk ?? fallbackRisk(household.waterway_proximity),
          riskSource: mappedRisk
            ? "NOAH 5-year flood layer"
            : "Household survey fallback",
        };
      }),
    [data.households, hazard],
  );

  const filtered = enriched.filter(({ household, risk: riskLevel }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      household.reference_no.toLowerCase().includes(query) ||
      household.head_name.toLowerCase().includes(query) ||
      household.members.some((member) => member.full_name.toLowerCase().includes(query));
    const matchesSafety =
      safety === "all" ||
      (safety === "safe" && household.all_safe) ||
      (safety === "rescue" && household.needs_rescue_count > 0) ||
      (safety === "unaccounted" && household.unaccounted_count > 0);
    const matchesSupport =
      support === "all" ||
      household.members.some((member) => member.vulnerability_flags.includes(support));
    const matchesMapping =
      mapping === "all" ||
      (mapping === "mapped" ? household.location : !household.location);
    return (
      matchesSearch &&
      (area === "all" || household.area_id === area) &&
      (risk === "all" || riskLevel === Number(risk)) &&
      matchesSafety &&
      matchesSupport &&
      matchesMapping
    );
  });

  const areas = Array.from(
    new Map(data.households.map((household) => [household.area_id, household.area_name])),
  );
  const visibleCenters = data.evacuation_centers.filter(
    (center) =>
      capacity === "all" ||
      (capacity === "over" ? center.is_at_capacity : !center.is_at_capacity),
  );
  const unmapped = filtered.filter(({ household }) => !household.location);

  return (
    <div className="flex flex-col gap-4">
      <Card radius="lg">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4 xl:grid-cols-6">
          <label className="relative md:col-span-2">
            <span className="sr-only">Search households</span>
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Household, head, or member"
              className="focus-visible:ring-primary-500 min-h-10 w-full rounded-lg border border-neutral-200 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </label>
          <FilterSelect label="Area" value={area} onChange={setArea}>
            <option value="all">All areas</option>
            {areas.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Risk" value={risk} onChange={setRisk}>
            <option value="all">All risks</option>
            <option value="3">High</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
          </FilterSelect>
          <FilterSelect label="Safety" value={safety} onChange={setSafety}>
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
          <FilterSelect label="Map pins" value={mapping} onChange={setMapping}>
            <option value="mapped">Mapped only</option>
            <option value="all">Mapped and unmapped</option>
            <option value="unmapped">Unmapped only</option>
          </FilterSelect>
          <FilterSelect label="Center capacity" value={capacity} onChange={setCapacity}>
            <option value="all">All centers</option>
            <option value="over">At/over capacity</option>
            <option value="available">Below capacity</option>
          </FilterSelect>
          <FilterSelect
            label="Facility type"
            value={facilityType}
            onChange={setFacilityType}
          >
            <option value="all">All facility types</option>
            {Array.from(
              new Set(facilitiesQuery.data?.map((facility) => facility.type) ?? []),
            ).map((type) => (
              <option key={type} value={type}>
                {statusLabel(type)}
              </option>
            ))}
          </FilterSelect>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2 xl:col-span-4">
            <LayerToggle
              checked={showHazard}
              onChange={setShowHazard}
              label="Flood hazard"
            />
            <LayerToggle
              checked={showHouseholds}
              onChange={setShowHouseholds}
              label="Households"
            />
            <LayerToggle
              checked={showCenters}
              onChange={setShowCenters}
              label="Evacuation centers"
            />
            <LayerToggle
              checked={showFacilities}
              onChange={setShowFacilities}
              label="Other facilities"
            />
            <LayerToggle
              checked={showWalkIns}
              onChange={setShowWalkIns}
              label="Pinned walk-ins"
            />
          </div>
        </CardContent>
      </Card>

      <div className="admin-emergency-map relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <style>{ADMIN_MAP_CSS}</style>
        <MapContainer
          center={[14.7415, 121.1315]}
          zoom={14}
          className="h-[62vh] min-h-[440px] w-full"
          scrollWheelZoom
          minZoom={11}
          maxZoom={18}
          attributionControl={false}
        >
          <EmergencyMapPanes />
          <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
          {showHazard && hazard.status === "ready" ? (
            <GeoJSON
              data={hazard.data as GeoJSON.GeoJsonObject}
              style={(feature) => hazardStyle(Number(feature?.properties?.Var ?? 0))}
            />
          ) : null}
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
          {showHouseholds &&
            filtered.map(({ household, risk: riskLevel, riskSource }) => {
              if (!household.location) return null;
              const [longitude, latitude] = household.location.coordinates;
              const needsRescue = household.needs_rescue_count > 0;
              return (
                <CircleMarker
                  key={household.household_id}
                  center={[latitude, longitude]}
                  radius={needsRescue ? 10 : 8}
                  pathOptions={{
                    fillColor: household.all_safe ? "#6B7280" : riskColor(riskLevel),
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
                    className="dark-leaflet-tooltip"
                    direction="top"
                    opacity={1}
                    sticky
                  >
                    <HouseholdDetails
                      household={household}
                      risk={riskLevel}
                      riskSource={riskSource}
                      compact
                    />
                  </Tooltip>
                </CircleMarker>
              );
            })}
          {showCenters
            ? visibleCenters.map((center) => {
                const point = center.facility.location?.coordinates;
                if (!point) return null;
                return (
                  <CircleMarker
                    key={center.id}
                    center={[point[1], point[0]]}
                    radius={9}
                    pathOptions={{
                      color: "#075985",
                      fillColor: center.is_at_capacity ? "#EF4444" : "#0EA5E9",
                      fillOpacity: 0.9,
                      weight: 3,
                    }}
                  >
                    <Tooltip className="dark-leaflet-tooltip">
                      <b>{center.facility.name}</b>
                      <br />
                      {center.occupancy}/{center.capacity ?? "?"} occupants
                    </Tooltip>
                  </CircleMarker>
                );
              })
            : null}
          {showWalkIns
            ? data.unregistered_pins.map((person) => (
                <CircleMarker
                  key={person.id}
                  center={[
                    person.location.coordinates[1],
                    person.location.coordinates[0],
                  ]}
                  radius={6}
                  pathOptions={{
                    color: "#7C3AED",
                    fillColor: "#C4B5FD",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Tooltip className="dark-leaflet-tooltip">
                    <b>{person.full_name}</b>
                    <br />
                    {statusLabel(person.status)}
                    {person.vulnerability_flags.length ? (
                      <>
                        <br />
                        {person.vulnerability_flags.map(statusLabel).join(", ")}
                      </>
                    ) : null}
                    {person.evac_center_name ? (
                      <>
                        <br />
                        {person.evac_center_name}
                      </>
                    ) : null}
                  </Tooltip>
                </CircleMarker>
              ))
            : null}
          {showFacilities
            ? facilitiesQuery.data
                ?.filter(
                  (facility) =>
                    facility.type !== "evacuation_center" &&
                    (facilityType === "all" || facility.type === facilityType),
                )
                .map((facility) => {
                  const point = facility.location?.coordinates;
                  if (!point) return null;
                  return (
                    <CircleMarker
                      key={facility.id}
                      center={[point[1], point[0]]}
                      radius={5}
                      pathOptions={{
                        color: "#166534",
                        fillColor: "#86EFAC",
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    >
                      <Tooltip className="dark-leaflet-tooltip">
                        <b>{facility.name}</b>
                        <br />
                        {statusLabel(facility.type)}
                      </Tooltip>
                    </CircleMarker>
                  );
                })
            : null}
        </MapContainer>
        <div
          aria-label="Household map legend"
          className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-emerald-900/80 bg-[#052e16]/95 px-3 py-2 text-[11px] font-medium text-slate-100 shadow-xl backdrop-blur-sm"
        >
          <span className="font-bold text-white">Households</span>
          <LegendDot color="#FFED4A" label="Low risk" />
          <LegendDot color="#F59E0B" label="Medium" />
          <LegendDot color="#EF4444" label="High risk" />
          <LegendDot color="#6B7280" label="All safe" />
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-white bg-transparent" />
            Rescue
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MapStat
          icon={MapPin}
          label="Visible mapped households"
          value={filtered.length - unmapped.length}
        />
        <MapStat
          icon={Users}
          label="Unmapped in current filters"
          value={unmapped.length}
        />
        <MapStat
          icon={TriangleAlert}
          label="Needs rescue"
          value={
            filtered.filter(({ household }) => household.needs_rescue_count > 0).length
          }
        />
      </div>

      {unmapped.length > 0 ? (
        <Card radius="lg">
          <CardContent className="p-4">
            <h3 className="font-semibold text-neutral-900">Unmapped households</h3>
            <p className="mb-3 text-sm text-neutral-500">
              Optional pins never remove a household from operations.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unmapped.map(({ household }) => (
                <button
                  key={household.household_id}
                  type="button"
                  onClick={() => setSelected(household)}
                  className="focus-visible:ring-primary-500 rounded-lg border border-neutral-200 p-3 text-left hover:bg-neutral-50 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <b className="block text-sm">{household.reference_no}</b>
                  <span className="text-xs text-neutral-500">
                    {household.head_name} · {household.area_name}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Household response details</SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="p-5">
              <HouseholdDetails
                household={selected}
                risk={
                  enriched.find(
                    ({ household }) => household.household_id === selected.household_id,
                  )?.risk ?? 1
                }
                riskSource={
                  enriched.find(
                    ({ household }) => household.household_id === selected.household_id,
                  )?.riskSource ?? "Household survey fallback"
                }
              />
              {!data.is_read_only ? (
                <HouseholdSafetyActions data={data} household={selected} />
              ) : (
                <p className="mt-5 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600">
                  This event has ended. Safety records are read-only.
                </p>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
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
        onChange={(event) => onChange(event.target.value)}
        className="focus-visible:ring-primary-500 min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus-visible:ring-2 focus-visible:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function LayerToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm text-neutral-700">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full border border-white/70"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function MapStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Filter;
  label: string;
  value: number;
}) {
  return (
    <Card radius="lg">
      <CardContent className="flex items-center gap-3 py-3">
        <Icon className="text-primary-700 size-5" />
        <div>
          <b className="block text-lg text-neutral-900">{value}</b>
          <span className="text-xs text-neutral-500">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function HouseholdDetails({
  household,
  risk,
  riskSource,
  compact = false,
}: {
  household: WorkspaceHouseholdOut;
  risk: Risk;
  riskSource: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "max-w-[320px]" : "space-y-4"}>
      <div>
        <b className="text-sm text-neutral-900">
          {household.reference_no} · {household.head_name}
        </b>
        <p className="text-xs text-neutral-500">
          {household.area_name}
          {household.street_address ? ` · ${household.street_address}` : ""}
        </p>
        <p className="mt-1 text-xs">
          Risk: <b>{risk === 3 ? "High" : risk === 2 ? "Medium" : "Low"}</b> ·{" "}
          {riskSource}
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {household.members.map((member) => (
          <div
            key={member.member_id}
            className="rounded-md border border-neutral-200 bg-white p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">
                {member.full_name}
                {member.is_head ? " (head)" : ""}
              </span>
              <Badge
                tone={
                  member.status === "safe"
                    ? "success"
                    : member.status === "needs_rescue"
                      ? "danger"
                      : "warning"
                }
              >
                {statusLabel(member.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {member.vulnerability_flags.length
                ? member.vulnerability_flags.map(statusLabel).join(", ")
                : "No recorded support needs"}
            </p>
            {member.evac_center_name ? (
              <p className="text-primary-700 mt-1 text-xs">
                At {member.evac_center_name}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function HouseholdSafetyActions({
  data,
  household,
}: {
  data: EmergencyWorkspaceOut;
  household: WorkspaceHouseholdOut;
}) {
  const queryClient = useQueryClient();
  const [centerId, setCenterId] = React.useState("");
  const [pending, setPending] = React.useState<{
    scope: "member" | "household";
    status: "safe" | "needs_rescue";
    memberIds: string[];
    title: string;
  } | null>(null);
  const mutation = useMutation({
    mutationFn: (payload: SafetyStatusAdminIn) =>
      api.post("/admin/safety-status", payload),
    onSuccess: async () => {
      toast.success("Safety status updated");
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
    household_id: household.household_id,
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
  return (
    <section className="mt-6 space-y-3 border-t border-neutral-200 pt-5">
      <div>
        <h3 className="font-semibold text-neutral-900">Record safety</h3>
        <p className="text-xs text-neutral-500">
          Evacuation center is optional. Omitting it preserves an existing physical
          assignment.
        </p>
      </div>
      <div className="space-y-2">
        {household.members.map((member) => (
          <div
            key={member.member_id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium">{member.full_name}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  setPending({
                    scope: "member",
                    status: "safe",
                    memberIds: [member.member_id],
                    title: `Mark ${member.full_name} safe`,
                  })
                }
              >
                Mark safe
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  setPending({
                    scope: "member",
                    status: "needs_rescue",
                    memberIds: [member.member_id],
                    title: `Mark ${member.full_name} as needing rescue`,
                  })
                }
              >
                Needs rescue
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={mutation.isPending}
          onClick={() =>
            setPending({
              scope: "household",
              status: "safe",
              memberIds: household.members.map((member) => member.member_id),
              title: "Mark the whole household safe",
            })
          }
        >
          Mark whole household safe
        </Button>
        <Button
          variant="outline"
          disabled={mutation.isPending}
          onClick={() =>
            setPending({
              scope: "household",
              status: "needs_rescue",
              memberIds: household.members.map((member) => member.member_id),
              title: "Mark the whole household as needing rescue",
            })
          }
        >
          Whole household needs rescue
        </Button>
      </div>
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            <DialogDescription>
              {pending?.scope === "household"
                ? "Confirm the exact live roster below. If it changed, the server will reject this bulk action."
                : "Confirm this individual event-scoped safety update."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-neutral-200 p-3 text-sm">
            {household.members
              .filter((member) => pending?.memberIds.includes(member.member_id))
              .map((member) => (
                <div key={member.member_id} className="py-1">
                  {member.full_name}
                  {member.is_head ? " (head)" : ""}
                </div>
              ))}
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Optional evacuation center
            <select
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              className="focus-visible:ring-primary-500 min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">No new center assignment</option>
              {data.evacuation_centers
                .filter((center) => center.is_open)
                .map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.facility.name} · {center.occupancy}/{center.capacity ?? "?"}
                    {center.is_at_capacity ? " · at capacity" : ""}
                  </option>
                ))}
            </select>
            <span className="font-normal text-neutral-500">
              Omit it to keep any existing physical assignment unchanged.
            </span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={submitPending}>
              {mutation.isPending ? "Saving…" : "Confirm update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
