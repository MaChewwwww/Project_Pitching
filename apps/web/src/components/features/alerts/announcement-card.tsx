import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  CalendarClock,
  Info,
  MapPin,
  Megaphone,
  TriangleAlert,
  User,
} from "lucide-react";

import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicAnnouncement } from "@/lib/api/public-types";

type AnnouncementCardVariant = "feed" | "lead" | "support";

export interface AnnouncementCardProps {
  announcement: PublicAnnouncement;
  clamp?: boolean;
  className?: string;
  variant?: AnnouncementCardVariant;
}

function StoryMeta({
  announcement,
  isEmergency = false,
}: {
  announcement: PublicAnnouncement;
  isEmergency?: boolean;
}) {
  const iconTone = isEmergency ? "text-red-600" : "text-primary-600";

  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-neutral-500">
      <span className="inline-flex items-center gap-1.5 truncate">
        <MapPin aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
        <span className="truncate">
          {announcement.area_names.length > 0
            ? announcement.area_names.join(", ")
            : "Barangay-wide"}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 truncate">
        <User aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
        <span className="truncate">{announcement.issued_by_name}</span>
      </span>
    </div>
  );
}

function ContinueMark({ isEmergency = false }: { isEmergency?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-300 group-hover:translate-x-1",
        isEmergency
          ? "border-red-200 bg-red-50 text-red-700 group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white"
          : "border-neutral-200 bg-neutral-50 text-neutral-700 group-hover:border-primary-600 group-hover:bg-primary-600 group-hover:text-white",
      )}
    >
      <ArrowRight className="size-4" />
    </span>
  );
}

export function AnnouncementCard({
  announcement,
  clamp = false,
  className,
}: AnnouncementCardProps) {
  const isAlert = announcement.kind === "alert";
  const isEmergency = isAlert && announcement.severity === "emergency";
  const href = `/announcements/${announcement.slug}` as Route;
  const summary = announcement.excerpt || announcement.body;

  let badgeLabel = "Announcement";
  let badgeStyle = "bg-emerald-700 text-white";
  let BadgeIcon: React.ElementType = Megaphone;

  if (announcement.kind === "announcement") {
    badgeLabel = "Announcement";
    badgeStyle = "bg-emerald-700 text-white font-bold";
    BadgeIcon = Megaphone;
  } else if (announcement.kind === "alert") {
    if (announcement.severity === "info") {
      badgeLabel = "Advisory";
      badgeStyle = "bg-yellow-400 text-neutral-950 font-bold";
      BadgeIcon = Info;
    } else if (announcement.severity === "warning") {
      badgeLabel = "Warning";
      badgeStyle = "bg-orange-500 text-white font-bold";
      BadgeIcon = TriangleAlert;
    } else {
      // emergency or fallback for alert
      badgeLabel = "Emergency Alert";
      badgeStyle = "bg-red-600 text-white font-bold";
      BadgeIcon = TriangleAlert;
    }
  }

  return (
    <Link
      href={href}
      className={cn(
        "group focus-visible:ring-primary-600 block h-full rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label={`Read ${isAlert ? "alert" : "announcement"}: ${announcement.title}`}
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[20px] border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/5",
          isEmergency
            ? "border-red-200/90 hover:border-red-400 shadow-xs"
            : "border-neutral-200/80 hover:border-primary-300 shadow-xs",
        )}
      >
        {/* Cover Image Header (Symmetrical aspect ratio) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
          {announcement.cover_image ? (
            <>
              <Image
                src={announcement.cover_image.url}
                alt={announcement.cover_image.alt_text}
                fill
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            </>
          ) : (
            <div
              className={cn(
                "relative flex h-full w-full flex-col justify-between p-4 text-white",
                isEmergency
                  ? "bg-gradient-to-br from-red-950 via-rose-900 to-neutral-900"
                  : "bg-gradient-to-br from-primary-950 via-primary-900 to-neutral-900",
              )}
            >
              <div
                aria-hidden
                className="absolute -right-8 -bottom-10 size-44 rounded-full border-[20px] border-white/10"
              />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Official Notice
                </span>
                {isAlert ? (
                  <TriangleAlert className="size-5 text-red-400 opacity-80" />
                ) : null}
              </div>
              <div className="relative z-10 font-display text-sm font-semibold tracking-tight text-white/90">
                Barangay San Jose
              </div>
            </div>
          )}

          {/* Top Header Overlay: Badge (Left) & Date (Right) */}
          <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-xs",
                badgeStyle,
              )}
            >
              <BadgeIcon aria-hidden className="size-3.5 shrink-0" />
              {badgeLabel}
            </span>

            {announcement.published_at ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs backdrop-blur-sm">
                <CalendarClock aria-hidden className="size-3 shrink-0 text-white/80" />
                <time dateTime={announcement.published_at}>
                  {formatPhtDateTime(announcement.published_at)}
                </time>
              </span>
            ) : null}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-5">
          <h3
            className={cn(
              "font-display text-lg font-bold leading-snug tracking-tight text-neutral-900 transition-colors line-clamp-2",
              isEmergency ? "group-hover:text-red-600" : "group-hover:text-primary-700",
            )}
          >
            {announcement.title}
          </h3>

          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-neutral-600",
              clamp ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {summary}
          </p>

          {/* Immediate Guidance Callout Box for Emergency Alerts */}
          {isAlert && announcement.instruction ? (
            <div className="mt-3.5 rounded-xl border border-red-200/90 bg-red-50/80 p-3 text-xs leading-relaxed text-red-950 shadow-xs">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                Immediate Guidance
              </span>
              <p className="font-medium line-clamp-2">{announcement.instruction}</p>
            </div>
          ) : null}

          {/* Pinned Card Footer */}
          <div className="mt-auto flex items-end justify-between gap-3 pt-5 border-t border-neutral-100">
            <StoryMeta announcement={announcement} isEmergency={isEmergency} />
            <ContinueMark isEmergency={isEmergency} />
          </div>
        </div>
      </article>
    </Link>
  );
}
