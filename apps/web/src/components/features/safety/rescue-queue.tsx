import { LifeBuoy, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import { toTelHref } from "@/lib/format";
import type { RescueRequestOut } from "@/lib/api/safety-types";

/**
 * FR-SAF-010 — the admin/BHW rescue queue. Cards, not a table, even on
 * desktop: this is the one screen guaranteed to be used on a phone, and a
 * multi-column table forces horizontal scroll exactly when someone is
 * trying to read a description under pressure.
 *
 * Ordering comes from the server (`priority DESC, created_at`) — this
 * component never re-sorts, so what an officer sees always matches what
 * the API decided is most urgent.
 */
export function RescueQueue({
  items,
  onTriage,
}: {
  items: RescueRequestOut[];
  onTriage: (request: RescueRequestOut) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-body-sm py-8 text-center text-neutral-500">
          No rescue requests right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((request) => (
        <Card key={request.id} radius="lg" topAccent>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide border shadow-2xs",
                    (request.priority ?? 3) >= 5
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : (request.priority ?? 3) === 4
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : (request.priority ?? 3) === 3
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-50 text-slate-700 border-slate-200",
                  )}
                  title={`Priority: ${request.priority ?? 3} (1-5 scale)`}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      (request.priority ?? 3) >= 5
                        ? "bg-rose-600 animate-pulse"
                        : (request.priority ?? 3) === 4
                          ? "bg-amber-500"
                          : (request.priority ?? 3) === 3
                            ? "bg-emerald-600"
                            : "bg-slate-400",
                    )}
                  />
                  <span>P{request.priority ?? 3}</span>
                  <span className="text-[10px] font-bold opacity-80">
                    {(request.priority ?? 3) >= 5
                      ? "Critical"
                      : (request.priority ?? 3) === 4
                        ? "High"
                        : (request.priority ?? 3) === 3
                          ? "Standard"
                          : "Low"}
                  </span>
                </span>
                <StatusBadge kind="rescue" status={request.status} />
                {/* Neutral, never a demotion — BR-5.9 requires an anonymous
                    request to never read as lower-priority than a registered
                    one, and that includes the visual language. */}
                {!request.is_registered ? (
                  <Badge tone="neutral">Unregistered</Badge>
                ) : null}
                {request.priority_is_manual ? (
                  <Badge tone="neutral" outline>
                    Manual priority
                  </Badge>
                ) : null}
              </div>
              {request.contact_number ? (
                <a
                  href={toTelHref(request.contact_number)}
                  className="text-primary-700 text-body-sm inline-flex items-center gap-1 font-semibold"
                >
                  <Phone aria-hidden className="size-3.5" />
                  {request.contact_number}
                </a>
              ) : null}
            </div>

            <p className="text-body-sm font-semibold text-neutral-900">
              {request.requester_name}
            </p>
            {/* Never truncated — this text is the triage input. */}
            <p className="text-body-sm text-neutral-700">{request.description}</p>

            {request.people_count ? (
              <p className="text-caption text-neutral-500">
                {request.people_count} people
              </p>
            ) : null}

            {request.location_note ? (
              <p className="text-caption flex items-center gap-1 text-neutral-500">
                <MapPin aria-hidden className="size-3.5" />
                {request.location_note}
              </p>
            ) : null}

            {request.priority_factors.length > 0 ? (
              <p className="text-caption text-neutral-500">
                Factors: {request.priority_factors.join(", ")}
              </p>
            ) : null}

            {request.household_reference_no ? (
              <p className="text-caption text-neutral-500">
                Matched household {request.household_reference_no}
                {request.area_name ? ` — ${request.area_name}` : ""}
              </p>
            ) : null}

            {request.assigned_to_name ? (
              <p className="text-caption text-neutral-500">
                Assigned to {request.assigned_to_name}
              </p>
            ) : null}

            {request.resolution_note ? (
              <p className="text-caption text-neutral-500">
                Note: {request.resolution_note}
              </p>
            ) : null}

            <Button
              type="button"
              size="sm"
              onClick={() => onTriage(request)}
              className="self-start"
            >
              <LifeBuoy aria-hidden className="size-4" />
              Triage
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
