"use client";

import * as React from "react";
import type * as GeoJSONType from "geojson";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import {
  DARK_TILE_ATTRIBUTION,
  DARK_TILE_URL,
  BARANGAY_VIEW,
  distinctAreaStyle,
  hazardStyle,
} from "@/lib/map";
import { useHazardGeoJson } from "@/lib/hazard-geojson";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";

export type AdminAssetMapItem = {
  id: string;
  name: string;
  location: { coordinates: [number, number] };
  area_name?: string | null;
  statusLabel: string;
  tone: "emerald" | "amber" | "rose" | "slate" | "sky";
  detail?: string;
};

const COLORS = {
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  slate: "#64748b",
  sky: "#0284c7",
};

function FollowSelection({ item }: { item?: AdminAssetMapItem }) {
  const map = useMap();
  React.useEffect(() => {
    if (!item) return;
    const [lng, lat] = item.location.coordinates;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.55 });
  }, [item, map]);
  return null;
}

export function AdminAssetMap({
  items,
  selectedId,
  onSelect,
  areaBoundaries = [],
  showHazard = false,
  className,
}: {
  items: AdminAssetMapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  areaBoundaries?: AreaBoundaryFeature[];
  showHazard?: boolean;
  className?: string;
}) {
  const selected = items.find((item) => item.id === selectedId);
  const hazard = useHazardGeoJson(showHazard);
  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        center={BARANGAY_VIEW.center}
        zoom={14}
        minZoom={BARANGAY_VIEW.minZoom}
        maxZoom={BARANGAY_VIEW.maxZoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} />
        <FollowSelection item={selected} />
        {showHazard && hazard.status === "ready" ? (
          <GeoJSON
            data={hazard.data as GeoJSONType.GeoJsonObject}
            interactive={false}
            style={(feature) =>
              hazardStyle(feature?.properties?.Var as number | undefined)
            }
          />
        ) : null}
        {areaBoundaries.length ? (
          <GeoJSON
            data={
              {
                type: "FeatureCollection",
                features: areaBoundaries,
              } as GeoJSONType.GeoJsonObject
            }
            interactive={false}
            style={(feature) =>
              distinctAreaStyle((feature?.properties as { name?: string })?.name ?? "")
            }
          />
        ) : null}
        {items.map((item) => {
          const [lng, lat] = item.location.coordinates;
          const active = selectedId === item.id;
          const tone = COLORS[item.tone];
          return (
            <CircleMarker
              key={item.id}
              center={[lat, lng]}
              radius={active ? 11 : 8}
              pathOptions={{
                color: "#fff",
                weight: active ? 3 : 2,
                fillColor: tone,
                fillOpacity: 0.95,
                className: item.tone === "rose" ? "sagip-siren-ripple" : undefined,
              }}
              eventHandlers={{ click: () => onSelect(item.id) }}
            >
              <Popup>
                <div className="min-w-44 font-sans">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="text-xs text-slate-600">{item.statusLabel}</span>
                  {item.detail ? (
                    <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
