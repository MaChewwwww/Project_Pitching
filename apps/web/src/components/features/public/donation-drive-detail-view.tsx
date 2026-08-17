import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Calendar,
  Gift,
  HandHeart,
  MapPin,
  PhoneCall,
  Sparkles,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { DonationDriveImageCarousel } from "@/components/features/public/donation-drive-image-carousel";
import { PRIMARY_HOTLINE } from "@/lib/fixtures/hotlines";
import { formatPhtDateTime, toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DonationDriveDetail, PublicDonationDrive } from "@/lib/api/public-types";

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
      const href =
        typeof (mark.attrs as { href?: unknown }).href === "string"
          ? (mark.attrs as { href: string }).href
          : "#";
      value = (
        <a
          key={`${key}-link`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
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
    case "text":
      return renderText(node, key);
    case "paragraph":
      return (
        <p key={key} className="my-4 leading-relaxed text-neutral-700">
          {renderChildren(node, key)}
        </p>
      );
    case "heading": {
      const attrs =
        typeof node.attrs === "object" && node.attrs !== null ? node.attrs : {};
      const level =
        typeof (attrs as { level?: unknown }).level === "number"
          ? (attrs as { level: number }).level
          : 2;
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
      const attrs =
        typeof node.attrs === "object" && node.attrs !== null ? node.attrs : {};
      const src =
        typeof (attrs as { src?: unknown }).src === "string"
          ? (attrs as { src: string }).src
          : "";
      const alt =
        typeof (attrs as { alt?: unknown }).alt === "string"
          ? (attrs as { alt: string }).alt
          : "";
      if (!src) return null;
      return (
        <figure
          key={key}
          className="my-6 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
        >
          <div className="relative aspect-video w-full">
            <Image src={src} alt={alt} fill unoptimized className="object-cover" />
          </div>
          {alt ? (
            <figcaption className="p-2 text-center text-xs text-neutral-500">
              {alt}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    default:
      return renderChildren(node, key);
  }
}

export interface DonationDriveDetailViewProps {
  drive: DonationDriveDetail;
  recentDrives: PublicDonationDrive[];
}

export function DonationDriveDetailView({
  drive,
  recentDrives,
}: DonationDriveDetailViewProps) {
  const cover = drive.cover_image ?? drive.images[0] ?? null;
  const driveImages = drive.images?.length ? drive.images : cover ? [cover] : [];

  const now = new Date();
  const activeUntilDate = drive.active_until ? new Date(drive.active_until) : null;
  const isPast = activeUntilDate ? activeUntilDate < now : false;
  const isArchived = Boolean(drive.archived_at);

  let badgeLabel = "Active Campaign";
  let badgeStyle = "bg-emerald-700 text-white font-bold";
  let BadgeIcon: React.ElementType = HandHeart;

  if (isArchived || isPast) {
    badgeLabel = "Completed Campaign";
    badgeStyle = "bg-slate-700 text-white font-bold";
    BadgeIcon = Gift;
  }

  return (
    <>
      <PageHeader
        title={drive.title}
        description={drive.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Donation Drives", href: "/donation-drives" },
          { label: drive.title },
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

            {drive.published_at ? (
              <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md shrink-0">
                <time dateTime={drive.published_at}>
                  {formatPhtDateTime(drive.published_at)}
                </time>
              </span>
            ) : null}
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="flex flex-col gap-6 lg:col-span-8">
            {/* Metadata Tags Row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium text-neutral-500 -mt-2 -mb-2">
              <span className="inline-flex items-center gap-1.5 truncate">
                <User aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  {drive.organizer_name || "Barangay San Jose Relief Desk"}
                </span>
              </span>

              {drive.drop_off_instructions ? (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <MapPin aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">{drive.drop_off_instructions}</span>
                </span>
              ) : null}

              {drive.event_name ? (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Sparkles aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate text-emerald-800 font-semibold">
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

            {/* Ordered Drive Image Carousel */}
            {driveImages.length > 0 ? (
              <DonationDriveImageCarousel
                key={drive.id}
                images={driveImages}
                title={drive.title}
              />
            ) : null}

            {/* Quick Relief Callout Box */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <Gift className="size-4 shrink-0 text-emerald-700" />
                <span>Drop-Off & Collection Information</span>
              </div>

              <div className="grid gap-3 text-sm text-neutral-800 sm:grid-cols-2">
                {drive.drop_off_instructions ? (
                  <div>
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">
                      Drop-Off Location
                    </span>
                    <p className="mt-0.5 font-semibold text-neutral-900">
                      {drive.drop_off_instructions}
                    </p>
                  </div>
                ) : null}

                {drive.organizer_contact ? (
                  <div>
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">
                      Inquiries Hotline
                    </span>
                    <p className="mt-0.5 font-semibold text-neutral-900">
                      {drive.organizer_contact}
                    </p>
                  </div>
                ) : null}

                {drive.active_until ? (
                  <div>
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">
                      Collection Schedule
                    </span>
                    <p className="mt-0.5 font-semibold text-neutral-900">
                      Until {formatPhtDateTime(drive.active_until)}
                    </p>
                  </div>
                ) : null}

                <div>
                  <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    Notice
                  </span>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    In-kind relief goods only (canned food, bottled water, hygiene kits). No cash donations accepted.
                  </p>
                </div>
              </div>
            </div>

            {/* Rich Text Body */}
            <div className="space-y-5 text-neutral-800">
              {drive.body_json?.content ? (
                drive.body_json.content.map((node, index) =>
                  renderNode(node as Record<string, unknown>, `body-${index}`),
                )
              ) : (
                <p className="text-base leading-relaxed text-neutral-700">
                  {drive.excerpt}
                </p>
              )}
            </div>
          </article>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Recent Donation Drives Card */}
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3.5">
                  <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-neutral-900">
                    <HandHeart className="size-4 text-emerald-600" />
                    Other Donation Drives
                  </h3>
                  <Link
                    href="/donation-drives"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    View All <ArrowRight className="size-3" />
                  </Link>
                </div>

                {recentDrives.length > 0 ? (
                  <div className="flex flex-col divide-y divide-neutral-100">
                    {recentDrives.map((recent) => {
                      const isRecentPast = recent.active_until
                        ? new Date(recent.active_until) < now
                        : false;
                      const isRecentArchived = Boolean(recent.archived_at);

                      return (
                        <Link
                          key={recent.id}
                          href={`/donation-drives/${recent.slug}`}
                          className="group flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0 transition-colors"
                        >
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
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-950 to-neutral-900 text-white">
                                <HandHeart className="size-4 opacity-70" />
                              </div>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span
                              className={cn(
                                "w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                isRecentPast || isRecentArchived
                                  ? "bg-neutral-100 text-neutral-700"
                                  : "bg-emerald-50 text-emerald-700",
                              )}
                            >
                              {isRecentPast || isRecentArchived ? "Completed" : "Active Drive"}
                            </span>
                            <h4 className="line-clamp-2 text-xs font-bold leading-snug text-neutral-900 transition-colors group-hover:text-emerald-700">
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
                  <p className="text-xs text-neutral-500">No other active drives.</p>
                )}

                {/* Barangay relief contact card */}
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-neutral-900 p-4 text-white shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <PhoneCall className="size-3.5 shrink-0" />
                    <span>Barangay San Jose</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                    Questions about drop-off, bulk in-kind relief, or logistics assistance?
                  </p>
                  <a
                    href={toTelHref(PRIMARY_HOTLINE.number)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                  >
                    Call {PRIMARY_HOTLINE.number}
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
