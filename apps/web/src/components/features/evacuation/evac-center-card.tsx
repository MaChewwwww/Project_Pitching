import * as React from "react";
import { ExternalLink, MapPin, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber, osmDirectionsUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicEvacCenter } from "@/lib/api/public-types";

/**
 * An evacuation centre (FR-PUB-008, FR-EVC-001/002/003).
 *
 * Name and address come from the joined `facility` row — `evac_center` carries
 * only capacity and status.
 *
 * **Occupancy is derived**, counted from open check-ins rather than stored, so it
 * can never drift from reality the way a maintained counter does. The card shows
 * it against capacity because "180 of 320" is the number somebody deciding where
 * to go actually needs.
 *
 * FR-EVC-003 asks for directions. Until the Leaflet map ships, that is an
 * external OpenStreetMap link — a link is not a map view, and this is the honest
 * version of the gap rather than a decorative static image pretending to be one.
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

  return (
    <Card
      radius="xl"
      className={cn(
        "group card-hover-lift hover:border-primary-300 flex h-full flex-col justify-between overflow-hidden border border-neutral-200/80 bg-white transition-all duration-200",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-h3 group-hover:text-primary-800 font-bold text-neutral-900 transition-colors">
            {center.facility.name}
          </h3>
          <StatusBadge
            kind="evac"
            isOpen={center.is_open}
            isAtCapacity={center.is_at_capacity}
            className="shrink-0 shadow-xs"
          />
        </div>

        {center.facility.address ? (
          <span className="text-body-sm inline-flex items-start gap-2 font-medium text-neutral-600">
            <MapPin aria-hidden className="text-primary-600 mt-0.5 size-4 shrink-0" />
            <span>
              {center.facility.address}
              {center.facility.area_name ? ` · ${center.facility.area_name}` : null}
            </span>
          </span>
        ) : null}

        {center.capacity != null ? (
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3.5">
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
          <p className="text-body-sm leading-relaxed text-neutral-600">{center.notes}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-2">
          <a
            href={osmDirectionsUrl(lon, lat)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-overline text-primary-700 group-hover:text-primary-800 focus-visible:ring-ring bg-primary-50 hover:bg-primary-600 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-bold tracking-wider transition-all hover:text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            Get directions
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens OpenStreetMap in a new tab)</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
