"use client";

import * as React from "react";
import L from "leaflet";
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from "react-leaflet";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  Database,
  ExternalLink,
  MapPin,
  Megaphone,
  Radio,
  School,
  Shield,
  Stethoscope,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useHazardGeoJson } from "@/lib/hazard-geojson";
import "@/lib/leaflet-setup";
import {
  BARANGAY_VIEW,
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  distinctAreaStyle,
  HAZARD_LEVELS,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import { api } from "@/lib/api/client";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/common/badge";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

export interface AssetWorkspaceMapItem {
  id: string;
  name: string;
  category: "evacuation_center" | "facility" | "siren";
  location: { coordinates: [number, number] };
  statusLabel: string;
  tone: "emerald" | "amber" | "rose" | "slate" | "sky";
  area_name?: string | null;
  subDetail?: string;
  isSounding?: boolean;
  acousticRadius?: number;
  occupancy?: number | null;
  capacity?: number | null;
  detailUrl?: string;
  facilityType?: string;
  code?: string;
  onTrigger?: (id: string) => void;
  onSilence?: (id: string) => void;
}

export interface AdminAssetWorkspaceMapProps {
  items: AssetWorkspaceMapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showHazard?: boolean;
  showAreas?: boolean;
  showAcousticBuffer?: boolean;
  showEvacLegend?: boolean;
  showSirenLegend?: boolean;
  showFacilityLegend?: boolean;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Custom Leaflet Styling & Panes                                              */
/* -------------------------------------------------------------------------- */

const MAP_CSS = `
.admin-asset-workspace-map .leaflet-top.leaflet-right {
  top: 14px;
  right: 14px;
}
.admin-asset-workspace-map .leaflet-control-zoom {
  border: 1px solid rgba(74, 222, 128, 0.4) !important;
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
}
.admin-asset-workspace-map .leaflet-control-zoom a {
  background: #052e16 !important;
  color: #4ade80 !important;
  border-bottom: 1px solid rgba(74, 222, 128, 0.25) !important;
  font-size: 16px !important;
  transition: background 0.15s ease, color 0.15s ease;
}
.admin-asset-workspace-map .leaflet-control-zoom a:hover {
  background: #064e3b !important;
  color: #86efac !important;
}
.admin-asset-workspace-map .leaflet-control-zoom a:last-child {
  border-bottom: none !important;
}
.admin-asset-workspace-map .leaflet-popup-content-wrapper {
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 18px !important;
  box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.6), 0 8px 16px -4px rgba(0, 0, 0, 0.4) !important;
  padding: 0 !important;
  overflow: hidden;
}
.admin-asset-workspace-map .leaflet-popup-content {
  margin: 0 !important;
  line-height: 1.4 !important;
}
.admin-asset-workspace-map .leaflet-popup-tip {
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
}
.admin-asset-workspace-map .leaflet-popup-close-button {
  color: #64748b !important;
  padding: 8px 10px !important;
}
.admin-asset-workspace-map .leaflet-popup-close-button:hover {
  color: #0f172a !important;
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

@keyframes sirenRipplePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.85), 0 0 0 0 rgba(225, 29, 72, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(225, 29, 72, 0), 0 0 0 28px rgba(225, 29, 72, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(225, 29, 72, 0), 0 0 0 0 rgba(225, 29, 72, 0);
  }
}
.siren-ripple-active {
  animation: sirenRipplePulse 1.4s infinite cubic-bezier(0.25, 1, 0.5, 1) !important;
}
`;

function MapPanes() {
  const map = useMap();
  React.useEffect(() => {
    if (!map.getPane("areaPane")) {
      const areaPane = map.createPane("areaPane");
      areaPane.style.zIndex = "450";
    }
    if (!map.getPane("topBoundaryPane")) {
      const boundaryPane = map.createPane("topBoundaryPane");
      boundaryPane.style.zIndex = "650";
    }
    if (!map.getPane("assetMarkerPane")) {
      const markerPane = map.createPane("assetMarkerPane");
      markerPane.style.zIndex = "670";
    }
  }, [map]);
  return null;
}

function MapSelectionFlyTo({
  selectedId,
  items,
}: {
  selectedId: string | null;
  items: AssetWorkspaceMapItem[];
}) {
  const map = useMap();
  const lastFlewIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!selectedId) {
      lastFlewIdRef.current = null;
      return;
    }
    if (lastFlewIdRef.current === selectedId) return;
    lastFlewIdRef.current = selectedId;

    const item = items.find((i) => i.id === selectedId);
    if (!item) return;

    const [longitude, latitude] = item.location.coordinates;
    const targetZoom = Math.max(map.getZoom(), 16);
    map.flyTo([latitude, longitude], targetZoom, { duration: 0.7, easeLinearity: 0.25 });
  }, [selectedId, items, map]);

  return null;
}

function createBoundaryLabelIcon() {
  return L.divIcon({
    className: "san-jose-boundary-badge-container",
    html: `<div class="bg-white text-slate-900 border border-slate-300 shadow-md px-3.5 py-1 rounded-full font-bold text-[11px] whitespace-nowrap flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:text-emerald-700 transition-all hover:scale-105">Barangay San Jose Boundary</div>`,
    iconSize: [210, 28],
    iconAnchor: [105, 52],
  });
}

function createAssetMarkerIcon(item: AssetWorkspaceMapItem, selected: boolean) {
  const toneBg = {
    emerald: "#059669",
    amber: "#d97706",
    rose: "#e11d48",
    sky: "#0284c7",
    slate: "#475569",
  }[item.tone];

  const size = selected ? 38 : 30;
  const isSounding = item.isSounding;

  let iconInnerHtml = "";
  if (item.category === "siren") {
    iconInnerHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 11 18-5v12L3 14v-3z"/>
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
      </svg>
    `;
  } else if (item.category === "evacuation_center") {
    iconInnerHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      </svg>
    `;
  } else {
    // Facility
    const type = item.facilityType || "";
    if (type.includes("health") || type.includes("clinic") || type.includes("hospital")) {
      iconInnerHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
          <circle cx="20" cy="10" r="2"/>
        </svg>
      `;
    } else if (type.includes("school") || type.includes("court")) {
      iconInnerHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/>
          <path d="m18 10 3.4-1.7a1 1 0 0 0 .6-.9V4a1 1 0 0 0-.6-.9L14 0 2 6v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9Z"/>
        </svg>
      `;
    } else {
      iconInnerHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      `;
    }
  }

  const rippleClass = isSounding ? "siren-ripple-active" : "";

  return L.divIcon({
    className: "admin-asset-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="${rippleClass}" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${toneBg};border:${selected ? 3 : 2.5}px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.6);color:#ffffff;cursor:pointer;transition:transform 0.15s ease;">
        ${iconInnerHtml}
      </div>
    `,
  });
}

export function AdminAssetWorkspaceMap({
  items,
  selectedId,
  onSelect,
  showHazard = false,
  showAreas = true,
  showAcousticBuffer = true,
  showEvacLegend,
  showSirenLegend,
  showFacilityLegend,
  center = [14.7455, 121.1320],
  zoom = 13.8,
  className,
}: AdminAssetWorkspaceMapProps) {
  const [legendExpanded, setLegendExpanded] = React.useState(true);
  const [showBoundaryModal, setShowBoundaryModal] = React.useState(false);
  const hazard = useHazardGeoJson(showHazard);

  const hasEvac = items.some((i) => i.category === "evacuation_center");
  const hasSiren = items.some((i) => i.category === "siren");
  const hasFacility = items.some((i) => i.category === "facility");

  const renderEvacLegend = showEvacLegend ?? (items.length > 0 ? hasEvac : true);
  const renderSirenLegend = showSirenLegend ?? (items.length > 0 ? hasSiren : true);
  const renderFacilityLegend = showFacilityLegend ?? (items.length > 0 ? hasFacility : false);

  const areaBoundariesQuery = useQuery({
    queryKey: ["public", "area-boundaries", "asset-workspace-map"],
    queryFn: () =>
      api
        .get<{ type: "FeatureCollection"; features: AreaBoundaryFeature[] }>(
          "/public/area-boundaries",
        )
        .then((response) => response.data),
    enabled: showAreas,
  });

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-slate-950", className)}>
      <style>{MAP_CSS}</style>

      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full admin-asset-workspace-map"
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <MapPanes />
        <MapSelectionFlyTo selectedId={selectedId} items={items} />
        <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} />

        {/* 5-Year Flood Hazard Overlay */}
        {showHazard && hazard.status === "ready" ? (
          <GeoJSON
            key="flood-hazard"
            data={hazard.data as GeoJSON.GeoJsonObject}
            interactive={false}
            style={(feature) =>
              hazardStyle(feature?.properties?.Var as number | undefined)
            }
          />
        ) : null}

        {/* Area Boundaries (Areas 1-6) */}
        {showAreas && areaBoundariesQuery.data ? (
          <GeoJSON
            key="area-boundaries"
            data={areaBoundariesQuery.data as GeoJSON.GeoJsonObject}
            pane="areaPane"
            style={(feature) => ({
              ...distinctAreaStyle(
                (feature?.properties as { name?: string })?.name ?? "",
              ),
              fillOpacity: 0.12,
              weight: 2,
            })}
          />
        ) : null}

        {/* Barangay San Jose Outer Boundary Line (Mint Green Dashed) */}
        <GeoJSON
          data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
          pane="topBoundaryPane"
          interactive={true}
          style={() => ({
            ...BOUNDARY_LINE_STYLE,
            className: "cursor-pointer hover:stroke-emerald-400",
          })}
          onEachFeature={(_feature, layer) => {
            layer.on({
              mouseover: (e) => {
                const l = e.target as L.Path;
                l.setStyle({
                  color: "#34d399",
                  weight: 5.5,
                  dashArray: "12, 6",
                  opacity: 1,
                });
              },
              mouseout: (e) => {
                const l = e.target as L.Path;
                l.setStyle(BOUNDARY_LINE_STYLE);
              },
              click: () => {
                setShowBoundaryModal(true);
              },
            });
          }}
        />

        {/* Barangay San Jose Boundary Marker Badge */}
        <Marker
          position={[14.7615, 121.133]}
          icon={createBoundaryLabelIcon()}
          pane="topBoundaryPane"
          eventHandlers={{
            click: () => setShowBoundaryModal(true),
          }}
        />

        {/* Acoustic Coverage Circles for Sirens */}
        {showAcousticBuffer &&
          items
            .filter((item) => item.category === "siren" && item.acousticRadius)
            .map((siren) => {
              const [lng, lat] = siren.location.coordinates;
              const isSounding = siren.isSounding;
              return (
                <Circle
                  key={`buffer-${siren.id}`}
                  center={[lat, lng]}
                  radius={siren.acousticRadius || 500}
                  pathOptions={{
                    color: isSounding ? "#f43f5e" : "#10b981",
                    fillColor: isSounding ? "#f43f5e" : "#10b981",
                    fillOpacity: isSounding ? 0.22 : 0.08,
                    weight: isSounding ? 2.5 : 1.2,
                    dashArray: isSounding ? undefined : "6, 6",
                  }}
                />
              );
            })}

        {/* Asset Markers */}
        {items.map((item) => {
          const [lng, lat] = item.location.coordinates;
          const isSelected = selectedId === item.id;
          const markerIcon = createAssetMarkerIcon(item, isSelected);

          const itemCode = item.code || (
            item.category === "evacuation_center"
              ? `EC-${item.id.slice(0, 5).toUpperCase()}`
              : item.category === "siren"
                ? `SRN-${item.id.slice(0, 4).toUpperCase()}`
                : `FAC-${item.id.slice(0, 4).toUpperCase()}`
          );

          return (
            <Marker
              key={item.id}
              position={[lat, lng]}
              icon={markerIcon}
              pane="assetMarkerPane"
              eventHandlers={{
                click: () => onSelect(item.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                <div className="rounded-md border border-emerald-500/40 bg-slate-950/95 px-2.5 py-1 text-xs text-white shadow-xl">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-[10.5px] text-emerald-300">
                    {item.area_name ? `${item.area_name} • ` : ""}
                    {item.statusLabel}
                  </p>
                </div>
              </Tooltip>

              <Popup>
                {/* Crisp White Card Container Matching Screenshot Style */}
                <div className="flex w-72 flex-col gap-2.5 p-4 text-xs text-slate-900">
                  {/* Top Row: Code Badge & Status Pill */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-bold text-slate-700">
                      {itemCode}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                        item.tone === "emerald" && "bg-emerald-100 text-emerald-800",
                        item.tone === "rose" && "bg-rose-100 text-rose-800",
                        item.tone === "amber" && "bg-amber-100 text-amber-800",
                        item.tone === "sky" && "bg-sky-100 text-sky-800",
                        item.tone === "slate" && "bg-slate-100 text-slate-700",
                      )}
                    >
                      {item.statusLabel}
                    </span>
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h4 className="text-base font-black text-slate-900 leading-snug">
                      {item.name}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin className="size-3 text-slate-400 shrink-0" />
                      {item.area_name || "Barangay San Jose, Rodriguez"}
                    </p>
                  </div>

                  {/* Subdetail / Specs Card */}
                  {item.category === "evacuation_center" && item.capacity ? (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-amber-900">
                        <span>Shelter Capacity</span>
                        <span className="font-mono text-slate-900">
                          {item.occupancy ?? 0} / {item.capacity} Persons
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((item.occupancy ?? 0) / item.capacity) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : item.category === "siren" ? (
                    <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-3 text-xs flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1">
                        <Radio className="size-3 text-sky-700" />
                        Acoustic Coverage
                      </p>
                      <p className="text-[11.5px] font-semibold text-sky-950">
                        500m Omnidirectional Alarm Reach
                      </p>
                      <p className="text-[10.5px] text-sky-800">
                        {item.isSounding ? "Active alarm sounding broadcast" : "Armed and on standby for flood alerts"}
                      </p>
                    </div>
                  ) : item.subDetail ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11.5px] text-slate-600 leading-relaxed">
                      {item.subDetail}
                    </div>
                  ) : null}

                  {/* Actions Row */}
                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    {item.category === "siren" && (
                      <div className="flex items-center gap-1.5">
                        {item.isSounding ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onSilence?.(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
                          >
                            <VolumeX className="size-3.5" />
                            Silence
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onTrigger?.(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                          >
                            <Volume2 className="size-3.5" />
                            Test Sound
                          </button>
                        )}
                      </div>
                    )}

                    {item.detailUrl ? (
                      <Link
                        href={item.detailUrl as unknown as Parameters<typeof Link>[0]["href"]}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
                      >
                        Inspect Details
                        <ExternalLink className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* -------------------------------------------------------------------- */}
      {/* Top-Left Collapsible Legend Card (Matching Screenshot Design)       */}
      {/* -------------------------------------------------------------------- */}
      <div
        aria-label="Map legend"
        className={cn(
          "absolute top-3.5 left-3.5 z-[1000] rounded-2xl border border-emerald-900/80 bg-[#052e16]/95 text-white shadow-2xl backdrop-blur-md transition-all duration-200",
          legendExpanded
            ? "w-64 max-w-[calc(100%-6rem)] max-h-[calc(100%-2rem)] overflow-y-auto sagip-legend-scroll p-3.5"
            : "w-auto p-2"
        )}
      >
        <button
          type="button"
          onClick={() => setLegendExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer",
            legendExpanded ? "w-full justify-between mb-2 pb-1.5 border-b border-emerald-900/60" : "w-auto"
          )}
          aria-expanded={legendExpanded}
          title={legendExpanded ? "Collapse Legend" : "Expand Legend"}
        >
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5 text-emerald-400" aria-hidden />
            LEGEND
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
          <div className="flex flex-col gap-2.5 text-[11px]">
            {/* Flood Hazard (NOAH) */}
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
            <div className={showHazard ? "border-t border-emerald-900/60 pt-2" : ""}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                Map Boundaries
              </p>
              <ul className="flex flex-col gap-1.5">
                <li className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBoundaryModal(true)}
                    className="inline-flex items-center gap-1.5 text-left text-emerald-300 hover:text-emerald-100 transition-colors group cursor-pointer"
                    title="View boundary notes"
                  >
                    <span className="h-0.5 w-4 shrink-0 bg-emerald-400 border-b border-dashed border-emerald-300 group-hover:bg-emerald-200" />
                    <span className="underline decoration-emerald-500/50 underline-offset-2 font-medium">
                      San Jose Boundary
                    </span>
                  </button>
                </li>
                {showAreas && (
                  <li className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-4 shrink-0 rounded-[2px] border border-white/60 bg-white/10 shadow-2xs"
                    />
                    <span className="text-emerald-100/90">Area Divisions (1–6)</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Evacuation Centers */}
            {renderEvacLegend && (
              <div className="border-t border-emerald-900/60 pt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                  Evacuation Centers
                </p>
                <ul className="flex flex-col gap-1.5">
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-emerald-600 text-white font-bold">
                      <Building2 className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Available Capacity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-rose-600 text-white font-bold">
                      <Building2 className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Overloading Capacity</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Siren Units */}
            {renderSirenLegend && (
              <div className="border-t border-emerald-900/60 pt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                  Siren Units
                </p>
                <ul className="flex flex-col gap-1.5">
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-slate-700 text-emerald-400 border border-emerald-500/50 font-bold">
                      <Megaphone className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Idle Siren</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-rose-600 text-white border border-rose-300 font-bold animate-pulse">
                      <Megaphone className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Sounding Siren</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Facilities & Infrastructure */}
            {renderFacilityLegend && (
              <div className="border-t border-emerald-900/60 pt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                  Facilities & Infrastructure
                </p>
                <ul className="flex flex-col gap-1.5">
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-rose-600 text-white font-bold">
                      <Stethoscope className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Health Centers & Clinics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-emerald-600 text-white font-bold">
                      <Building2 className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Administrative Halls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="grid size-4 place-items-center rounded-full bg-sky-600 text-white font-bold">
                      <School className="size-2.5" />
                    </div>
                    <span className="text-emerald-100/90">Schools & Gymnasiums</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Bottom-Right Data Sources Attribution Card (Matching Screenshot)    */}
      {/* -------------------------------------------------------------------- */}
      <div
        aria-label="Data sources attribution"
        className="pointer-events-none absolute bottom-3.5 right-3.5 z-[1000] hidden sm:flex flex-col gap-0.5 rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-3 text-[10.5px] text-emerald-200/90 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400 text-[10px]">
          <Database className="size-3 text-emerald-400" aria-hidden />
          DATA SOURCES
        </div>
        <div>
          <span className="font-semibold text-white/90">Locality:</span> Barangay San Jose, Rodriguez (Montalban), Rizal
        </div>
        <div>
          <span className="font-semibold text-white/90">Data:</span> UP NOAH / LiPAD (ODC-ODbL)
        </div>
        <div className="text-[9.5px] text-emerald-400/60 pt-0.5 border-t border-emerald-900/60 mt-0.5">
          Map: Leaflet · © OpenStreetMap · CARTO
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Barangay San Jose Boundary Overview Modal                            */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={showBoundaryModal} onOpenChange={setShowBoundaryModal}>
        <DialogContent className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 bg-emerald-950 p-5 text-white">
            <div className="flex items-center gap-2">
              <Badge tone="onDark" outline className="border-emerald-500/50 bg-emerald-900/50 text-emerald-200">
                Municipality of Rodriguez (Montalban), Rizal
              </Badge>
            </div>
            <DialogTitle className="mt-2 flex items-center gap-2 text-xl font-bold text-white">
              <Shield className="size-5 text-emerald-400 shrink-0" />
              Barangay San Jose Boundary & GIS Assets
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-200/80">
              Administrative boundary and spatial operational overview for disaster readiness and response.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Jurisdiction
                </p>
                <p className="mt-1 font-bold text-slate-900">San Jose</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Barangay Areas
                </p>
                <p className="mt-1 font-bold text-slate-900">6 Areas</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Mapped Assets
                </p>
                <p className="mt-1 font-bold text-emerald-700">{items.length} Units</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
              <p className="font-semibold text-emerald-900">
                Official Disaster Risk & Operations Boundary
              </p>
              <p className="mt-1 leading-relaxed text-emerald-800">
                All coordinates and facilities are tracked within the official PSGC
                boundary for Barangay San Jose. Flood depth layers reflect verified 5-year return
                period simulations produced by UP NOAH.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 text-right">
              <button
                type="button"
                onClick={() => setShowBoundaryModal(false)}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Close Overview
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
