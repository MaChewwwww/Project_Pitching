import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, Clock3, MapPin, Users } from "lucide-react";

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
    <div className="space-y-5 text-neutral-700">
      {body.content.map((raw, index) => {
        const node = raw as Record<string, unknown>;
        if (node.type === "heading") {
          const level = (node.attrs as { level?: number } | undefined)?.level;
          return level === 3 ? (
            <h3 key={index} className="text-h3 pt-3 text-neutral-900">
              {textFrom(node)}
            </h3>
          ) : (
            <h2 key={index} className="text-h2 pt-4 text-neutral-900">
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
                  ? "list-decimal space-y-2 pl-6"
                  : "list-disc space-y-2 pl-6"
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
          <p key={index} className="text-body-lg leading-8">
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
          <div className="bg-primary-800 ring-primary-100 flex size-[5.5rem] shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-lg ring-4">
            <span className="text-3xl leading-none font-black tabular-nums">
              {phtDayOfMonth(activity.starts_at)}
            </span>
            <span className="text-primary-200 mt-1 text-xs font-bold tracking-[0.18em] uppercase">
              {phtMonthShort(activity.starts_at)}
            </span>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <article className="flex flex-col gap-7 lg:col-span-8">
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary-700 rounded-full px-3 py-1.5 text-xs font-bold text-white">
                {activity.type.replace(/_/g, " ")}
              </span>
              <span className="border-primary-100 bg-primary-50 text-primary-800 rounded-full border px-3 py-1.5 text-xs font-semibold">
                Community activity
              </span>
            </div>

            {cover ? (
              <figure className="shadow-sm-card overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                <Image
                  src={cover.url}
                  alt=""
                  width={1600}
                  height={900}
                  priority
                  unoptimized
                  className="aspect-video w-full object-cover"
                />
              </figure>
            ) : null}

            <section
              aria-label="Activity schedule"
              className="border-primary-100 bg-primary-50/70 grid gap-3 rounded-2xl border p-4 text-sm text-neutral-700 sm:grid-cols-2 md:p-5"
            >
              <p className="inline-flex items-start gap-2">
                <CalendarClock className="text-primary-700 mt-0.5 size-4 shrink-0" />
                <span>
                  <strong className="block text-neutral-900">When</strong>
                  {formatPhtDateTime(activity.starts_at)}
                </span>
              </p>
              <p className="inline-flex items-start gap-2">
                <Clock3 className="text-primary-700 mt-0.5 size-4 shrink-0" />
                <span>
                  <strong className="block text-neutral-900">Time</strong>
                  {formatPhtTime(activity.starts_at)}
                  {activity.ends_at ? ` – ${formatPhtTime(activity.ends_at)}` : ""}
                </span>
              </p>
              <p className="inline-flex items-start gap-2 sm:col-span-2">
                <MapPin className="text-primary-700 mt-0.5 size-4 shrink-0" />
                <span>
                  <strong className="block text-neutral-900">Venue</strong>
                  {activity.venue ?? "Venue to be announced"}
                  {activity.area_name ? ` · ${activity.area_name}` : ""}
                </span>
              </p>
            </section>

            <ArticleBody body={activity.body_json} />

            {gallery.length ? (
              <section
                className="border-t border-neutral-200 pt-7"
                aria-label="Activity gallery"
              >
                <h2 className="text-h3 mb-4 text-neutral-900">Activity gallery</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gallery.map((image) => (
                    <Image
                      key={image.id}
                      src={image.url}
                      alt=""
                      width={1200}
                      height={800}
                      unoptimized
                      className="aspect-[3/2] w-full rounded-xl border border-neutral-200 object-cover"
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
                <h2 className="inline-flex items-center gap-2 text-base font-bold text-neutral-900">
                  <Users className="text-primary-700 size-4" /> Other upcoming activities
                </h2>
                {related.length ? (
                  <div className="mt-4 divide-y divide-neutral-100">
                    {related.map((item) => (
                      <Link
                        key={item.id}
                        href={`/activities/${item.slug}`}
                        className="group block py-3 first:pt-0 last:pb-0"
                      >
                        <p className="text-primary-700 text-xs font-bold">
                          {formatPhtDateTime(item.starts_at)}
                        </p>
                        <p className="group-hover:text-primary-800 mt-1 text-sm leading-snug font-bold text-neutral-900">
                          {item.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-neutral-500">
                    More community activities will appear here as they are scheduled.
                  </p>
                )}
                <Link
                  href="/activities"
                  className="text-primary-700 hover:text-primary-800 mt-5 inline-flex text-sm font-bold"
                >
                  View all activities
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
