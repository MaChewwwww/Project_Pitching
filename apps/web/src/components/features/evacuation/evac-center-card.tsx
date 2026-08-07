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
    <Card radius="xl" className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-h3 text-neutral-900">{center.facility.name}</h3>
          <StatusBadge
            kind="evac"
            isOpen={center.is_open}
            isAtCapacity={center.is_at_capacity}
            className="shrink-0"
          />
        </div>

        {center.facility.address ? (
          <span className="text-body-sm inline-flex items-start gap-1.5 text-neutral-600">
            <MapPin aria-hidden className="mt-1 size-3.5 shrink-0 text-neutral-400" />
            {center.facility.address}
            {center.facility.area_name ? ` · ${center.facility.area_name}` : null}
          </span>
        ) : null}

        {center.capacity != null ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-overline inline-flex items-center gap-1.5 text-neutral-500">
                <Users aria-hidden className="size-3" />
                Occupancy
              </span>
              <span className="text-body-sm tabular font-semibold text-neutral-800">
                {formatNumber(center.occupancy)} of {formatNumber(center.capacity)}
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
          <p className="text-body-sm text-neutral-600">{center.notes}</p>
        ) : null}

        <div className="mt-auto pt-2">
          <a
            href={osmDirectionsUrl(lon, lat)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-overline text-primary-700 hover:text-primary-800 focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
