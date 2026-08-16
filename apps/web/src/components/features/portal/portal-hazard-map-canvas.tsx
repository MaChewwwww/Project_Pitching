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
import {
  Building2,
  Home,
  MapPin,
  Navigation,
  Phone,
  Volume2,
  VolumeX,
} from "lucide-react";

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
import type {
  AreaBoundaryFeature,
  PublicAreaStat,
  PublicFacility,
} from "@/lib/api/public-types";
import type { PublicSiren } from "@/components/features/map/hazard-map-client";
import "leaflet/dist/leaflet.css";

/* --- custom map panes ------------------------------------------------------ */

function MapPanes() {
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
    if (!map.getPane("householdPane")) {
      const pane = map.createPane("householdPane");
      pane.style.zIndex = "690";
    }
    const tooltipPane = map.getPane("tooltipPane");
    if (tooltipPane) tooltipPane.style.zIndex = "750";
    const popupPane = map.getPane("popupPane");
    if (popupPane) popupPane.style.zIndex = "750";
  }, [map]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
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

function createHouseholdMarkerIcon() {
  return L.divIcon({
    className: "portal-household-pin-icon",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: #38BDF8; opacity: 0.6; animation: sagip-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9999px; background-color: #1D4ED8; border: 2.5px solid #ffffff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); color: #ffffff;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const FACILITY_COLOR: Record<string, string> = {
  evacuation_center: "#10B981",
  hospital: "#EF4444",
  clinic: "#F97316",
  barangay_hall: "#8B5CF6",
  police: "#3B82F6",
  fire: "#F59E0B",
  rescue_station: "#06B6D4",
};

function facilityColor(type: string): string {
  return FACILITY_COLOR[type] ?? "#10B981";
}

const CUSTOM_MAP_STYLES = `
@keyframes sagip-ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
.portal-dark-popup .leaflet-popup-content-wrapper {
  background-color: #032e23 !important;
  color: #f8fafc !important;
  border: 1px solid #065f46 !important;
  border-radius: 1rem !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7) !important;
  padding: 4px !important;
}
.portal-dark-popup a {
  color: #ffffff !important;
}
.portal-dark-popup .leaflet-popup-tip {
  background-color: #032e23 !important;
  border: 1px solid #065f46 !important;
}
.portal-dark-tooltip {
  background-color: #032e23 !important;
  color: #f8fafc !important;
  border: 1px solid #065f46 !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
}
`;

export interface PortalHazardMapCanvasProps {
  center: [number, number];
  zoom: number;
  householdLocation: [number, number] | null;
  householdInfo: {
    head_name: string;
    reference_no: string;
    area_name: string;
    street_address: string;
    waterway_proximity: string | null;
  };
  areaBoundaries: AreaBoundaryFeature[];
  facilities: PublicFacility[];
  areaStats: PublicAreaStat[];
  sirens: PublicSiren[];
  layers: {
    hazard: boolean;
    areas: boolean;
    facilities: boolean;
    sirens: boolean;
    household: boolean;
  };
}

export function PortalHazardMapCanvas({
  center,
  zoom,
  householdLocation,
  householdInfo,
  areaBoundaries,
  facilities,
  areaStats,
  sirens,
  layers,
}: PortalHazardMapCanvasProps) {
  const hazard = useHazardGeoJson(layers.hazard);

  React.useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = CUSTOM_MAP_STYLES;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, []);

  const statByAreaId = React.useMemo(() => {
    const m = new Map<string, PublicAreaStat>();
    for (const s of areaStats) {
      if (s.area_id) m.set(s.area_id, s);
      if (s.area_name) m.set(s.area_name, s);
    }
    return m;
  }, [areaStats]);

  return (
    <div className="relative h-full w-full min-h-[450px] font-sans text-slate-100">
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full min-h-[450px]"
        style={{ height: "100%", width: "100%", minHeight: "450px" }}
      >
        <MapPanes />
        <InvalidateSizeOnMount />

        {/* Dark Map Tiles */}
        <TileLayer
          url={DARK_TILE_URL}
          attribution={DARK_TILE_ATTRIBUTION}
          maxZoom={BARANGAY_VIEW.maxZoom}
        />

        {/* Flood Hazard 5-Year Layer (NOAH) */}
        {layers.hazard && hazard.data && (
          <GeoJSON
            key="portal-flood-hazard-layer"
            data={hazard.data}
            style={(feature) =>
              hazardStyle(feature?.properties?.Var as number | undefined)
            }
          />
        )}

        {/* Outer Administrative Boundary */}
        <GeoJSON
          key="portal-outer-boundary"
          data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
          interactive={false}
          pane="topBoundaryPane"
          style={() => BOUNDARY_LINE_STYLE}
        />

        {/* Boundary Label Badge */}
        <Marker
          position={[14.7615, 121.133]}
          icon={createBoundaryLabelIcon()}
          interactive={false}
          pane="topBoundaryPane"
        />

        {/* Area Boundaries & Statistical Shading */}
        {layers.areas && areaBoundaries.length > 0 && (
          <GeoJSON
            key="portal-area-boundaries"
            data={
              {
                type: "FeatureCollection",
                features: areaBoundaries,
              } as GeoJSON.GeoJsonObject
            }
            style={(feature) =>
              distinctAreaStyle(
                (feature as unknown as AreaBoundaryFeature).properties.name,
              )
            }
            onEachFeature={(feature, layer) => {
              const f = feature as unknown as AreaBoundaryFeature;
              const name = f.properties.name;
              const stat = statByAreaId.get(f.properties.area_id) ?? statByAreaId.get(name);
              layer.bindTooltip(
                `<div class="p-1 font-sans text-xs">
                  <strong class="text-white block text-sm">${name}</strong>
                  ${stat ? `<span class="text-emerald-300">${stat.registered_households} registered households</span>` : ""}
                </div>`,
                { className: "portal-dark-tooltip", sticky: true, opacity: 0.95 },
              );
            }}
          />
        )}

        {/* Evacuation Centers & Facilities Markers (Controlled by Layer Toggle, Initially Off) */}
        {layers.facilities &&
          facilities.map((fac) => {
            const [lon, lat] = fac.location.coordinates;
            const color = facilityColor(fac.type);
            const gmapsUrl = googleMapsDirectionsUrl(lat, lon);

            return (
              <CircleMarker
                key={fac.id}
                center={[lat, lon]}
                radius={7}
                pane="topMarkerPane"
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -6]}
                  className="portal-dark-tooltip"
                >
                  <span className="font-bold text-xs">{fac.name}</span>
                </Tooltip>

                <Popup className="portal-dark-popup">
                  <div className="p-2 font-sans min-w-[200px] space-y-2">
                    <div className="flex items-center gap-2 border-b border-emerald-800/80 pb-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white">
                        <Building2 className="size-4" />
                      </span>
                      <div>
                        <strong className="block text-sm font-bold text-white">
                          {fac.name}
                        </strong>
                        <span className="text-[10.5px] font-semibold text-emerald-300 uppercase tracking-wider">
                          {fac.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-emerald-100 space-y-1">
                      <p className="flex items-center gap-1 text-slate-300">
                        <MapPin className="size-3 text-emerald-400 shrink-0" />
                        <span>{fac.area_name ?? "Barangay San Jose"}</span>
                      </p>
                      {fac.contact_number && (
                        <p className="flex items-center gap-1 text-slate-300">
                          <Phone className="size-3 text-emerald-400 shrink-0" />
                          <span>{fac.contact_number}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-1 border-t border-emerald-800/80">
                      <a
                        href={gmapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 px-3 text-xs font-bold text-white shadow-sm transition-colors w-full"
                      >
                        <Navigation className="size-3" />
                        <span>Get Directions</span>
                      </a>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Siren Units Markers */}
        {layers.sirens &&
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
                }}
              >
                <Popup className="portal-dark-popup">
                  <div className="p-2 font-sans space-y-1">
                    <div className="flex items-center gap-2">
                      {isSounding ? (
                        <Volume2 className="size-4 text-red-400 animate-pulse" />
                      ) : (
                        <VolumeX className="size-4 text-slate-400" />
                      )}
                      <strong className="block text-sm font-bold text-white">
                        {siren.name}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-300">
                      Status: <span className="font-semibold">{siren.status}</span>
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* ── Household Location Marker (Pulsing Blue Pin with Rich Popup) ── */}
        {layers.household && householdLocation && (
          <Marker
            position={householdLocation}
            icon={createHouseholdMarkerIcon()}
            pane="householdPane"
          >
            <Tooltip
              direction="top"
              offset={[0, -16]}
              permanent
              className="portal-dark-tooltip"
            >
              <div className="px-1 py-0.5 font-sans text-xs">
                <span className="font-black text-sky-300">Your Household</span>
                <span className="block text-[10px] text-slate-200">
                  {householdInfo.head_name}
                </span>
              </div>
            </Tooltip>

            <Popup className="portal-dark-popup">
              <div className="p-2.5 font-sans min-w-[220px] space-y-2.5">
                <div className="flex items-center gap-2.5 border-b border-sky-800/80 pb-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <Home className="size-4" />
                  </span>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      {householdInfo.head_name}
                    </strong>
                    <span className="text-[10.5px] font-bold text-sky-300">
                      Reference #{householdInfo.reference_no}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-200 space-y-1">
                  <p className="flex items-center gap-1.5 text-slate-200">
                    <MapPin className="size-3.5 text-sky-400 shrink-0" />
                    <span>{householdInfo.street_address}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Purok / Area: <span className="font-semibold text-white">{householdInfo.area_name}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Proximity:{" "}
                    <span className="font-semibold text-sky-300 capitalize">
                      {householdInfo.waterway_proximity?.replace(/_/g, " ") ?? "Standard"}
                    </span>
                  </p>
                </div>

                <div className="pt-1 border-t border-sky-800/80">
                  <a
                    href={googleMapsDirectionsUrl(
                      householdLocation[0],
                      householdLocation[1],
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 py-1.5 px-3 text-xs font-bold text-white shadow-sm transition-colors w-full"
                  >
                    <Navigation className="size-3" />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
