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
  className?: string;
}

export function AnnouncementCard({ announcement, className }: AnnouncementCardProps) {
  const isAlert = announcement.kind === "alert";
  const urgent = isAlert && (announcement.alert_level ?? 0) >= 2;

  return (
    <Card
      radius="xl"
      className={cn(
        "h-full",
        isAlert && "border-l-[3px]",
        urgent && "border-l-danger bg-danger-bg/30",
        isAlert && !urgent && "border-l-warning bg-warning-bg/30",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.alert_level != null ? (
            <StatusBadge kind="alert" level={announcement.alert_level} />
          ) : announcement.severity ? (
            <StatusBadge kind="severity" value={announcement.severity} />
          ) : null}
          {!announcement.is_active ? (
            <span className="text-caption rounded-sm bg-neutral-100 px-1.5 py-0.5 font-semibold text-neutral-600">
              Ended
            </span>
          ) : null}
        </div>

        <h3 className="text-h3 text-neutral-900">{announcement.title}</h3>

        <p className="text-body text-neutral-600">{announcement.body}</p>

        {announcement.instruction ? (
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <p className="text-overline text-primary-700 mb-1">What to do</p>
            <p className="text-body-sm text-neutral-700">{announcement.instruction}</p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-1 pt-1">
          <span className="text-caption inline-flex items-center gap-1.5 text-neutral-500">
            <MapPin aria-hidden className="size-3" />
            {announcement.area_names.length > 0
              ? announcement.area_names.join(", ")
              : "Barangay-wide"}
          </span>
          <span className="text-caption inline-flex items-center gap-1.5 text-neutral-500">
            <CalendarClock aria-hidden className="size-3" />
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
