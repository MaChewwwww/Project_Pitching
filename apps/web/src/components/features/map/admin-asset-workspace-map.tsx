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
  ExternalLink,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useHazardGeoJson } from "@/lib/hazard-geojson";
import "@/lib/leaflet-setup";
import {
  BARANGAY_VIEW,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  distinctAreaStyle,
  hazardStyle,
} from "@/lib/map";
import { api } from "@/lib/api/client";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";
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
  acousticRadius?: number; // in meters (e.g. 500)
  occupancy?: number | null;
  capacity?: number | null;
  detailUrl?: string;
  facilityType?: string;
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
  className?: string;
}

const MAP_CSS = `
.admin-asset-workspace-map .leaflet-top.leaflet-right {
  top: 12px;
  right: 12px;
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
  background: #052e16 !important;
  color: #ffffff !important;
  border: 1px solid rgba(74, 222, 128, 0.3) !important;
  border-radius: 14px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7) !important;
  padding: 0 !important;
  overflow: hidden;
}
.admin-asset-workspace-map .leaflet-popup-content {
  margin: 0 !important;
  line-height: 1.4 !important;
}
.admin-asset-workspace-map .leaflet-popup-tip {
  background: #052e16 !important;
  border: 1px solid rgba(74, 222, 128, 0.3) !important;
}
.admin-asset-workspace-map .leaflet-popup-close-button {
  color: #86efac !important;
  padding: 6px 8px !important;
}
.admin-asset-workspace-map .leaflet-popup-close-button:hover {
  color: #ffffff !important;
}

@keyframes sirenRipplePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.8), 0 0 0 0 rgba(225, 29, 72, 0.5);
  }
  50% {
    box-shadow: 0 0 0 14px rgba(225, 29, 72, 0), 0 0 0 24px rgba(225, 29, 72, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(225, 29, 72, 0), 0 0 0 0 rgba(225, 29, 72, 0);
  }
}
.siren-ripple-active {
  animation: sirenRipplePulse 1.4s infinite cubic-bezier(0.25, 1, 0.5, 1) !important;
}
`;

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

function createAssetMarkerIcon(item: AssetWorkspaceMapItem, selected: boolean) {
  const toneBg = {
    emerald: "#059669",
    amber: "#d97706",
    rose: "#e11d48",
    sky: "#0284c7",
    slate: "#64748b",
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
    if (item.capacity && item.occupancy !== undefined && item.occupancy !== null) {
      const pct = Math.round((item.occupancy / item.capacity) * 100);
      iconInnerHtml = `<span style="font-size:${selected ? 10 : 8.5}px;font-weight:900;font-family:monospace;">${pct}%</span>`;
    } else {
      iconInnerHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        </svg>
      `;
    }
  } else {
    // General facility
    const type = item.facilityType || "";
    if (type.includes("health") || type.includes("clinic") || type.includes("hospital")) {
      iconInnerHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
          <circle cx="20" cy="10" r="2"/>
        </svg>
      `;
    } else if (type.includes("school")) {
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
      <div class="${rippleClass}" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${toneBg};border:${selected ? 3 : 2}px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.6);color:#ffffff;cursor:pointer;transition:transform 0.15s ease;">
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
  showAreas = false,
  showAcousticBuffer = true,
  className,
}: AdminAssetWorkspaceMapProps) {
  const hazard = useHazardGeoJson(showHazard);

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
        center={BARANGAY_VIEW.center}
        zoom={13.8}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full admin-asset-workspace-map"
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
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

        {/* Area Boundaries (Sitios 1-6) */}
        {showAreas && areaBoundariesQuery.data ? (
          <GeoJSON
            key="area-boundaries"
            data={areaBoundariesQuery.data as GeoJSON.GeoJsonObject}
            style={(feature) => ({
              ...distinctAreaStyle(
                (feature?.properties as { name?: string })?.name ?? "",
              ),
              fillOpacity: 0.12,
              weight: 2,
            })}
          />
        ) : null}

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
                    color: isSounding ? "#f43f5e" : "#059669",
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

          return (
            <Marker
              key={item.id}
              position={[lat, lng]}
              icon={markerIcon}
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
                <div className="flex w-64 flex-col gap-2.5 p-3.5 text-xs text-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-emerald-300 leading-tight">
                        {item.name}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-emerald-100/80">
                        {item.area_name || "Barangay San Jose"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                        item.tone === "emerald" && "bg-emerald-900 text-emerald-200 border border-emerald-700",
                        item.tone === "rose" && "bg-rose-900 text-rose-200 border border-rose-700",
                        item.tone === "amber" && "bg-amber-900 text-amber-200 border border-amber-700",
                        item.tone === "sky" && "bg-sky-900 text-sky-200 border border-sky-700",
                        item.tone === "slate" && "bg-slate-800 text-slate-300 border border-slate-600",
                      )}
                    >
                      {item.statusLabel}
                    </span>
                  </div>

                  {item.subDetail ? (
                    <div className="rounded-lg bg-emerald-950/80 border border-emerald-900/90 p-2 text-[11px] text-emerald-100/90 leading-relaxed">
                      {item.subDetail}
                    </div>
                  ) : null}

                  {item.category === "evacuation_center" && item.capacity ? (
                    <div className="flex flex-col gap-1 border-t border-emerald-900/60 pt-2 text-[11px]">
                      <div className="flex justify-between font-medium">
                        <span className="text-emerald-200/80">Occupancy</span>
                        <span className="font-bold tabular-nums text-white">
                          {item.occupancy ?? 0} / {item.capacity}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-emerald-400"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((item.occupancy ?? 0) / item.capacity) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-emerald-900/60 pt-2.5">
                    {item.category === "siren" && (
                      <div className="flex items-center gap-1.5">
                        {item.isSounding ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onSilence?.(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-600 transition-colors cursor-pointer"
                          >
                            <VolumeX className="size-3" />
                            Silence
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onTrigger?.(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                          >
                            <Volume2 className="size-3" />
                            Test Sound
                          </button>
                        )}
                      </div>
                    )}

                    {item.detailUrl ? (
                      <Link
                        href={item.detailUrl as unknown as Parameters<typeof Link>[0]["href"]}
                        className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-800/80 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-700 hover:text-white transition-colors"
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
    </div>
  );
}
