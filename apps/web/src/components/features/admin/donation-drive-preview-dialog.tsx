"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Eye,
  Gift,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleImage, ArticleDocument } from "@/lib/api/public-types";

interface DonationDriveAdminDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
  event_id: string | null;
  event_name: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  drop_off_instructions: string | null;
  active_from: string | null;
  active_until: string | null;
  published_at: string | null;
  archived_at: string | null;
  images: ArticleImage[];
}

function RenderArticleBody({ doc }: { doc: ArticleDocument }) {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return (
      <p className="text-sm italic text-neutral-400">No detailed content provided.</p>
    );
  }

  return (
    <div className="prose prose-emerald max-w-none space-y-3 text-sm leading-relaxed text-neutral-800">
      {doc.content.map((block, idx) => {
        if (block.type === "paragraph") {
          const text = Array.isArray(block.content)
            ? block.content.map((c: Record<string, unknown>) => (c.text as string) || "").join("")
            : "";
          return <p key={idx} className="my-2 leading-relaxed">{text}</p>;
        }
        if (block.type === "heading") {
          const text = Array.isArray(block.content)
            ? block.content.map((c: Record<string, unknown>) => (c.text as string) || "").join("")
            : "";
          const level =
            block.attrs && typeof block.attrs === "object"
              ? (block.attrs as Record<string, unknown>).level
              : 2;
          if (level === 2)
            return (
              <h2 key={idx} className="mt-5 mb-2 text-base font-bold text-neutral-900">
                {text}
              </h2>
            );
          return (
            <h3 key={idx} className="mt-4 mb-1.5 text-sm font-bold text-neutral-900">
              {text}
            </h3>
          );
        }
        if (block.type === "bulletList") {
          return (
            <ul key={idx} className="my-2 list-disc space-y-1 pl-5">
              {Array.isArray(block.content) &&
                block.content.map((li: Record<string, unknown>, liIdx: number) => {
                  const liText = Array.isArray(li.content)
                    ? li.content
                        .flatMap((p: Record<string, unknown>) =>
                          Array.isArray(p.content)
                            ? p.content.map(
                                (c: Record<string, unknown>) => (c.text as string) || "",
                              )
                            : [],
                        )
                        .join("")
                    : "";
                  return <li key={liIdx}>{liText}</li>;
                })}
            </ul>
          );
        }
        if (block.type === "blockquote") {
          const quoteText = Array.isArray(block.content)
            ? block.content
                .map((c: Record<string, unknown>) => (c.text as string) || "")
                .join("")
            : "";
          return (
            <blockquote
              key={idx}
              className="my-3 rounded-r-lg border-l-4 border-emerald-500 bg-emerald-50/60 py-2 pr-3 pl-4 italic"
            >
              {quoteText}
            </blockquote>
          );
        }
        return null;
      })}
    </div>
  );
}

export function DonationDrivePreviewDialog({
  driveId,
  title,
}: {
  driveId: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donation-drives", driveId],
    queryFn: () =>
      api
        .get<DonationDriveAdminDetail>(`/admin/donation-drives/${driveId}`)
        .then((r) => r.data),
    enabled: open,
  });

  const coverImage = data?.images?.find((img) => img.is_cover) || data?.images?.[0];

  const statusBadge = data?.archived_at
    ? { label: "Archived", style: "bg-neutral-600 text-white" }
    : data?.published_at
    ? { label: "Published", style: "bg-emerald-700 text-white" }
    : { label: "Draft", style: "bg-amber-500 text-white" };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="success"
          className="h-8 cursor-pointer gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
          title="View drive preview"
          aria-label="View drive preview"
        >
          <Eye aria-hidden className="size-3.5 shrink-0" />
          <span className="md:hidden">View</span>
        </Button>
      </DialogTrigger>

      <style>{`
        .preview-scroll::-webkit-scrollbar { width: 6px; }
        .preview-scroll::-webkit-scrollbar-track { background: transparent; }
        .preview-scroll::-webkit-scrollbar-thumb { background: #10b981; border-radius: 99px; }
        .preview-scroll::-webkit-scrollbar-thumb:hover { background: #059669; }
        .preview-scroll { scrollbar-width: thin; scrollbar-color: #10b981 transparent; }
      `}</style>

      <DialogContent
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[52rem] flex-col gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] md:min-w-[42rem]"
        showCloseButton={false}
      >
        {/* Sticky Header */}
        <div className="shrink-0 border-b border-neutral-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <Eye aria-hidden className="size-3" />
                  Admin Preview
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                    statusBadge.style,
                  )}
                >
                  <Gift aria-hidden className="size-3" />
                  {statusBadge.label}
                </span>
                {data?.event_name ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                    {data.event_name}
                  </span>
                ) : null}
              </div>

              <DialogTitle className="text-base font-bold leading-snug tracking-tight text-neutral-900 sm:text-xl">
                {data?.title || title}
              </DialogTitle>
            </div>

            <DialogClose asChild>
              <button
                type="button"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 transition-all hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:mt-0.5"
                aria-label="Close preview"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="preview-scroll min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="size-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-sm font-medium text-neutral-500">Loading drive preview…</p>
            </div>
          ) : data ? (
            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {coverImage ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-xs">
                  <Image
                    src={coverImage.url}
                    alt={data.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : null}

              {/* Meta Row */}
              <div className="flex flex-col items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3 text-xs font-medium text-emerald-950 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5 sm:px-4">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                  {data.published_at
                    ? formatPhtDateTime(data.published_at)
                    : "Draft / Unpublished"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5 shrink-0 text-emerald-600" />
                  {data.organizer_name || "Barangay San Jose Relief Desk"}
                </span>
                {data.organizer_contact ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-emerald-600" />
                    {data.organizer_contact}
                  </span>
                ) : null}
                {data.active_until ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                    Active until {formatPhtDateTime(data.active_until)}
                  </span>
                ) : null}
              </div>

              {/* Drop-off Instructions Box */}
              {data.drop_off_instructions ? (
                <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-900 uppercase">
                    <MapPin className="size-4 shrink-0 text-emerald-700" />
                    <span>Drop-Off Location & Instructions</span>
                  </div>
                  <p className="pl-6 text-sm font-semibold leading-relaxed text-emerald-950">
                    {data.drop_off_instructions}
                  </p>
                </div>
              ) : null}

              {/* Excerpt */}
              {data.excerpt ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 sm:px-5 sm:py-4">
                  <p className="mb-1.5 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    Summary
                  </p>
                  <p className="text-sm font-medium italic leading-relaxed text-neutral-600">
                    &ldquo;{data.excerpt}&rdquo;
                  </p>
                </div>
              ) : null}

              {/* Campaign Body */}
              <div>
                <p className="mb-3 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Campaign Guidelines & Accepted Goods
                </p>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3.5 sm:px-5 sm:py-4">
                  <RenderArticleBody doc={data.body_json} />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-neutral-500">
              Could not load drive preview details.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
