import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Gift,
  HandHeart,
  Sparkles,
  User,
} from "lucide-react";

import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicDonationDrive } from "@/lib/api/public-types";

export interface DriveCardProps {
  drive: PublicDonationDrive;
  clamp?: boolean;
  className?: string;
}

export function DriveCard({ drive, clamp = false, className }: DriveCardProps) {
  const href = `/donation-drives/${drive.slug}` as Route;
  const summary = drive.excerpt;

  const now = new Date();
  const activeFromDate = drive.active_from ? new Date(drive.active_from) : null;
  const activeUntilDate = drive.active_until ? new Date(drive.active_until) : null;

  const isArchived = Boolean(drive.archived_at);
  const isPast = activeUntilDate ? activeUntilDate < now : false;
  const isUpcoming = activeFromDate ? activeFromDate > now : false;

  let badgeLabel = "Active Drive";
  let badgeStyle = "bg-emerald-700 text-white font-bold";
  let BadgeIcon: React.ElementType = HandHeart;

  if (isArchived || isPast) {
    badgeLabel = "Completed";
    badgeStyle = "bg-slate-700 text-white font-bold";
    BadgeIcon = Gift;
  } else if (isUpcoming) {
    badgeLabel = "Upcoming Drive";
    badgeStyle = "bg-amber-600 text-white font-bold";
    BadgeIcon = Calendar;
  }

  return (
    <Link
      href={href}
      className={cn(
        "group focus-visible:ring-primary-600 block h-full w-full min-w-0 rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label={`Read donation drive: ${drive.title}`}
    >
      <article
        className={cn(
          "relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/5",
          isArchived || isPast
            ? "border-neutral-200/80 shadow-xs hover:border-slate-400"
            : "border-emerald-200/80 shadow-xs hover:border-emerald-600",
        )}
      >
        {/* Cover Image Header */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
          {drive.cover_image ? (
            <>
              <Image
                src={drive.cover_image.url}
                alt=""
                fill
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            </>
          ) : (
            <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-br from-emerald-950 via-emerald-900 to-neutral-900 p-4 text-white">
              <div
                aria-hidden
                className="absolute -right-8 -bottom-10 size-44 rounded-full border-[20px] border-white/10"
              />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-white/70 uppercase">
                  Official Relief Notice
                </span>
                <HandHeart className="size-5 text-emerald-400 opacity-80" />
              </div>
              <div className="font-display relative z-10 text-sm font-semibold tracking-tight text-white/90">
                Barangay San Jose
              </div>
            </div>
          )}

          {/* Top Header Overlay: Badge & Date */}
          <div className="absolute inset-x-3 top-3 z-10 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-xs",
                badgeStyle,
              )}
            >
              <BadgeIcon aria-hidden className="size-3.5 shrink-0" />
              {badgeLabel}
            </span>

            {drive.published_at ? (
              <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs backdrop-blur-sm">
                <CalendarClock aria-hidden className="size-3 shrink-0 text-white/80" />
                <time className="truncate" dateTime={drive.published_at}>
                  {formatPhtDateTime(drive.published_at)}
                </time>
              </span>
            ) : null}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <h3 className="font-display line-clamp-2 text-lg leading-snug font-bold tracking-tight text-neutral-900 transition-colors group-hover:text-emerald-700">
            {drive.title}
          </h3>

          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-neutral-600",
              clamp ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {summary}
          </p>

          {/* Drop-off Callout */}
          {drive.drop_off_instructions ? (
            <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs leading-relaxed text-emerald-950 shadow-2xs">
              <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                Drop-off Instructions
              </span>
              <p className="line-clamp-2 font-medium">{drive.drop_off_instructions}</p>
            </div>
          ) : null}

          {/* Pinned Card Footer */}
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-neutral-100 pt-5">
            <div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-neutral-500">
              <span className="inline-flex items-center gap-1.5 truncate">
                <User aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  {drive.organizer_name || "Barangay San Jose Relief Desk"}
                </span>
              </span>

              {drive.event_name ? (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Sparkles aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate font-semibold text-emerald-800">
                    {drive.event_name}
                  </span>
                </span>
              ) : null}

              {drive.active_until ? (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Calendar aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    Active until {formatPhtDateTime(drive.active_until)}
                  </span>
                </span>
              ) : null}
            </div>

            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 transition-all duration-300 group-hover:translate-x-1 group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
            >
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
