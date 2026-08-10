import * as React from "react";
import { Compass, MapPin, Navigation, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber, googleMapsDirectionsUrl, osmDirectionsUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicEvacCenter } from "@/lib/api/public-types";

/**
 * An evacuation centre (FR-PUB-008, FR-EVC-001/002/003).
 */
export function EvacCenterCard({
  center,
  className,
}: {
  center: PublicEvacCenter;
  className?: string;
}) {
  const [lon, lat] = center.facility.location.coordinates;
  const tone = center.is_at_capacity
    ? "danger"
    : (center.occupancy_pct ?? 0) > 75
      ? "warning"
      : "primary";

  const gmapsUrl = googleMapsDirectionsUrl(lon, lat, center.facility.name);
  const osmUrl = osmDirectionsUrl(lon, lat);

  return (
    <Card
      radius="xl"
      className={cn(
        "group card-hover-lift hover:border-primary-400 relative flex h-full flex-col justify-between overflow-hidden border border-neutral-200/80 bg-white transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Subtle top accent bar */}
      <div
        className={cn(
          "h-1.5 w-full",
          center.is_at_capacity
            ? "bg-red-500"
            : center.is_open
              ? "bg-emerald-500"
              : "bg-neutral-300",
        )}
      />

      <CardContent className="flex h-full flex-col gap-3.5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {center.facility.area_name && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md w-fit">
                {center.facility.area_name}
              </span>
            )}
            <h3 className="text-h3 group-hover:text-primary-800 font-bold text-neutral-900 transition-colors leading-tight">
              {center.facility.name}
            </h3>
          </div>
          <StatusBadge
            kind="evac"
            isOpen={center.is_open}
            isAtCapacity={center.is_at_capacity}
            className="shrink-0 shadow-xs mt-0.5"
          />
        </div>

        {center.facility.address ? (
          <span className="text-body-sm inline-flex items-start gap-2 font-medium text-neutral-600">
            <MapPin aria-hidden className="text-primary-600 mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{center.facility.address}</span>
          </span>
        ) : null}

        {center.capacity != null ? (
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
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

        {center.notes ? (
          <div className="rounded-lg bg-amber-50/60 border border-amber-200/50 p-2.5">
            <p className="text-xs leading-relaxed text-amber-900 font-medium">
              💡 {center.notes}
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Navigation aria-hidden className="size-3.5 fill-white/20" />
            Directions (Google Maps)
          </a>

          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors underline-offset-2 hover:underline"
            title="Open on OpenStreetMap"
          >
            <Compass aria-hidden className="size-3" />
            OSM
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

