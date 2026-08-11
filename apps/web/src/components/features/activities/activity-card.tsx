import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { formatPhtTime, phtDayOfMonth, phtMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityType, PublicActivity } from "@/lib/api/public-types";

/** Upcoming community activity (FR-PUB-006, FR-ACT-003). */

const TYPE_LABEL: Record<ActivityType, string> = {
  drill: "Drill",
  seminar: "Seminar",
  first_aid: "First aid",
  cleanup: "Clean-up",
  tree_planting: "Tree planting",
  ngo_program: "NGO program",
  other: "Activity",
};

export function ActivityCard({
  activity,
  className,
}: {
  activity: PublicActivity;
  className?: string;
}) {
  return (
    <Link
      href={`/activities/${activity.slug}` as Route}
      className="group block h-full rounded-[20px] focus-visible:ring-primary-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={`Read activity: ${activity.title}`}
    >
    <Card radius="xl" className={cn("h-full overflow-hidden", className)} interactive>
      {activity.cover_image ? (
        <div className="relative block aspect-video bg-neutral-100">
          <Image
            src={activity.cover_image.url}
            alt={activity.cover_image.alt_text}
            fill
            className="object-cover"
          />
        </div>
      ) : null}
      <CardContent className="flex h-full gap-4">
        {/* Date block — the reference layout's calendar chip */}
        <div className="bg-primary-800 flex size-14 shrink-0 flex-col items-center justify-center rounded-md text-white">
          <span className="text-h2 tabular leading-none">
            {phtDayOfMonth(activity.starts_at)}
          </span>
          <span className="text-overline text-primary-200 mt-0.5">
            {phtMonthShort(activity.starts_at)}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Badge tone="primary" className="self-start">
            {TYPE_LABEL[activity.type]}
          </Badge>

          <h3 className="text-h4 text-neutral-900">
            {activity.title}
          </h3>

          {activity.excerpt ? (
            <p className="text-body-sm text-neutral-600">{activity.excerpt}</p>
          ) : null}

          <div className="mt-1 flex flex-col gap-1">
            <span className="text-caption text-neutral-500">
              <time dateTime={activity.starts_at}>
                {formatPhtTime(activity.starts_at)}
              </time>
              {activity.ends_at ? (
                <>
                  {" – "}
                  <time dateTime={activity.ends_at}>
                    {formatPhtTime(activity.ends_at)}
                  </time>
                </>
              ) : null}
            </span>
            {activity.venue ? (
              <span className="text-caption inline-flex items-start gap-1.5 text-neutral-500">
                <MapPin aria-hidden className="mt-0.5 size-3 shrink-0" />
                {activity.venue}
                {activity.area_name ? ` · ${activity.area_name}` : null}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
