import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Info,
  MapPin,
  Megaphone,
  PhoneCall,
  TriangleAlert,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnnouncementDetail, PublicAnnouncement } from "@/lib/api/public-types";

function renderChildren(node: Record<string, unknown>, key: string): ReactNode[] {
  const children = Array.isArray(node.content) ? node.content : [];
  return children.map((child, index) =>
    renderNode(child as Record<string, unknown>, `${key}-${index}`),
  );
}

function renderText(node: Record<string, unknown>, key: string): ReactNode {
  let value: ReactNode = typeof node.text === "string" ? node.text : "";
  const marks = Array.isArray(node.marks) ? node.marks : [];
  for (const mark of marks as Array<Record<string, unknown>>) {
    if (mark.type === "bold") value = <strong key={`${key}-bold`}>{value}</strong>;
    if (mark.type === "italic") value = <em key={`${key}-italic`}>{value}</em>;
    if (mark.type === "link") {
      const href = (mark.attrs as Record<string, unknown> | undefined)?.href;
      if (typeof href === "string" && /^https?:\/\//.test(href)) {
        value = (
          <a
            key={`${key}-link`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary-700 underline underline-offset-2 hover:text-primary-800"
          >
            {value}
          </a>
        );
      }
    }
  }
  return value;
}

function renderNode(node: Record<string, unknown>, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "heading":
      return (node.attrs as Record<string, unknown> | undefined)?.level === 3 ? (
        <h3 key={key} className="text-h3 mt-8 font-bold text-neutral-900">
          {renderChildren(node, key)}
        </h3>
      ) : (
        <h2 key={key} className="text-h2 mt-10 font-bold text-neutral-900">
          {renderChildren(node, key)}
        </h2>
      );
    case "bulletList":
      return (
        <ul key={key} className="text-body-lg ml-5 list-disc space-y-2 text-neutral-700">
          {renderChildren(node, key)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="text-body-lg ml-5 list-decimal space-y-2 text-neutral-700">
          {renderChildren(node, key)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderChildren(node, key)}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l-4 border-primary-500 bg-primary-50/70 p-4 text-body-lg text-neutral-800 rounded-r-xl"
        >
          {renderChildren(node, key)}
        </blockquote>
      );
    default:
      return (
        <p key={key} className="text-body-lg leading-relaxed text-neutral-700">
          {renderChildren(node, key)}
        </p>
      );
  }
}

export interface AnnouncementDetailViewProps {
  article: AnnouncementDetail;
  recentArticles: PublicAnnouncement[];
}

export function AnnouncementDetailView({
  article,
  recentArticles,
}: AnnouncementDetailViewProps) {
  const isAlert = article.kind === "alert";
  const isEmergency = isAlert && article.severity === "emergency";
  const cover = article.cover_image;
  const gallery = (article.images || []).filter((img) => img.id !== cover?.id);

  let badgeLabel = "Announcement";
  let badgeStyle = "bg-emerald-700 text-white font-bold";
  let BadgeIcon: React.ElementType = Megaphone;

  if (article.kind === "announcement") {
    badgeLabel = "Announcement";
    badgeStyle = "bg-emerald-700 text-white font-bold";
    BadgeIcon = Megaphone;
  } else if (article.kind === "alert") {
    if (article.severity === "info") {
      badgeLabel = "Advisory";
      badgeStyle = "bg-yellow-400 text-neutral-950 font-bold";
      BadgeIcon = Info;
    } else if (article.severity === "warning") {
      badgeLabel = "Warning";
      badgeStyle = "bg-orange-500 text-white font-bold";
      BadgeIcon = TriangleAlert;
    } else {
      badgeLabel = "Emergency Alert";
      badgeStyle = "bg-red-600 text-white font-bold";
      BadgeIcon = TriangleAlert;
    }
  }

  return (
    <>
      <PageHeader
        title={article.title}
        description={article.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Announcements", href: "/announcements" },
          { label: article.title },
        ]}
        action={
          <div className="flex flex-col items-start sm:items-end justify-center gap-2.5 shrink-0 sm:self-center">
            {/* Badge Chip */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-2xs shrink-0 tracking-wide",
                badgeStyle,
              )}
            >
              <BadgeIcon className="size-3.5 shrink-0" />
              {badgeLabel}
            </span>

            {/* Date Chip */}
            {article.published_at ? (
              <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md shrink-0">
                <time dateTime={article.published_at}>
                  {formatPhtDateTime(article.published_at)}
                </time>
              </span>
            ) : null}
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Main Article Column */}
          <article className="flex flex-col gap-6 lg:col-span-8">
            {/* Header Metadata Bar: Author & Location */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium text-neutral-500 -mt-2 -mb-2">
              <span className="inline-flex items-center gap-1.5 truncate">
                <User
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0",
                    isEmergency ? "text-red-600" : "text-primary-600",
                  )}
                />
                <span className="truncate">{article.issued_by_name}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 truncate">
                <MapPin
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0",
                    isEmergency ? "text-red-600" : "text-primary-600",
                  )}
                />
                <span className="truncate">
                  {article.area_names.length > 0
                    ? article.area_names.join(", ")
                    : "Barangay-wide"}
                </span>
              </span>
            </div>

            {/* Cover Media */}
            {cover ? (
              <figure className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm-card">
                <Image
                  src={cover.url}
                  alt={cover.alt_text}
                  width={1600}
                  height={900}
                  unoptimized
                  priority
                  className="aspect-[16/9] w-full object-cover"
                />
                {cover.caption ? (
                  <figcaption className="border-t border-neutral-100 bg-neutral-50/80 px-5 py-3 text-xs font-medium text-neutral-600">
                    {cover.caption}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}

            {/* Immediate Guidance Callout for Emergency Alerts */}
            {isAlert && article.instruction ? (
              <div className="rounded-xl border border-red-200 bg-red-50/90 p-5 text-red-950 shadow-xs">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                  <TriangleAlert className="size-4 shrink-0 text-red-600" />
                  <span>Immediate Guidance</span>
                </div>
                <p className="text-base font-semibold leading-relaxed text-red-950">
                  {article.instruction}
                </p>
              </div>
            ) : null}

            {/* Rich Text Body */}
            <div className="space-y-5 text-neutral-800">
              {article.body_json?.content ? (
                article.body_json.content.map((node, index) =>
                  renderNode(node as Record<string, unknown>, `body-${index}`),
                )
              ) : (
                <p className="text-body-lg leading-relaxed text-neutral-700">
                  {article.body}
                </p>
              )}
            </div>

            {/* Additional Gallery Images */}
            {gallery.length > 0 ? (
              <section
                aria-label="Article gallery"
                className="mt-8 border-t border-neutral-200/80 pt-8"
              >
                <h3 className="mb-4 text-h3 font-bold text-neutral-900">
                  Photo Gallery
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gallery.map((image) => (
                    <figure
                      key={image.id}
                      className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt_text}
                        width={1200}
                        height={800}
                        unoptimized
                        className="aspect-[3/2] w-full object-cover"
                      />
                      {image.caption ? (
                        <figcaption className="p-3 text-xs text-neutral-600">
                          {image.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          {/* Right Sidebar Column */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Recent Announcements Card */}
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3.5">
                  <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-neutral-900">
                    <Megaphone className="size-4 text-primary-600" />
                    Recent Announcements
                  </h3>
                  <Link
                    href="/announcements"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 transition-colors hover:text-primary-800"
                  >
                    View All <ArrowRight className="size-3" />
                  </Link>
                </div>

                {recentArticles.length > 0 ? (
                  <div className="flex flex-col divide-y divide-neutral-100">
                    {recentArticles.map((recent) => {
                      const isRecentAlert = recent.kind === "alert";
                      let itemBadge = "Announcement";
                      let itemBadgeColor = "text-emerald-700 bg-emerald-50";

                      if (isRecentAlert) {
                        if (recent.severity === "emergency") {
                          itemBadge = "Emergency Alert";
                          itemBadgeColor = "text-red-700 bg-red-50";
                        } else if (recent.severity === "warning") {
                          itemBadge = "Warning";
                          itemBadgeColor = "text-orange-700 bg-orange-50";
                        } else {
                          itemBadge = "Advisory";
                          itemBadgeColor = "text-amber-800 bg-amber-50";
                        }
                      }

                      return (
                        <Link
                          key={recent.id}
                          href={`/announcements/${recent.slug}`}
                          className="group flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                            {recent.cover_image ? (
                              <Image
                                src={recent.cover_image.url}
                                alt={recent.cover_image.alt_text}
                                fill
                                unoptimized
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-950 to-neutral-900 text-white">
                                <Megaphone className="size-4 opacity-70" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span
                              className={cn(
                                "w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                itemBadgeColor,
                              )}
                            >
                              {itemBadge}
                            </span>
                            <h4 className="line-clamp-2 text-xs font-bold leading-snug text-neutral-900 transition-colors group-hover:text-primary-700">
                              {recent.title}
                            </h4>
                            {recent.published_at ? (
                              <span className="mt-0.5 text-[11px] font-medium text-neutral-400">
                                {formatPhtDateTime(recent.published_at)}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No other notices found.</p>
                )}

                {/* Emergency Hotline Quick Box */}
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary-950 via-primary-900 to-neutral-900 p-4 text-white shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300">
                    <PhoneCall className="size-3.5 shrink-0" />
                    <span>Emergency Assistance</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                    Need immediate help? Reach Barangay San Jose operations center.
                  </p>
                  <a
                    href="tel:0285550100"
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-500"
                  >
                    Call (02) 8555-0100
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
