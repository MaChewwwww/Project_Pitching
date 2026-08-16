import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CalendarClock, MapPin } from "lucide-react";

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
      className="group focus-visible:ring-primary-600 block h-full rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={`Read activity: ${activity.title}`}
    >
      <Card
        radius="xl"
        className={cn("h-full overflow-hidden border-neutral-200/90", className)}
        interactive
      >
        {activity.cover_image ? (
          <div className="relative block aspect-[16/9] bg-neutral-100">
            <Image
              src={activity.cover_image.url}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : null}
        <CardContent className="relative flex h-full gap-4 p-5 md:p-6">
          {/* The date block stays the card's primary recognition device. */}
          <div className="bg-primary-800 ring-primary-100 flex size-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-md ring-4 transition-transform duration-200 group-hover:-translate-y-1">
            <span className="text-2xl leading-none font-black tabular-nums">
              {phtDayOfMonth(activity.starts_at)}
            </span>
            <span className="text-primary-200 mt-1 text-[10px] font-bold tracking-[0.16em] uppercase">
              {phtMonthShort(activity.starts_at)}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Badge tone="primary" className="self-start">
              {TYPE_LABEL[activity.type]}
            </Badge>

            <h3 className="text-h4 group-hover:text-primary-800 leading-snug text-neutral-900 transition-colors">
              {activity.title}
            </h3>

            {activity.excerpt ? (
              <p className="text-body-sm text-neutral-600">{activity.excerpt}</p>
            ) : null}

            <div className="mt-auto flex flex-col gap-1.5 pt-2 text-neutral-500">
              <span className="text-caption inline-flex items-center gap-1.5">
                <CalendarClock aria-hidden className="text-primary-600 size-3 shrink-0" />
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
                <span className="text-caption inline-flex items-start gap-1.5">
                  <MapPin
                    aria-hidden
                    className="text-primary-600 mt-0.5 size-3 shrink-0"
                  />
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
