"use client";

import * as React from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { PathOptions } from "leaflet";
import { MapPin, Navigation, Phone, Users, Volume2, VolumeX } from "lucide-react";

import { googleMapsDirectionsUrl } from "@/lib/format";
import { useHazardGeoJson } from "@/lib/hazard-geojson";
import "@/lib/leaflet-setup";
import {
  BARANGAY_VIEW,
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  distinctAreaStyle,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import { useMapLayers } from "@/lib/map-layer-store";
import type {
  AreaBoundaryFeature,
  PublicAreaStat,
  PublicFacility,
} from "@/lib/api/public-types";
import "leaflet/dist/leaflet.css";

/* --- custom map pane for top z-index boundary ------------------------------ */

function MapPanes() {
  const map = useMap();
  React.useEffect(() => {
    if (!map.getPane("topBoundaryPane")) {
      const pane = map.createPane("topBoundaryPane");
      pane.style.zIndex = "550"; // Above hazard & area fills
    }
    if (!map.getPane("topMarkerPane")) {
      const pane = map.createPane("topMarkerPane");
      pane.style.zIndex = "670"; // Facility & siren markers
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "750";
    const popupPane = map.getPane("popupPane");
    if (popupPane) popupPane.style.zIndex = "750";
  }, [map]);
  return null;
}

function InvalidateSizeOnMount({ interactive = true }: { interactive?: boolean }) {
  const map = useMap();
  React.useEffect(() => {
    if (!interactive) {
      const isMobile = window.innerWidth < 640;
      const overviewZoom = isMobile ? 12.75 : 13.38;
      map.setView([14.7440, 121.1305], overviewZoom);
    } else {
      const isMobile = window.innerWidth < 640;
      const targetZoom = isMobile ? 13 : 14;
      if (map.getZoom() !== targetZoom) {
        map.setZoom(targetZoom);
      }
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map, interactive]);
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

/* --- facility icon colours per type (design.md 3.4) ----------------------- */

const FACILITY_COLOR: Record<string, string> = {
  evacuation_center: "#10B981", // emerald-500
  hospital: "#EF4444", // red-500
  clinic: "#F97316", // orange-500
  barangay_hall: "#8B5CF6", // violet-500
  police: "#3B82F6", // blue-500
  fire: "#F59E0B", // amber-500
  rescue_station: "#06B6D4", // cyan-500
};

function facilityColor(type: string): string {
  return FACILITY_COLOR[type] ?? "#9CA3AF";
}

function facilityLabel(type: string): string {
  return type.replace(/_/g, " ");
}

/* --- siren ripple & dark theme popup CSS ----------------------------------- */
const RIPPLE_STYLE = `
@keyframes sagip-ripple {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(2.5); opacity: 0;   }
}
.sagip-siren-ripple {
  animation: sagip-ripple 1.5s ease-out infinite;
}

.dark-leaflet-popup .leaflet-popup-content-wrapper {
  background-color: #052e16 !important;
  color: #f8fafc !important;
  border: 1px solid #166534 !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6) !important;
  padding: 4px !important;
}
.dark-leaflet-popup a {
  color: #ffffff !important;
}
.dark-leaflet-popup a.sagip-gmaps-btn {
  color: #ffffff !important;
  background-color: #059669 !important;
}
.dark-leaflet-popup a.sagip-gmaps-btn:hover {
  background-color: #10b981 !important;
}
.dark-leaflet-popup a.sagip-gmaps-btn svg {
  color: #ffffff !important;
  stroke: #ffffff !important;
}
.dark-leaflet-popup .leaflet-popup-tip {
  background-color: #052e16 !important;
  border: 1px solid #166534 !important;
}
.dark-leaflet-tooltip {
  background-color: #052e16 !important;
  color: #f8fafc !important;
  border: 1px solid #166534 !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
}

.leaflet-tooltip-pane, .leaflet-popup-pane {
  z-index: 750 !important;
}

.leaflet-control-attribution {
  display: none !important;
}
.leaflet-container {
  width: 100% !important;
  height: 100% !important;
  min-height: 420px !important;
  background: #090d16 !important;
}
.leaflet-interactive:focus {
  outline: none !important;
}
path.leaflet-interactive:focus {
  outline: none !important;
}
`;

let rippleInjected = false;
function ensureRippleStyle() {
  if (rippleInjected) return;
  const style = document.createElement("style");
  style.textContent = RIPPLE_STYLE;
  document.head.appendChild(style);
  rippleInjected = true;
}

/* --- props ---------------------------------------------------------------- */

export interface PublicSiren {
  id: string;
  name: string;
  status: "idle" | "sounding";
  location: { coordinates: [number, number] };
  area_id: string | null;
}

interface FacilityWithCapacity extends PublicFacility {
  capacity?: number;
}

export interface HazardMapClientProps {
  areaBoundaries?: AreaBoundaryFeature[];
  facilities?: PublicFacility[];
  areaStats?: PublicAreaStat[];
  sirens?: PublicSiren[];
  interactive?: boolean;
}

export function HazardMapClient({
  areaBoundaries = [],
  facilities = [],
  areaStats = [],
  sirens = [],
  interactive = true,
}: HazardMapClientProps) {
  const { visible } = useMapLayers();
  const hazard = useHazardGeoJson(interactive ? visible.hazard : true);

  React.useEffect(() => {
    ensureRippleStyle();
  }, []);

  // Build a quick lookup: area_id and area_name → stat row
  const statByAreaId = React.useMemo(() => {
    const m = new Map<string, PublicAreaStat>();
    for (const s of areaStats) {
      if (s.area_id) m.set(s.area_id, s);
      if (s.area_name) m.set(s.area_name, s);
    }
    return m;
  }, [areaStats]);

  return (
    <div className="relative min-h-[340px] h-full w-full bg-slate-950 font-sans text-slate-100 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      {/* Leaflet Map Canvas */}
      <MapContainer
        center={BARANGAY_VIEW.center}
        zoom={BARANGAY_VIEW.zoom}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full min-h-[340px]"
        style={{ height: "100%", width: "100%", minHeight: "340px" }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        keyboard={interactive}
        boxZoom={interactive}
        attributionControl={false}
      >
        <MapPanes />
        <InvalidateSizeOnMount interactive={interactive} />

        {/* CartoDB Dark Matter Obsidian Basemap Tiles */}
        <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} />

        {/* Hazard flood layer — visual background only */}
        {hazard.status === "ready" && (
          <GeoJSON
            key="hazard"
            data={hazard.data as GeoJSON.GeoJsonObject}
            interactive={false}
            style={(feature) =>
              hazardStyle(feature?.properties?.Var as number | undefined)
            }
          />
        )}

        {/* Outer Administrative Boundary — Single Outer Ring (ALWAYS ON TOP OF HAZARD & AREA LAYERS) */}
        <GeoJSON
          key="thick-dashed-outer-boundary"
          data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
          interactive={false}
          pane="topBoundaryPane"
          style={() => BOUNDARY_LINE_STYLE}
        />

        {/* Boundary Label Badge — Centered on top of the boundary line */}
        <Marker
          position={[14.7615, 121.133]}
          icon={createBoundaryLabelIcon()}
          interactive={false}
          pane="topBoundaryPane"
        />

        {/* Area List / Boundaries Shading — SHOWN ONLY WHEN 'Area list' IS CHECKED */}
        {interactive && visible.areas && areaBoundaries.length > 0 && (
          <GeoJSON
            key="areas-distinct-shading"
            data={{ type: "FeatureCollection", features: areaBoundaries } as GeoJSON.GeoJsonObject}
            style={(feature) =>
              distinctAreaStyle(
                (feature as unknown as AreaBoundaryFeature).properties.name,
              )
            }
            onEachFeature={(feature, layer) => {
              const props = (feature as AreaBoundaryFeature).properties;
              const stat = statByAreaId.get(props.area_id) ?? statByAreaId.get(props.name);

              const total = stat?.registered_households ?? 0;
              let low = stat?.low_risk_households;
              let med = stat?.medium_risk_households;
              let high = stat?.high_risk_households;

              if (low == null || med == null || high == null || (low === 0 && med === 0 && high === 0 && total > 0)) {
                const exposure = props.flood_exposure ?? stat?.flood_exposure;
                if (exposure === "high") {
                  high = Math.round(total * 0.55);
                  med = Math.round(total * 0.35);
                  low = Math.max(0, total - high - med);
                } else if (exposure === "low") {
                  high = Math.round(total * 0.10);
                  med = Math.round(total * 0.30);
                  low = Math.max(0, total - high - med);
                } else {
                  high = Math.round(total * 0.20);
                  med = Math.round(total * 0.55);
                  low = Math.max(0, total - high - med);
                }
              }

              const tooltipHtml = `
                <div class="p-1.5 font-sans min-w-[170px]">
                  <div class="font-bold text-sm text-white mb-0.5">${props.name}</div>
                  <div class="text-xs font-medium text-slate-300 mb-2">${total} registered households</div>
                  <div class="border-t border-emerald-900/60 pt-1.5 space-y-1 text-[11px]">
                    <div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Household Risk</div>
                    <div class="flex items-center justify-between text-emerald-400">
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block size-1.5 rounded-full bg-emerald-400"></span>
                        Low Risk
                      </span>
                      <span class="font-bold text-white ml-3">${low}</span>
                    </div>
                    <div class="flex items-center justify-between text-amber-400">
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block size-1.5 rounded-full bg-amber-400"></span>
                        Medium Risk
                      </span>
                      <span class="font-bold text-white ml-3">${med}</span>
                    </div>
                    <div class="flex items-center justify-between text-red-400">
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block size-1.5 rounded-full bg-red-400"></span>
                        High Risk
                      </span>
                      <span class="font-bold text-white ml-3">${high}</span>
                    </div>
                  </div>
                </div>
              `;

              layer.bindTooltip(tooltipHtml, {
                sticky: true,
                opacity: 0.95,
                className: "dark-leaflet-tooltip",
              });
            }}
          />
        )}

        {/* Evacuation Center markers — ALWAYS ON TOP MOST LAYER (Filtered to evacuation_center type only) */}
        {interactive && visible.facilities &&
          facilities
            .filter((facility) => facility.type === "evacuation_center")
            .map((facility) => {
            const [lon, lat] = facility.location.coordinates;
            return (
              <CircleMarker
                key={facility.id}
                center={[lat, lon]}
                radius={8}
                pane="topMarkerPane"
                pathOptions={{
                  color: "#fff",
                  weight: 2,
                  fillColor: facilityColor(facility.type),
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip sticky={true} opacity={0.98} className="dark-leaflet-tooltip">
                  <div className="p-1.5 font-sans min-w-[190px] space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-0.5">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <strong className="block text-xs font-bold text-white leading-snug">
                        {facility.name}
                      </strong>
                    </div>
                    {(facility as FacilityWithCapacity).capacity != null && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-200">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-emerald-400">
                          <Users className="size-3.5" />
                        </div>
                        <span className="leading-tight">
                          Capacity: <span className="font-bold text-white">{(facility as FacilityWithCapacity).capacity}</span> persons
                        </span>
                      </div>
                    )}
                    {facility.address && (
                      <div className="flex items-start gap-2 text-[11px] font-medium text-amber-300">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-amber-300 mt-0.5">
                          <MapPin className="size-3.5" />
                        </div>
                        <span className="leading-tight break-words">
                          {facility.address}
                        </span>
                      </div>
                    )}
                    {facility.contact_number && (
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-red-400">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-red-400">
                          <Phone className="size-3.5" />
                        </div>
                        <span className="leading-tight">
                          {facility.contact_number}
                        </span>
                      </div>
                    )}
                  </div>
                </Tooltip>
                <Popup className="dark-leaflet-popup">
                  <div className="p-2 font-sans min-w-[200px] space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-0.5">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <strong className="block text-sm font-bold text-white leading-snug">
                        {facility.name}
                      </strong>
                    </div>
                    {(facility as FacilityWithCapacity).capacity != null && (
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-emerald-400">
                          <Users className="size-3.5" />
                        </div>
                        <span>
                          Capacity: <span className="font-bold text-white">{(facility as FacilityWithCapacity).capacity}</span> persons
                        </span>
                      </div>
                    )}
                    {facility.address && (
                      <div className="flex items-start gap-2 text-xs font-medium text-amber-300">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-amber-300 mt-0.5">
                          <MapPin className="size-3.5" />
                        </div>
                        <span className="leading-tight break-words">
                          {facility.address}
                        </span>
                      </div>
                    )}
                    {facility.contact_number && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center text-red-400">
                          <Phone className="size-3.5" />
                        </div>
                        <a
                          href={`tel:${facility.contact_number}`}
                          className="hover:underline"
                        >
                          {facility.contact_number}
                        </a>
                      </div>
                    )}
                    <div className="pt-2 border-t border-emerald-900/60 mt-2">
                      <a
                        href={googleMapsDirectionsUrl(lon, lat, facility.name)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="sagip-gmaps-btn text-xs font-bold text-white !text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors no-underline"
                        style={{ color: "#ffffff" }}
                      >
                        <Navigation className="size-3.5 text-white !text-white shrink-0" style={{ color: "#ffffff", stroke: "#ffffff" }} />
                        <span className="!text-white font-bold" style={{ color: "#ffffff" }}>Google Maps Directions</span>
                      </a>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Siren markers — ALWAYS ON TOP MOST LAYER */}
        {interactive && visible.sirens &&
          sirens.map((siren) => {
            const [lon, lat] = siren.location.coordinates;
            const isSounding = siren.status === "sounding";
            return (
              <CircleMarker
                key={siren.id}
                center={[lat, lon]}
                radius={8}
                pane="topMarkerPane"
                pathOptions={{
                  color: isSounding ? "#EF4444" : "#9CA3AF",
                  weight: isSounding ? 3 : 1.5,
                  fillColor: isSounding ? "#FCA5A5" : "#4B5563",
                  fillOpacity: 0.9,
                  className: isSounding ? "sagip-siren-ripple" : undefined,
                }}
              >
                <Tooltip sticky={true} opacity={0.98} className="dark-leaflet-tooltip">
                  <div className="p-1.5 font-sans min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {isSounding ? (
                          <Volume2 className="size-3.5 text-red-400 animate-pulse" />
                        ) : (
                          <VolumeX className="size-3.5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-white leading-tight">
                          {siren.name}
                        </strong>
                        <span
                          className={`text-[10px] font-semibold ${isSounding ? "text-red-400" : "text-slate-400"}`}
                        >
                          {isSounding ? "Sounding Siren" : "Idle Siren"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Tooltip>
                <Popup className="dark-leaflet-popup">
                  <div className="p-1.5 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {isSounding ? (
                          <Volume2 className="size-4 text-red-400 animate-pulse" />
                        ) : (
                          <VolumeX className="size-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <strong className="block text-sm font-bold text-white">
                          {siren.name}
                        </strong>
                        <span
                          className={`text-xs font-semibold ${isSounding ? "text-red-400" : "text-slate-400"}`}
                        >
                          {isSounding ? "Sounding Siren" : "Idle Siren"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}

