import * as React from "react";
import { CalendarClock, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicAnnouncement } from "@/lib/api/public-types";

/**
 * One announcement or alert (FR-PUB-003, FR-ALT-004).
 *
 * FR-ALT-004 requires emergency notices be **visually distinct** from routine
 * announcements, so an alert gets the danger palette and a left border rather
 * than only a differently-coloured badge — a difference visible while scrolling
 * past, not only when reading.
 *
 * An alert always shows its `instruction`. A notice that something is wrong
 * without saying what to do is the failure FR-ALT-005 exists to prevent, and the
 * database refuses to store one.
 */

export interface AnnouncementCardProps {
  announcement: PublicAnnouncement;
  /** Truncate the body. On in a grid preview, off on the full feed. */
  clamp?: boolean;
  className?: string;
}

export function AnnouncementCard({
  announcement,
  clamp = false,
  className,
}: AnnouncementCardProps) {
  const isAlert = announcement.kind === "alert";
  const urgent = isAlert && (announcement.alert_level ?? 0) >= 2;

  return (
    <Card
      radius="xl"
      className={cn(
        "group card-hover-lift flex h-full flex-col justify-between overflow-hidden transition-all duration-200",
        isAlert
          ? "border-l-[4px]"
          : "hover:border-primary-300 border border-neutral-200/80",
        urgent ? "border-l-danger from-danger-bg/40 bg-gradient-to-br to-white" : "",
        isAlert && !urgent
          ? "border-l-warning from-warning-bg/40 bg-gradient-to-br to-white"
          : "",
        !isAlert && "bg-white",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-3.5 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {announcement.alert_level != null ? (
              <StatusBadge kind="alert" level={announcement.alert_level} />
            ) : announcement.severity ? (
              <StatusBadge kind="severity" value={announcement.severity} />
            ) : (
              <span className="text-caption text-primary-700 bg-primary-50 border-primary-100 rounded-full border px-2.5 py-1 font-bold tracking-wider uppercase">
                Advisory
              </span>
            )}
            {!announcement.is_active ? (
              <span className="text-caption rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 font-semibold text-neutral-600">
                Ended
              </span>
            ) : (
              <span className="text-caption bg-success-bg text-success border-success-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold">
                <span className="bg-success size-1.5 animate-pulse rounded-full" />
                Active
              </span>
            )}
          </div>
        </div>

        <h3 className="text-h3 group-hover:text-primary-800 leading-snug font-bold text-neutral-900 transition-colors">
          {announcement.title}
        </h3>

        <p
          className={cn(
            "text-body leading-relaxed text-neutral-600",
            clamp && "line-clamp-3",
          )}
        >
          {announcement.body}
        </p>

        {announcement.instruction ? (
          <div className="border-primary-100 bg-primary-50/60 rounded-xl border p-3.5 shadow-sm">
            <p className="text-overline text-primary-800 mb-1 font-bold tracking-wider">
              What to do
            </p>
            <p className="text-body-sm leading-normal font-medium text-neutral-800">
              {announcement.instruction}
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
          <span className="text-caption inline-flex items-center gap-1.5 font-medium text-neutral-500">
            <MapPin aria-hidden className="text-primary-600 size-3.5" />
            {announcement.area_names.length > 0
              ? announcement.area_names.join(", ")
              : "Barangay-wide"}
          </span>
          <span className="text-caption inline-flex items-center gap-1.5 font-medium text-neutral-500">
            <CalendarClock aria-hidden className="text-primary-600 size-3.5" />
            {/* published_at is nullable on the shared type (draft state), but the
                public endpoint this card is always fed from filters those out. */}
            {announcement.published_at ? (
              <time dateTime={announcement.published_at}>
                {formatPhtDateTime(announcement.published_at)}
              </time>
            ) : null}
            {" · "}
            {announcement.issued_by_name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
