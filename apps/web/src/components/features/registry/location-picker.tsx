"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/common/button";
import { BARANGAY_CENTER } from "@/lib/brand";

/**
 * FR-REG-008 — a draggable map pin, the first real Leaflet integration in this
 * codebase (`/hazard-map` today is an explicitly non-interactive placeholder).
 *
 * Always dynamically imported with `ssr: false` by callers — `react-leaflet`
 * touches `window` at module load and is not SSR-safe:
 *
 *   const LocationPicker = dynamic(
 *     () => import("@/components/features/registry/location-picker"),
 *     { ssr: false },
 *   );
 */

// Webpack/Next's asset URLs break Leaflet's own icon-path lookup unless fixed
// up front — the well-known "marker icon missing" bug with any bundler.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  className?: string;
}

function ClickToPlace({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const center = value ?? { lat: BARANGAY_CENTER.lat, lng: BARANGAY_CENTER.lon };
  const markerRef = React.useRef<L.Marker>(null);
  // Always client-only (dynamically imported with `ssr: false`), so `window`
  // is safe to read synchronously — no hydration mismatch to guard against.
  const [isSecure] = React.useState(() => window.isSecureContext);

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        // Silently ignore — the user can still drag the pin manually.
      },
    );
  }

  return (
    <div className={className}>
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-neutral-200">
        <MapContainer
          center={center}
          zoom={value ? 16 : 14}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onChange={onChange} />
          <Marker
            ref={markerRef}
            position={center}
            draggable
            eventHandlers={{
              dragend: () => {
                const marker = markerRef.current;
                if (!marker) return;
                const pos = marker.getLatLng();
                onChange({ lat: pos.lat, lng: pos.lng });
              },
            }}
          />
        </MapContainer>
      </div>

      {isSecure ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={useMyLocation}
        >
          <LocateFixed aria-hidden className="size-3.5" />
          Use my current location
        </Button>
      ) : null}

      <p className="text-caption mt-1 text-neutral-500">
        Drag the pin, or tap the map, to mark your household&apos;s location.
      </p>
    </div>
  );
}
