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
        "group h-full transition-all duration-200 card-hover-lift flex flex-col justify-between overflow-hidden",
        isAlert ? "border-l-[4px]" : "border border-neutral-200/80 hover:border-primary-300",
        urgent ? "border-l-danger bg-gradient-to-br from-danger-bg/40 to-white" : "",
        isAlert && !urgent ? "border-l-warning bg-gradient-to-br from-warning-bg/40 to-white" : "",
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
              <span className="text-caption font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                Advisory
              </span>
            )}
            {!announcement.is_active ? (
              <span className="text-caption rounded-full bg-neutral-100 px-2.5 py-0.5 font-semibold text-neutral-600 border border-neutral-200">
                Ended
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-caption rounded-full bg-success-bg px-2.5 py-0.5 font-bold text-success border border-success-border">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
            )}
          </div>
        </div>

        <h3 className="text-h3 font-bold text-neutral-900 group-hover:text-primary-800 transition-colors leading-snug">
          {announcement.title}
        </h3>

        <p className={cn("text-body text-neutral-600 leading-relaxed", clamp && "line-clamp-3")}>
          {announcement.body}
        </p>

        {announcement.instruction ? (
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3.5 shadow-sm">
            <p className="text-overline text-primary-800 font-bold mb-1 tracking-wider">What to do</p>
            <p className="text-body-sm font-medium text-neutral-800 leading-normal">{announcement.instruction}</p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-1.5 pt-3 border-t border-neutral-100">
          <span className="text-caption inline-flex items-center gap-1.5 text-neutral-500 font-medium">
            <MapPin aria-hidden className="size-3.5 text-primary-600" />
            {announcement.area_names.length > 0
              ? announcement.area_names.join(", ")
              : "Barangay-wide"}
          </span>
          <span className="text-caption inline-flex items-center gap-1.5 text-neutral-500 font-medium">
            <CalendarClock aria-hidden className="size-3.5 text-primary-600" />
            <time dateTime={announcement.published_at}>
              {formatPhtDateTime(announcement.published_at)}
            </time>
            {" · "}
            {announcement.issued_by_name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
