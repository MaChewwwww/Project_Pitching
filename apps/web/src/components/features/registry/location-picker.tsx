"use client";

import * as React from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/common/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { BARANGAY_VIEW, OSM_TILE_ATTRIBUTION, OSM_TILE_URL } from "@/lib/map";
// Default-icon fixup, shared with the hazard map. Import for the side effect.
import "@/lib/leaflet-setup";

/**
 * FR-REG-008/FR-MAP-013 — a draggable map pin.
 *
 * Always dynamically imported with `ssr: false` by callers — `react-leaflet`
 * touches `window` at module load and is not SSR-safe:
 *
 *   const LocationPicker = dynamic(
 *     () => import("@/components/features/registry/location-picker"),
 *     { ssr: false },
 *   );
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  className?: string;
  /** Overrides the helper caption under the map — the default assumes a
   * household pin, which reads wrong on non-registration callers (e.g. the
   * public rescue form). */
  caption?: string;
}

function ClickToPlace({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Moves the viewport to a fresh GPS fix. Dragging or tapping the map must
 * never trigger this — the user is already looking at the right place — so
 * it watches the geolocation hook's own `fix` object, not `value`.
 */
function FlyToFix({ fix }: { fix: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (fix) map.flyTo(fix, 16);
    // `map` is stable for the container's lifetime; only a new fix matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix]);
  return null;
}

export default function LocationPicker({
  value,
  onChange,
  className,
  caption = "Drag the pin, or tap the map, to mark your household's location.",
}: LocationPickerProps) {
  const center = value ?? { lat: BARANGAY_VIEW.center[0], lng: BARANGAY_VIEW.center[1] };
  const markerRef = React.useRef<L.Marker>(null);
  const geo = useGeolocation();

  React.useEffect(() => {
    if (geo.fix) onChange({ lat: geo.fix.lat, lng: geo.fix.lng });
    // `onChange` is a stable RHF `field.onChange` at every call site — same
    // rationale as `use-registration-draft.ts`'s `form` dependency omission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.fix]);

  return (
    <div className={className}>
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-neutral-200">
        <MapContainer
          center={center}
          zoom={value ? 16 : BARANGAY_VIEW.zoom}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_URL} />
          <ClickToPlace onChange={onChange} />
          <FlyToFix fix={geo.fix} />
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

      {geo.isSecureContext && geo.isSupported ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={geo.status === "locating"}
          onClick={geo.locate}
        >
          <LocateFixed aria-hidden className="size-3.5" />
          {geo.status === "locating" ? "Locating…" : "Use my current location"}
        </Button>
      ) : (
        <p className="text-caption mt-2 text-neutral-500">
          {geo.isSecureContext
            ? "This browser can't get your location — drag the pin instead."
            : "Location access needs a secure (https) connection — drag the pin instead."}
        </p>
      )}

      {geo.errorMessage ? (
        <p className="text-caption text-danger mt-1">{geo.errorMessage}</p>
      ) : null}
      {geo.accuracyNote ? (
        <p className="text-caption mt-1 text-neutral-500">{geo.accuracyNote}</p>
      ) : null}

      <p className="text-caption mt-1 text-neutral-500">{caption}</p>
    </div>
  );
}
