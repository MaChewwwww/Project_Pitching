import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, Clock3, MapPin, PhoneCall, Tag, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import {
  formatPhtDateTime,
  formatPhtTime,
  phtDayOfMonth,
  phtMonthShort,
} from "@/lib/format";
import type {
  ActivityDetail,
  ArticleDocument,
  PublicActivity,
} from "@/lib/api/public-types";

function textFrom(node: Record<string, unknown>): ReactNode {
  const children = Array.isArray(node.content) ? node.content : [];
  return children.map((child, index) => {
    const item = child as Record<string, unknown>;
    const value = typeof item.text === "string" ? item.text : "";
    return <span key={index}>{value}</span>;
  });
}

function plainText(node: Record<string, unknown>): string {
  const own = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content) ? node.content : [];
  return (
    own + children.map((child) => plainText(child as Record<string, unknown>)).join("")
  );
}

function ArticleBody({ body }: { body: ArticleDocument }) {
  return (
    <div className="space-y-5 text-neutral-800">
      {body.content.map((raw, index) => {
        const node = raw as Record<string, unknown>;
        if (node.type === "heading") {
          const level = (node.attrs as { level?: number } | undefined)?.level;
          return level === 3 ? (
            <h3 key={index} className="pt-3 text-lg font-bold text-neutral-900">
              {textFrom(node)}
            </h3>
          ) : (
            <h2 key={index} className="pt-4 text-xl font-bold text-neutral-900">
              {textFrom(node)}
            </h2>
          );
        }
        if (node.type === "bulletList" || node.type === "orderedList") {
          const Tag = node.type === "orderedList" ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className={
                node.type === "orderedList"
                  ? "my-4 list-decimal space-y-2 pl-6 text-neutral-700"
                  : "my-4 list-disc space-y-2 pl-6 text-neutral-700"
              }
            >
              {(Array.isArray(node.content) ? node.content : []).map(
                (item, itemIndex) => (
                  <li key={itemIndex}>{plainText(item as Record<string, unknown>)}</li>
                ),
              )}
            </Tag>
          );
        }
        return (
          <p key={index} className="text-body-lg leading-relaxed text-neutral-700">
            {textFrom(node)}
          </p>
        );
      })}
    </div>
  );
}

export function ActivityDetailView({
  activity,
  related,
}: {
  activity: ActivityDetail;
  related: PublicActivity[];
}) {
  const cover = activity.cover_image ?? activity.images[0] ?? null;
  const gallery = activity.images.filter((image) => image.id !== cover?.id);

  const categoryLabel = activity.type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <>
      <PageHeader
        title={activity.title}
        description={activity.excerpt}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Activities", href: "/activities" },
          { label: activity.title },
        ]}
        action={
          <div className="flex flex-col items-start justify-center gap-2 shrink-0 sm:items-end sm:self-center">
            <span className="bg-primary-700 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs tracking-wide">
              <Tag className="size-3.5 shrink-0" />
              {categoryLabel}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md">
              <CalendarClock className="text-primary-600 size-3.5 shrink-0" />
              <time dateTime={activity.starts_at}>
                {phtMonthShort(activity.starts_at)} {phtDayOfMonth(activity.starts_at)}
              </time>
            </span>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="flex flex-col gap-6 lg:col-span-8">
            {/* Activity Schedule Summary Box */}
            <section
              aria-label="Activity Schedule"
              className="border-primary-200/80 bg-gradient-to-br from-primary-50/80 via-surface-tint to-white grid gap-4 rounded-2xl border p-5 shadow-xs sm:grid-cols-2"
            >
              <div className="flex items-start gap-3">
                <span className="bg-primary-100/80 grid size-9 shrink-0 place-items-center rounded-xl text-primary-800">
                  <CalendarClock className="size-4" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Date & Time
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                    {formatPhtDateTime(activity.starts_at)}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {formatPhtTime(activity.starts_at)}
                    {activity.ends_at ? ` – ${formatPhtTime(activity.ends_at)}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="bg-primary-100/80 grid size-9 shrink-0 place-items-center rounded-xl text-primary-800">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Venue
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                    {activity.venue ?? "Barangay Hall"}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {activity.area_name ? activity.area_name : "Barangay San Jose"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <span className="bg-primary-100/80 grid size-9 shrink-0 place-items-center rounded-xl text-primary-800">
                  <Users className="size-4" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Participation
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
                    Open to all Barangay San Jose residents. Pre-registration or attendance sign-up is handled on-site during the activity.
                  </p>
                </div>
              </div>
            </section>

            {/* Cover Image */}
            {cover ? (
              <figure className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-100 shadow-xs">
                <Image
                  src={cover.url}
                  alt=""
                  width={1600}
                  height={900}
                  priority
                  unoptimized
                  className="aspect-[16/9] w-full object-cover"
                />
              </figure>
            ) : null}

            <ArticleBody body={activity.body_json} />

            {gallery.length ? (
              <section
                className="border-t border-neutral-200/80 pt-6"
                aria-label="Activity Gallery"
              >
                <h2 className="font-display mb-4 text-xl font-bold text-neutral-900">
                  Activity Gallery
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gallery.map((image) => (
                    <Image
                      key={image.id}
                      src={image.url}
                      alt=""
                      width={1200}
                      height={800}
                      unoptimized
                      className="aspect-[3/2] w-full rounded-xl border border-neutral-200/80 object-cover shadow-xs"
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 md:p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="font-display inline-flex items-center gap-2 text-base font-bold text-neutral-900">
                    <Users className="text-primary-600 size-4" />
                    Other Activities
                  </h3>
                  <Link
                    href="/activities"
                    className="text-primary-700 hover:text-primary-800 inline-flex items-center gap-1 text-xs font-bold transition-colors"
                  >
                    View All <ArrowRight className="size-3" />
                  </Link>
                </div>

                {related.length ? (
                  <div className="flex flex-col divide-y divide-neutral-100">
                    {related.map((item) => (
                      <Link
                        key={item.id}
                        href={`/activities/${item.slug}`}
                        className="group flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-primary-700 text-xs font-bold">
                            {formatPhtDateTime(item.starts_at)}
                          </span>
                          <span className="bg-primary-50 text-primary-800 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                            {item.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="group-hover:text-primary-700 text-sm font-bold leading-snug text-neutral-900 transition-colors">
                          {item.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-neutral-500">
                    More community activities will appear here as scheduled.
                  </p>
                )}

                {/* Emergency Hotline Box */}
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary-950 via-primary-900 to-neutral-900 p-4 text-white shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300">
                    <PhoneCall className="size-3.5 shrink-0" />
                    <span>Barangay San Jose</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                    Have questions about community drills or volunteer programs?
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

