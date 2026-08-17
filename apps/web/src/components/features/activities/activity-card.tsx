import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";

import { formatPhtTime, phtDayOfMonth, phtMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityType, PublicActivity } from "@/lib/api/public-types";

/** Upcoming community activity (FR-PUB-006, FR-ACT-003). */

const TYPE_LABEL: Record<ActivityType, string> = {
  drill: "Drill",
  seminar: "Seminar",
  first_aid: "First Aid",
  cleanup: "Clean-up",
  tree_planting: "Tree Planting",
  ngo_program: "NGO Program",
  other: "Activity",
};

export function ActivityCard({
  activity,
  className,
}: {
  activity: PublicActivity;
  className?: string;
}) {
  const dateDay = phtDayOfMonth(activity.starts_at).padStart(2, "0");

  return (
    <Link
      href={`/activities/${activity.slug}` as Route}
      className={cn(
        "group focus-visible:ring-primary-600 block h-full rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label={`Read Activity: ${activity.title}`}
    >
      <article className="hover:border-primary-600 relative flex h-full flex-col overflow-hidden rounded-[20px] border border-neutral-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/5">
        {/* Cover Image / Gradient Header */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
          {activity.cover_image ? (
            <>
              <Image
                src={activity.cover_image.url}
                alt=""
                fill
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            </>
          ) : (
            <div className="from-primary-950 via-primary-900 relative flex h-full w-full flex-col justify-between bg-gradient-to-br to-neutral-900 p-4 text-white">
              <div
                aria-hidden
                className="absolute -right-8 -bottom-10 size-44 rounded-full border-[20px] border-white/10"
              />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-primary-200 text-[11px] font-bold tracking-wider uppercase">
                  San Jose Activity
                </span>
              </div>
              <div className="font-display relative z-10 text-sm font-semibold tracking-tight text-white/90">
                Community & Youth
              </div>
            </div>
          )}

          {/* Top Overlays: Category Badge (Left) & Date Block (Right) */}
          <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
            <span className="bg-primary-700 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-xs">
              {TYPE_LABEL[activity.type]}
            </span>

            <time
              dateTime={activity.starts_at}
              className="bg-primary-700 border-primary-500/80 inline-grid min-w-14 place-items-center rounded-lg border px-2 py-1.5 text-white shadow-md"
              aria-label={`${phtMonthShort(activity.starts_at)} ${dateDay}`}
            >
              <span className="text-primary-100 text-[10px] font-extrabold tracking-[0.16em] uppercase">
                {phtMonthShort(activity.starts_at)}
              </span>
              <span className="font-display text-2xl leading-6 font-bold tracking-tight tabular-nums">
                {dateDay}
              </span>
            </time>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display group-hover:text-primary-800 line-clamp-2 text-lg leading-snug font-bold tracking-tight text-neutral-900 transition-colors">
            {activity.title}
          </h3>

          {activity.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">
              {activity.excerpt}
            </p>
          ) : null}

          {/* Pinned Card Schedule Footer */}
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-neutral-100 pt-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-neutral-500">
              <span className="inline-flex items-center gap-1.5 truncate">
                <CalendarClock
                  aria-hidden
                  className="text-primary-600 size-3.5 shrink-0"
                />
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
                <span className="inline-flex items-start gap-1.5 truncate">
                  <MapPin
                    aria-hidden
                    className="text-primary-600 mt-0.5 size-3.5 shrink-0"
                  />
                  <span className="truncate">
                    {activity.venue}
                    {activity.area_name ? ` · ${activity.area_name}` : null}
                  </span>
                </span>
              ) : null}
            </div>

            <span
              aria-hidden
              className="group-hover:border-primary-600 group-hover:bg-primary-600 grid size-8 shrink-0 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 transition-all duration-300 group-hover:text-white"
            >
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
