"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { DARK_TILE_ATTRIBUTION, DARK_TILE_URL } from "@/lib/map";
import "@/lib/leaflet-setup";

export interface MiniMapPreviewProps {
  latitude: number;
  longitude: number;
  label?: string;
  tone?: "rose" | "amber" | "sky" | "emerald" | "slate";
  className?: string;
}

function createMiniMarkerIcon(label: string, tone: string) {
  const colors: Record<string, string> = {
    rose: "#e11d48",
    amber: "#d97706",
    sky: "#0284c7",
    emerald: "#059669",
    slate: "#64748b",
  };
  const bg = colors[tone] || "#e11d48";
  const size = 30;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2.5px solid #ffffff;box-shadow:0 3px 12px rgba(15,23,42,0.6);color:#ffffff;font-family:system-ui,-apple-system,sans-serif;font-weight:800;font-size:11px;">
        ${label}
      </div>
    `,
  });
}

export function MiniMapPreview({
  latitude,
  longitude,
  label = "●",
  tone = "rose",
  className = "h-48 w-full",
}: MiniMapPreviewProps) {
  const icon = React.useMemo(() => createMiniMarkerIcon(label, tone), [label, tone]);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 ${className}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full pointer-events-none"
      >
        <TileLayer attribution={DARK_TILE_ATTRIBUTION} url={DARK_TILE_URL} />
        <Marker position={[latitude, longitude]} icon={icon} />
      </MapContainer>

      {/* Floating Directions Action */}
      <div className="absolute top-2.5 right-2.5 z-[1000]">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-xs border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <Navigation className="size-3 text-emerald-400" />
          Directions
        </a>
      </div>

      {/* Coordinate Stamp */}
      <div className="absolute bottom-2 left-2.5 z-[1000] rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 backdrop-blur-xs border border-slate-800/80 tabular-nums">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>
    </div>
  );
}
