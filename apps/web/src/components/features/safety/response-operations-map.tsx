"use client";

import * as React from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Database,
  MapPin,
  Shield,
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
import type { AreaBoundaryFeature, GeoJsonPoint } from "@/lib/api/public-types";
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

export interface ResponseMapItem {
  id: string;
  title: string;
  status: string;
  location: GeoJsonPoint;
  label: string;
  tone: "rose" | "amber" | "sky" | "emerald" | "slate";
  areaName?: string | null;
  priority?: number | null;
}

export interface ResponseOperationsMapProps {
  items: ResponseMapItem[];
  unmappedCount?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showHazard: boolean;
  showAreas: boolean;
  onSelectArea?: (areaName: string) => void;
  mode: "rescue" | "incident";
}

/* -------------------------------------------------------------------------- */
/* Custom Leaflet Styling & Panes                                              */
/* -------------------------------------------------------------------------- */

const LEGEND_CSS = `
.admin-emergency-map .leaflet-top.leaflet-right {
  top: 12px;
  right: 12px;
}
.admin-emergency-map .leaflet-control-zoom {
  border: 1px solid rgba(74, 222, 128, 0.4) !important;
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
}
.admin-emergency-map .leaflet-control-zoom a {
  background: #052e16 !important;
  color: #4ade80 !important;
  border-bottom: 1px solid rgba(74, 222, 128, 0.25) !important;
  font-size: 16px !important;
  transition: background 0.15s ease, color 0.15s ease;
}
.admin-emergency-map .leaflet-control-zoom a:hover {
  background: #064e3b !important;
  color: #86efac !important;
}
.admin-emergency-map .leaflet-control-zoom a:last-child {
  border-bottom: none !important;
}
.admin-emergency-map .leaflet-tooltip {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  pointer-events: none;
}
.admin-emergency-map .leaflet-tooltip-top:before {
  border-top-color: rgba(5, 46, 22, 0.95) !important;
}
.admin-emergency-map .leaflet-tooltip-bottom:before {
  border-bottom-color: rgba(5, 46, 22, 0.95) !important;
}
.admin-emergency-map .leaflet-tooltip-left:before {
  border-left-color: rgba(5, 46, 22, 0.95) !important;
}
.admin-emergency-map .leaflet-tooltip-right:before {
  border-right-color: rgba(5, 46, 22, 0.95) !important;
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
`;

function MapSelection({
  selectedId,
  items,
}: {
  selectedId: string | null;
  items: ResponseMapItem[];
}) {
  const map = useMap();
  const lastFlewIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!selectedId) {
      lastFlewIdRef.current = null;
      return;
    }
    if (lastFlewIdRef.current === selectedId) {
      return;
    }
    lastFlewIdRef.current = selectedId;

    const item = items.find((i) => i.id === selectedId);
    if (!item) return;

    const [longitude, latitude] = item.location.coordinates;
    const targetZoom = map.getMaxZoom() || BARANGAY_VIEW.maxZoom || 18;
    map.flyTo([latitude, longitude], targetZoom, { duration: 0.8, easeLinearity: 0.25 });
  }, [selectedId, items, map]);

  return null;
}

function EmergencyMapPanes() {
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
    if (!map.getPane("responseMarkerPane")) {
      const markerPane = map.createPane("responseMarkerPane");
      markerPane.style.zIndex = "670";
    }
    if (!map.getPane("responseTooltipPane")) {
      const tooltipPane = map.createPane("responseTooltipPane");
      tooltipPane.style.zIndex = "800";
      tooltipPane.style.pointerEvents = "none";
    }
  }, [map]);
  return null;
}

function createBoundaryLabelIcon() {
  return L.divIcon({
    className: "san-jose-boundary-badge-container",
    html: `<div class="bg-white text-slate-900 border border-slate-300 shadow-md px-3 py-1 rounded-md font-bold text-[11px] whitespace-nowrap flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:text-emerald-700 transition-colors">Barangay San Jose Boundary</div>`,
    iconSize: [200, 26],
    iconAnchor: [100, 48],
  });
}

function markerIcon(item: ResponseMapItem, selected: boolean) {
  const colors = {
    rose: "#e11d48",
    amber: "#d97706",
    sky: "#0284c7",
    emerald: "#059669",
    slate: "#64748b",
  };
  const bg = colors[item.tone] || "#e11d48";
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2.5px solid #ffffff;box-shadow:0 3px 12px rgba(15,23,42,0.6);color:#ffffff;font-family:system-ui,-apple-system,sans-serif;font-weight:800;font-size:${selected ? 12 : 10.5}px;cursor:pointer;transition:transform .15s ease;">
        ${item.label}
      </div>
    `,
  });
}

/* -------------------------------------------------------------------------- */
/* Main ResponseOperationsMap Component                                        */
/* -------------------------------------------------------------------------- */

export function ResponseOperationsMap({
  items,
  unmappedCount = 0,
  selectedId,
  onSelect,
  showHazard,
  showAreas,
  onSelectArea,
  mode,
}: ResponseOperationsMapProps) {
  const [legendExpanded, setLegendExpanded] = React.useState(true);
  const [showBoundaryModal, setShowBoundaryModal] = React.useState(false);
  const hazard = useHazardGeoJson(showHazard);

  const areaBoundariesQuery = useQuery({
    queryKey: ["public", "area-boundaries", "operations-map"],
    queryFn: () =>
      api
        .get<{ type: "FeatureCollection"; features: AreaBoundaryFeature[] }>(
          "/public/area-boundaries",
        )
        .then((response) => response.data),
    enabled: showAreas,
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <style>{LEGEND_CSS}</style>

      <MapContainer
        center={BARANGAY_VIEW.center}
        zoom={13.8}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full admin-emergency-map"
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <EmergencyMapPanes />
        <MapSelection selectedId={selectedId} items={items} />
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

        {/* Area Boundaries (Sitios/Areas 1-6) */}
        {showAreas && areaBoundariesQuery.data ? (
          <GeoJSON
            key="area-boundaries"
            data={areaBoundariesQuery.data as GeoJSON.GeoJsonObject}
            pane="areaPane"
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
                    fillOpacity: 0.32,
                  });
                  l.bringToFront();
                },
                mouseout: (e) => {
                  const l = e.target as L.Path;
                  l.setStyle(distinctAreaStyle(areaName));
                },
                click: () => {
                  onSelectArea?.(areaName);
                },
              });
            }}
          />
        ) : null}

        {/* Barangay San Jose Outer Boundary Line */}
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

        {/* Operational Incident & Rescue Pins */}
        {items.map((item) => {
          const [longitude, latitude] = item.location.coordinates;
          const isSelected = item.id === selectedId;
          return (
            <Marker
              key={item.id}
              position={[latitude, longitude]}
              icon={markerIcon(item, isSelected)}
              pane="responseMarkerPane"
              eventHandlers={{ click: () => onSelect(item.id) }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={1} pane="responseTooltipPane">
                <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-500/30 bg-[#052e16]/95 px-3 py-2 text-white shadow-2xl backdrop-blur-md min-w-[210px] max-w-[280px]">
                  {/* Top Row: Category tag and Priority/Status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400">
                      {mode === "rescue" ? "Rescue Request" : "Incident Report"}
                    </span>
                    {item.priority ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          item.priority === 1
                            ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                            : item.priority === 2
                            ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                            : "bg-sky-500/25 text-sky-300 border border-sky-500/40",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            item.priority === 1
                              ? "bg-rose-400 animate-pulse"
                              : item.priority === 2
                              ? "bg-amber-400"
                              : "bg-sky-400",
                          )}
                        />
                        P{item.priority} {item.priority === 1 ? "Critical" : item.priority === 2 ? "High" : "Moderate"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-200">
                        {item.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="font-bold text-xs leading-snug text-white line-clamp-2">
                    {item.title}
                  </div>

                  {/* Location & Status meta info */}
                  <div className="flex items-center justify-between border-t border-emerald-900/60 pt-1.5 text-[11px] text-emerald-200/90">
                    <div className="flex items-center gap-1 text-[10.5px] truncate">
                      <MapPin className="size-3 text-emerald-400 shrink-0" />
                      <span className="font-medium truncate">{item.areaName || "Area Unknown"}</span>
                    </div>
                    {item.priority ? (
                      <span className="text-[10px] font-semibold text-neutral-300">
                        {item.status}
                      </span>
                    ) : null}
                  </div>

                  {/* Click hint footer */}
                  <div className="flex items-center justify-end text-[9.5px] font-bold text-emerald-400 tracking-wide">
                    <span>Click pin to inspect →</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      {/* -------------------------------------------------------------------- */}
      {/* Top-Left Collapsible Legend Card (Exact Themed Design)               */}
      {/* -------------------------------------------------------------------- */}
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
          <div className="flex flex-col gap-2 text-[11px]">
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
            <div className={showHazard ? "border-t border-emerald-900/60 pt-1.5" : ""}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                Map Boundaries
              </p>
              <ul className="flex flex-col gap-1">
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
                      className="h-2.5 w-4 shrink-0 rounded-[2px] border border-emerald-400/80 bg-emerald-500/10 shadow-2xs"
                    />
                    <span className="text-emerald-100/90">Barangay Areas (1–6)</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Incident/Rescue Status Pin Indicators */}
            <div className="border-t border-emerald-900/60 pt-1.5">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                Record Status Pins
              </p>
              <ul className="flex flex-col gap-1">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60 bg-[#e11d48]" />
                  <span className="text-emerald-100/90">Pending Review</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60 bg-[#d97706]" />
                  <span className="text-emerald-100/90">Verified</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60 bg-[#0284c7]" />
                  <span className="text-emerald-100/90">
                    {mode === "rescue" ? "Dispatched" : "In Progress"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60 bg-[#059669]" />
                  <span className="text-emerald-100/90">Resolved</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border border-white/60 bg-[#64748b]" />
                  <span className="text-emerald-100/90">Dismissed</span>
                </li>
              </ul>
            </div>

            {/* Urgency Priority Levels (for rescue mode) */}
            {mode === "rescue" ? (
              <div className="border-t border-emerald-900/60 pt-1.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
                  Urgency Priority (Pin #)
                </p>
                <ul className="flex flex-col gap-1 text-[10.5px]">
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-600 font-bold text-[9px] text-white">
                      1
                    </span>
                    <span className="text-emerald-100/90">
                      <span className="font-semibold text-rose-300">Priority 1</span> (Critical / Bedridden)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-600 font-bold text-[9px] text-white">
                      2
                    </span>
                    <span className="text-emerald-100/90">
                      <span className="font-semibold text-amber-300">Priority 2</span> (High / Vulnerable)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-600 font-bold text-[9px] text-white">
                      3
                    </span>
                    <span className="text-emerald-100/90">
                      <span className="font-semibold text-sky-300">Priority 3</span> (Standard Queue)
                    </span>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Bottom-Left Status Badges in Themed Green Container                  */}
      {/* -------------------------------------------------------------------- */}
      <div
        aria-label="Map spatial pin coverage"
        className="absolute bottom-3.5 left-3.5 z-[1000] flex flex-col gap-1.5 rounded-xl border border-emerald-900/80 bg-[#052e16]/95 px-3 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-auto"
      >
        {/* Pinned on Map */}
        <div className="flex items-center gap-2 text-emerald-100">
          <span className="size-2 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
          <span>
            <strong className="font-bold text-white tabular-nums">{items.length}</strong> Pinned on Map
          </span>
        </div>

        {/* Not Pinned on Map */}
        <div className="flex items-center gap-2 text-emerald-100">
          <span className="size-2 rounded-full bg-rose-500 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
          <span>
            <strong className="font-bold text-white tabular-nums">{unmappedCount}</strong> Not Pinned on Map
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Bottom-Right Data Sources & Licensing Card (Exact Themed Design)    */}
      {/* -------------------------------------------------------------------- */}
      <div
        aria-label="Data sources attribution"
        className="pointer-events-none absolute bottom-3.5 right-3.5 z-[1000] hidden sm:flex flex-col gap-0.5 rounded-lg border border-emerald-900/80 bg-[#052e16]/95 px-3 py-2 text-[10.5px] text-emerald-200/90 shadow-xl backdrop-blur-sm"
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
      {/* Barangay San Jose Jurisdiction Overview Modal                        */}
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
              Barangay San Jose Jurisdiction
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
                  Active Items
                </p>
                <p className="mt-1 font-bold text-emerald-700">{items.length} Pins</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
              <p className="font-semibold text-emerald-900">
                Official Disaster Risk & Operations Boundary
              </p>
              <p className="mt-1 leading-relaxed text-emerald-800">
                All coordinates and rescue requests are tracked within the official PSGC
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
