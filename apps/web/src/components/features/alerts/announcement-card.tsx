import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, CalendarClock, MapPin, TriangleAlert } from "lucide-react";

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
  inverse = false,
}: {
  announcement: PublicAnnouncement;
  inverse?: boolean;
}) {
  const tone = inverse ? "text-white/70" : "text-neutral-500";
  const iconTone = inverse ? "text-white/85" : "text-primary-600";

  return (
    <div className={cn("text-caption flex min-w-0 flex-col gap-1.5 font-medium", tone)}>
      <span className="inline-flex items-center gap-1.5">
        <MapPin aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
        {announcement.area_names.length > 0
          ? announcement.area_names.join(", ")
          : "Barangay-wide"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
        {announcement.published_at ? (
          <time dateTime={announcement.published_at}>
            {formatPhtDateTime(announcement.published_at)}
          </time>
        ) : null}
        <span aria-hidden> / </span>
        <span className="truncate">{announcement.issued_by_name}</span>
      </span>
    </div>
  );
}

function StoryType({
  announcement,
  inverse = false,
}: {
  announcement: PublicAnnouncement;
  inverse?: boolean;
}) {
  const isAlert = announcement.kind === "alert";
  const label = isAlert
    ? announcement.severity === "emergency"
      ? "Emergency alert"
      : "Safety alert"
    : announcement.severity === "warning"
      ? "Advisory"
      : "Barangay notice";

  return (
    <span
      className={cn(
        "text-overline inline-flex items-center gap-1.5 font-bold",
        inverse ? "text-white/80" : isAlert ? "text-danger" : "text-primary-700",
      )}
    >
      {isAlert ? (
        <TriangleAlert aria-hidden className="size-3.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}

function ContinueMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1",
        inverse
          ? "group-hover:text-danger border-white/25 bg-white/10 text-white group-hover:bg-white"
          : "border-primary-200 text-primary-700 group-hover:bg-primary-700 bg-white group-hover:text-white",
      )}
    >
      <ArrowUpRight className="size-4" />
    </span>
  );
}

export function AnnouncementCard({
  announcement,
  clamp = false,
  className,
  variant = "feed",
}: AnnouncementCardProps) {
  const isAlert = announcement.kind === "alert";
  const href = `/announcements/${announcement.slug}` as Route;
  const summary = announcement.excerpt || announcement.body;

  if (variant === "lead") {
    if (isAlert) {
      return (
        <Link
          href={href}
          className="group focus-visible:ring-danger block h-full rounded-[24px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Read alert: ${announcement.title}`}
        >
          <article
            className={cn(
              "bg-danger relative flex h-full min-h-[30rem] flex-col overflow-hidden rounded-[24px] px-6 py-7 text-white shadow-[0_18px_40px_rgba(185,28,28,0.16)] sm:px-8 sm:py-9",
              className,
            )}
          >
            <div
              aria-hidden
              className="absolute -right-20 -bottom-24 size-72 rounded-full border-[36px] border-white/10"
            />
            <div
              aria-hidden
              className="absolute right-9 bottom-10 h-px w-24 bg-white/30"
            />
            <div className="relative flex items-start justify-between gap-4">
              <StoryType announcement={announcement} inverse />
              <span className="text-overline rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white">
                Official update
              </span>
            </div>
            <div className="relative my-auto max-w-xl py-9">
              <h3 className="font-display text-display-md leading-[0.98] font-black tracking-tight text-white">
                {announcement.title}
              </h3>
              <p className="text-body mt-5 max-w-lg leading-relaxed text-white/85">
                {summary}
              </p>
              {announcement.instruction ? (
                <div className="mt-6 border-l-2 border-white/70 bg-white/10 py-1 pr-4 pl-4 backdrop-blur-sm">
                  <p className="text-overline font-bold text-white/75">
                    Immediate guidance
                  </p>
                  <p className="text-body-sm mt-1.5 leading-relaxed font-medium text-white">
                    {announcement.instruction}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="relative flex items-end justify-between gap-5 border-t border-white/20 pt-5">
              <StoryMeta announcement={announcement} inverse />
              <ContinueMark inverse />
            </div>
          </article>
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className="group focus-visible:ring-primary-600 block h-full rounded-[24px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Read announcement: ${announcement.title}`}
      >
        <article
          className={cn(
            "bg-primary-950 shadow-sm-card relative flex h-full min-h-[30rem] flex-col justify-end overflow-hidden rounded-[24px] p-6 text-white sm:p-8",
            className,
          )}
        >
          {announcement.cover_image ? (
            <Image
              src={announcement.cover_image.url}
              alt={announcement.cover_image.alt_text}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          <div className="from-primary-950 via-primary-950/70 to-primary-950/10 absolute inset-0 bg-gradient-to-t" />
          <div className="relative">
            <StoryType announcement={announcement} inverse />
            <h3 className="font-display text-display-md mt-4 leading-[0.98] font-black tracking-tight text-white">
              {announcement.title}
            </h3>
            <p className="text-body mt-4 max-w-xl leading-relaxed text-white/80">
              {summary}
            </p>
            <div className="mt-6 flex items-end justify-between gap-5 border-t border-white/20 pt-5">
              <StoryMeta announcement={announcement} inverse />
              <ContinueMark inverse />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group focus-visible:ring-primary-600 block h-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={`Read announcement: ${announcement.title}`}
    >
      <article
        className={cn(
          "hover:border-primary-400 flex h-full flex-col border-b border-neutral-200 pb-5 transition-colors duration-200",
          className,
        )}
      >
        {announcement.cover_image ? (
          <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-neutral-100">
            <Image
              src={announcement.cover_image.url}
              alt={announcement.cover_image.alt_text}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        ) : (
          <div className="bg-danger-bg relative aspect-[16/10] overflow-hidden rounded-[18px] p-5">
            <div
              aria-hidden
              className="border-danger/10 absolute -right-5 -bottom-9 size-40 rounded-full border-[18px]"
            />
            <StoryType announcement={announcement} />
          </div>
        )}
        <div className="flex flex-1 flex-col pt-5">
          <StoryType announcement={announcement} />
          <h3 className="text-h3 group-hover:text-primary-800 mt-3 leading-snug font-bold text-neutral-900 transition-colors">
            {announcement.title}
          </h3>
          <p
            className={cn(
              "text-body mt-3 leading-relaxed text-neutral-600",
              clamp && "line-clamp-3",
            )}
          >
            {summary}
          </p>
          {isAlert && announcement.instruction ? (
            <p className="border-danger text-body-sm mt-4 border-l-2 pl-3 leading-relaxed font-semibold text-neutral-800">
              {announcement.instruction}
            </p>
          ) : null}
          <div className="mt-auto flex items-end justify-between gap-4 pt-6">
            <StoryMeta announcement={announcement} />
            <ContinueMark />
          </div>
        </div>
      </article>
    </Link>
  );
}
