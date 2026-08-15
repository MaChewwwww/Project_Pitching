"use client";

import * as React from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import { useGeolocation } from "@/hooks/use-geolocation";
import { BARANGAY_VIEW, OSM_TILE_ATTRIBUTION, OSM_TILE_URL } from "@/lib/map";
import {
  loadHazardGeoJson,
  waterwayProximityForPoint,
  type WaterwayProximity,
} from "@/lib/hazard-geojson";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
  /** Render a saved pin without allowing the viewer to move it. */
  readOnly?: boolean;
  /** Overrides the helper caption under the map — the default assumes a
   * household pin, which reads wrong on non-registration callers (e.g. the
   * public rescue form). */
  caption?: string;
  /** Boundary-derived area context; exact street address is entered by the user. */
  onResolve?: (resolution: PointResolution) => void;
  /** Show a blocking error when a household pin is outside San Jose. */
  restrictToBarangay?: boolean;
  /** Let a form clear or reject an invalid outside-boundary pin. */
  onBoundaryViolation?: () => void;
}

export interface PointResolution {
  latitude: number;
  longitude: number;
  within_barangay: boolean;
  area_id: string | null;
  area_name: string | null;
  /** Reserved for API compatibility; no street-level address is inferred. */
  address_label: string | null;
  /** Default derived from the static flood hazard layer when available. */
  waterway_proximity?: WaterwayProximity | null;
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
  readOnly = false,
  caption = "Drag the pin, or tap the map, to mark your household's location.",
  onResolve,
  restrictToBarangay = false,
  onBoundaryViolation,
}: LocationPickerProps) {
  const center = value ?? { lat: BARANGAY_VIEW.center[0], lng: BARANGAY_VIEW.center[1] };
  const markerRef = React.useRef<L.Marker>(null);
  const placeRequestRef = React.useRef(0);
  const geo = useGeolocation();
  const [boundaryDialogOpen, setBoundaryDialogOpen] = React.useState(false);

  const place = React.useCallback(
    (next: LatLng) => {
      onChange(next);
      if (readOnly || (!onResolve && !restrictToBarangay && !onBoundaryViolation)) return;
      const requestId = ++placeRequestRef.current;
      void api
        .get<PointResolution>("/public/areas/resolve-point", {
          params: { latitude: next.lat, longitude: next.lng },
        })
        .then(async (response) => {
          if (requestId !== placeRequestRef.current) return;
          const resolution = response.data;
          if (!resolution.within_barangay) {
            if (restrictToBarangay) setBoundaryDialogOpen(true);
            onBoundaryViolation?.();
            onResolve?.({ ...resolution, waterway_proximity: null });
            return;
          }

          const hazardData = await loadHazardGeoJson();
          if (requestId !== placeRequestRef.current) return;
          onResolve?.({
            ...resolution,
            waterway_proximity: waterwayProximityForPoint(
              hazardData,
              resolution.latitude,
              resolution.longitude,
            ),
          });
        })
        .catch(() => undefined);
    },
    [onBoundaryViolation, onChange, onResolve, readOnly, restrictToBarangay],
  );

  React.useEffect(() => {
    if (!readOnly && geo.fix) place({ lat: geo.fix.lat, lng: geo.fix.lng });
    // `onChange` is a stable RHF `field.onChange` at every call site — same
    // rationale as `use-registration-draft.ts`'s `form` dependency omission.
  }, [geo.fix, place, readOnly]);

  return (
    <div className={className}>
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-neutral-200">
        <MapContainer
          center={center}
          zoom={value ? 16 : BARANGAY_VIEW.zoom}
          className="h-full w-full"
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_URL} />
          <ZoomControl position="topright" />
          {!readOnly ? <ClickToPlace onChange={place} /> : null}
          {!readOnly ? <FlyToFix fix={geo.fix} /> : null}
          {value ? (
            <Marker
              ref={markerRef}
              position={center}
              draggable={!readOnly}
              eventHandlers={
                readOnly
                  ? undefined
                  : {
                      dragend: () => {
                        const marker = markerRef.current;
                        if (!marker) return;
                        const pos = marker.getLatLng();
                        place({ lat: pos.lat, lng: pos.lng });
                      },
                    }
              }
            />
          ) : null}
        </MapContainer>

        {/* Floating Top-Left "Use My Current Location" Button */}
        {!readOnly && geo.isSupported ? (
          <div className="absolute top-2.5 left-2.5 z-[1000] pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                geo.locate();
              }}
              disabled={geo.status === "locating"}
              title="Locate my GPS position"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/90 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition-all hover:bg-white hover:text-emerald-700 hover:border-emerald-400 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <LocateFixed
                className={cn(
                  "size-3.5 text-emerald-600",
                  geo.status === "locating" && "animate-spin text-emerald-700",
                )}
              />
              {geo.status === "locating" ? "Locating GPS…" : "Use My Current Location"}
            </button>
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="mt-2 flex flex-col-reverse gap-1.5 sm:flex-row-reverse sm:items-center sm:justify-between">
          <p className="text-caption text-neutral-500">{caption}</p>
        </div>
      ) : (
        <p className="text-caption mt-2 text-neutral-500">{caption}</p>
      )}

      {!readOnly && geo.errorMessage ? (
        <p className="text-caption text-danger mt-1">{geo.errorMessage}</p>
      ) : null}
      {!readOnly && geo.accuracyNote ? (
        <p className="text-caption mt-1 text-neutral-500">{geo.accuracyNote}</p>
      ) : null}

      <Dialog open={boundaryDialogOpen} onOpenChange={setBoundaryDialogOpen}>
        <DialogContent className="max-w-md border-red-200">
          <DialogHeader>
            <DialogTitle className="text-red-800">
              Location outside Barangay San Jose
            </DialogTitle>
            <DialogDescription>
              That location is outside the Barangay San Jose boundary. Choose a point
              inside the barangay to continue this household registration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setBoundaryDialogOpen(false)}>
              Choose another location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
