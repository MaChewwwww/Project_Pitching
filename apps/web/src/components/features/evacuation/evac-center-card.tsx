import * as React from "react";
import { Compass, MapPin, Navigation, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { formatNumber, googleMapsDirectionsUrl, osmDirectionsUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicEvacCenter } from "@/lib/api/public-types";

/**
 * An evacuation centre card (FR-PUB-008, FR-EVC-001/002/003).
 */
const FACILITY_TYPE_LABELS: Record<string, { label: string; bg: string }> = {
  evacuation_center: {
    label: "Evacuation Center",
    bg: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
  },
  hospital: {
    label: "Hospital",
    bg: "bg-rose-100/90 text-rose-800 border-rose-300/80",
  },
  clinic: {
    label: "Health Clinic",
    bg: "bg-teal-100/90 text-teal-800 border-teal-300/80",
  },
  barangay_hall: {
    label: "Barangay Hall",
    bg: "bg-blue-100/90 text-blue-800 border-blue-300/80",
  },
  police: {
    label: "Police Station",
    bg: "bg-indigo-100/90 text-indigo-800 border-indigo-300/80",
  },
  fire: {
    label: "Fire Station",
    bg: "bg-amber-100/90 text-amber-800 border-amber-300/80",
  },
  rescue_station: {
    label: "Rescue Station",
    bg: "bg-orange-100/90 text-orange-800 border-orange-300/80",
  },
};

export function EvacCenterCard({
  center,
  className,
  showTypeBadge = true,
}: {
  center: PublicEvacCenter;
  className?: string;
  showTypeBadge?: boolean;
}) {
  const [lon, lat] = center.facility.location.coordinates;
  const tone = center.is_at_capacity
    ? "danger"
    : (center.occupancy_pct ?? 0) > 75
      ? "warning"
      : "primary";

  const gmapsUrl = googleMapsDirectionsUrl(lon, lat, center.facility.name);
  const osmUrl = osmDirectionsUrl(lon, lat);

  const rawType = center.facility.type ?? "evacuation_center";
  const typeMeta = FACILITY_TYPE_LABELS[rawType] ?? {
    label: rawType.replace(/_/g, " "),
    bg: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
  };

  return (
    <Card
      radius="xl"
      className={cn(
        "group card-hover-lift hover:border-primary-400 relative flex flex-col overflow-hidden border border-neutral-200/80 bg-white transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-emerald-500" />

      <CardContent className="flex flex-col gap-2.5 p-3.5 sm:p-4">
        {/* Header row / Top badges */}
        {showTypeBadge ? (
          <div className="flex flex-col gap-1.5">
            {/* Badges Row */}
            <div className="flex items-center justify-between gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider border px-2 py-0.5 rounded-md shrink-0 shadow-2xs",
                  typeMeta.bg,
                )}
              >
                {typeMeta.label}
              </span>

              {center.facility.area_name && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
                  {center.facility.area_name}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-h3 group-hover:text-primary-800 font-bold text-neutral-900 transition-colors leading-snug">
              {center.facility.name}
            </h3>
          </div>
        ) : (
          /* Header row when showTypeBadge is false (e.g. /hazard-map page) */
          <div className="flex items-start justify-between gap-2.5">
            <h3 className="text-h3 group-hover:text-primary-800 font-bold text-neutral-900 transition-colors leading-snug">
              {center.facility.name}
            </h3>

            {center.facility.area_name && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-md shrink-0 pt-0.5">
                {center.facility.area_name}
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {center.facility.address ? (
          <span className="text-body-sm inline-flex items-start gap-1.5 font-medium text-neutral-600">
            <MapPin aria-hidden className="text-primary-600 mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{center.facility.address}</span>
          </span>
        ) : null}

        {/* Occupancy meter */}
        {center.capacity != null ? (
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-overline inline-flex items-center gap-1.5 font-bold tracking-wider text-neutral-600">
                <Users aria-hidden className="text-primary-600 size-3.5" />
                Occupancy
              </span>
              <span className="text-body-sm tabular font-bold text-neutral-900">
                {formatNumber(center.occupancy)}{" "}
                <span className="font-normal text-neutral-500">
                  / {formatNumber(center.capacity)} people
                </span>
              </span>
            </div>
            <MeterBar
              value={center.occupancy}
              max={center.capacity}
              tone={tone}
              label={`Occupancy at ${center.facility.name}`}
              valueText={`${center.occupancy} of ${center.capacity} people`}
            />
          </div>
        ) : (
          <p className="text-caption text-neutral-500">Capacity not yet recorded.</p>
        )}

        {/* Buttons row — compact side-by-side on same row */}
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Navigation aria-hidden className="size-3.5 fill-white/20 shrink-0" />
            Directions
          </a>

          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none shrink-0"
            title="Open on OpenStreetMap"
          >
            <Compass aria-hidden className="size-3.5 shrink-0" />
            OSM
          </a>
        </div>
      </CardContent>
    </Card>
  );
}


