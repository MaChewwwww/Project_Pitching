"use client";

import * as React from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

import { useHazardGeoJson } from "@/lib/hazard-geojson";
import "@/lib/leaflet-setup";
import {
  BARANGAY_VIEW,
  BOUNDARY_LINE_STYLE,
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  hazardStyle,
  SAN_JOSE_OUTER_BOUNDARY_GEOJSON,
} from "@/lib/map";
import type { GeoJsonPoint } from "@/lib/api/public-types";
import "leaflet/dist/leaflet.css";

export interface ResponseMapItem {
  id: string;
  title: string;
  status: string;
  location: GeoJsonPoint;
  label: string;
  tone: "rose" | "amber" | "sky" | "emerald" | "slate";
}

function MapSelection({ item }: { item: ResponseMapItem | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (!item) return;
    const [longitude, latitude] = item.location.coordinates;
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { duration: 0.55 });
  }, [item, map]);
  return null;
}

function markerIcon(item: ResponseMapItem, selected: boolean) {
  const colors = {
    rose: "#e11d48",
    amber: "#d97706",
    sky: "#0284c7",
    emerald: "#059669",
    slate: "#64748b",
  };
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<span style="display:grid;place-items:center;width:${selected ? 32 : 26}px;height:${selected ? 32 : 26}px;border-radius:999px;background:${colors[item.tone]};border:3px solid white;box-shadow:0 3px 10px rgba(15,23,42,.45);color:white;font:700 11px system-ui">${item.label}</span>`,
  });
}

export function ResponseOperationsMap({
  items,
  selectedId,
  onSelect,
  showHazard,
}: {
  items: ResponseMapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showHazard: boolean;
}) {
  const hazard = useHazardGeoJson(showHazard);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  return (
    <div className="h-[380px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg lg:h-[520px]">
      <MapContainer
        center={BARANGAY_VIEW.center}
        zoom={14}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full"
        attributionControl={false}
      >
        <MapSelection item={selected} />
        <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} />
        {showHazard && hazard.status === "ready" ? (
          <GeoJSON
            data={hazard.data as GeoJSON.GeoJsonObject}
            interactive={false}
            style={(feature) =>
              hazardStyle(feature?.properties?.Var as number | undefined)
            }
          />
        ) : null}
        <GeoJSON
          data={SAN_JOSE_OUTER_BOUNDARY_GEOJSON as GeoJSON.GeoJsonObject}
          interactive={false}
          style={() => BOUNDARY_LINE_STYLE}
        />
        {items.map((item) => {
          const [longitude, latitude] = item.location.coordinates;
          const selectedMarker = item.id === selectedId;
          return (
            <Marker
              key={item.id}
              position={[latitude, longitude]}
              icon={markerIcon(item, selectedMarker)}
              eventHandlers={{ click: () => onSelect(item.id) }}
              zIndexOffset={selectedMarker ? 1000 : 0}
            >
              <Tooltip direction="top" offset={[0, -16]} opacity={1}>
                <span className="font-semibold">{item.title}</span>
                <span className="ml-1 text-slate-500">
                  · {item.status.replaceAll("_", " ")}
                </span>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
