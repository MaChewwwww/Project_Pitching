"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/common/button";
import { useGeolocation } from "@/hooks/use-geolocation";
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

// Bundler asset URLs break Leaflet's own icon-path lookup unless fixed up
// front — the well-known "marker icon missing" bug with every bundler, and
// one that behaves differently between webpack and Turbopack: importing the
// PNGs directly from `leaflet/dist/images` built fine but produced icons
// with no resolvable `iconUrl` at runtime under Turbopack (confirmed live —
// "iconUrl not set in Icon options"). Pointing at the same version's CDN
// copy sidesteps the bundler entirely; the OSM tiles below are already an
// external fetch, so this adds no new category of dependency.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  const center = value ?? { lat: BARANGAY_CENTER.lat, lng: BARANGAY_CENTER.lon };
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
          zoom={value ? 16 : 14}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
