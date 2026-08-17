import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BookX,
  CloudLightning,
  CloudRain,
  DoorOpen,
  Droplets,
  Info,
  MapPin,
  Megaphone,
  PhoneCall,
  Siren,
  Tag,
  Thermometer,
  TrafficCone,
  TriangleAlert,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { AnnouncementImageCarousel } from "@/components/features/public/announcement-image-carousel";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnnouncementDetail, AnnouncementType, PublicAnnouncement } from "@/lib/api/public-types";

type CategoryMeta = { label: string; Icon: LucideIcon };

const TYPE_MAP: Record<AnnouncementType, CategoryMeta> = {
  general:               { label: "General",               Icon: Tag           },
  class_suspension:      { label: "Class Suspension",      Icon: BookX         },
  road_closure:          { label: "Road Closure",          Icon: TrafficCone   },
  utility_interruption:  { label: "Utility Interruption",  Icon: Wrench        },
  flood_warning:         { label: "Flood Warning",         Icon: Droplets      },
  earthquake:            { label: "Earthquake",            Icon: Activity      },
  typhoon:               { label: "Typhoon",               Icon: CloudLightning },
  heavy_rainfall:        { label: "Heavy Rainfall",        Icon: CloudRain     },
  heat_index:            { label: "Heat Index",            Icon: Thermometer   },
  evacuation:            { label: "Evacuation",            Icon: DoorOpen      },
};

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
    if (mark.type === "underline") value = <u key={`${key}-underline`}>{value}</u>;
    if (mark.type === "strike") value = <s key={`${key}-strike`}>{value}</s>;
    if (mark.type === "code")
      value = (
        <code
          key={`${key}-code`}
          className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-800"
        >
          {value}
        </code>
      );
    if (mark.type === "link" && typeof mark.attrs === "object" && mark.attrs !== null) {
      const href = typeof (mark.attrs as { href?: unknown }).href === "string" ? (mark.attrs as { href: string }).href : "#";
      value = (
        <a
          key={`${key}-link`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-700 underline underline-offset-4 hover:text-primary-800"
        >
          {value}
        </a>
      );
    }
  }
  return value;
}

function renderNode(node: Record<string, unknown>, key: string): ReactNode {
  const type = typeof node.type === "string" ? node.type : "";
  switch (type) {
    case "doc":
      return <div key={key}>{renderChildren(node, key)}</div>;
    case "paragraph":
      return (
        <p key={key} className="my-4 leading-relaxed text-neutral-700">
          {renderChildren(node, key)}
        </p>
      );
    case "heading": {
      const attrs = typeof node.attrs === "object" && node.attrs !== null ? node.attrs : {};
      const level = typeof (attrs as { level?: unknown }).level === "number" ? (attrs as { level: number }).level : 2;
      const children = renderChildren(node, key);
      if (level === 1)
        return (
          <h1 key={key} className="mt-8 mb-4 text-2xl font-bold text-neutral-900">
            {children}
          </h1>
        );
      if (level === 3)
        return (
          <h3 key={key} className="mt-4 mb-2 text-lg font-semibold text-neutral-900">
            {children}
          </h3>
        );
      return (
        <h2 key={key} className="mt-6 mb-3 text-xl font-bold text-neutral-900">
          {children}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-1 pl-6 text-neutral-700">
          {renderChildren(node, key)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="my-4 list-decimal space-y-1 pl-6 text-neutral-700">
          {renderChildren(node, key)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderChildren(node, key)}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-4 border-l-4 border-emerald-600 bg-emerald-50/50 py-2 pr-4 pl-4 italic text-neutral-700"
        >
          {renderChildren(node, key)}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="my-4 overflow-x-auto rounded-xl bg-neutral-900 p-4 font-mono text-xs text-neutral-100"
        >
          <code>{renderChildren(node, key)}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="my-6 border-neutral-200" />;
    case "image": {
      const attrs = typeof node.attrs === "object" && node.attrs !== null ? node.attrs : {};
      const src = typeof (attrs as { src?: unknown }).src === "string" ? (attrs as { src: string }).src : "";
      const alt = typeof (attrs as { alt?: unknown }).alt === "string" ? (attrs as { alt: string }).alt : "";
      if (!src) return null;
      return (
        <figure key={key} className="my-6 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          <div className="relative aspect-video w-full">
            <Image src={src} alt={alt} fill unoptimized className="object-cover" />
          </div>
          {alt ? (
            <figcaption className="p-2 text-center text-xs text-neutral-500">{alt}</figcaption>
          ) : null}
        </figure>
      );
    }
    default:
      return renderChildren(node, key);
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
  const cover = article.cover_image ?? article.images[0] ?? null;
  const articleImages = article.images?.length ? article.images : cover ? [cover] : [];

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
      BadgeIcon = Siren;
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
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-2xs shrink-0 tracking-wide",
                badgeStyle,
              )}
            >
              <BadgeIcon className="size-3.5 shrink-0" />
              {badgeLabel}
            </span>

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
          <article className="flex flex-col gap-6 lg:col-span-8">
            {(() => {
              const iconTone =
                article.kind === "announcement"
                  ? "text-emerald-600"
                  : article.severity === "emergency"
                  ? "text-red-600"
                  : article.severity === "warning"
                  ? "text-orange-600"
                  : "text-amber-600";
              return (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium text-neutral-500 -mt-2 -mb-2">
                  {/* Category */}
                  {(() => {
                    const meta = TYPE_MAP[article.type as AnnouncementType] ?? { label: article.type, Icon: Tag };
                    const { label: catLabel, Icon: CatIcon } = meta;
                    return (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <CatIcon aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
                        <span className="truncate">{catLabel}</span>
                      </span>
                    );
                  })()}

                  <span className="inline-flex items-center gap-1.5 truncate">
                    <User aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
                    <span className="truncate">{article.issued_by_name}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 truncate">
                    <MapPin aria-hidden className={cn("size-3.5 shrink-0", iconTone)} />
                    <span className="truncate">
                      {article.area_names.length > 0
                        ? article.area_names.join(", ")
                        : "Barangay-wide"}
                    </span>
                  </span>
                </div>
              );
            })()}

            {/* Ordered article media carousel. The cover is the initial slide. */}
            {articleImages.length > 0 ? (
              <AnnouncementImageCarousel
                key={article.id}
                images={articleImages}
                title={article.title}
              />
            ) : null}

            {/* Immediate Guidance Callout Box */}
            {isAlert && article.instruction ? (
              <div
                className={cn(
                  "rounded-xl border p-5 shadow-xs",
                  article.severity === "info"
                    ? "border-yellow-300 bg-yellow-50 text-yellow-950"
                    : article.severity === "warning"
                    ? "border-orange-300 bg-orange-50 text-orange-950"
                    : "border-red-300 bg-red-50 text-red-950"
                )}
              >
                <div
                  className={cn(
                    "mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                    article.severity === "info"
                      ? "text-yellow-800"
                      : article.severity === "warning"
                      ? "text-orange-800"
                      : "text-red-700"
                  )}
                >
                  <TriangleAlert
                    className={cn(
                      "size-4 shrink-0",
                      article.severity === "info"
                        ? "text-amber-600"
                        : article.severity === "warning"
                        ? "text-orange-600"
                        : "text-red-600"
                    )}
                  />
                  <span>Immediate Guidance</span>
                </div>
                <p className="text-base font-semibold leading-relaxed">
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
                                alt=""
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
