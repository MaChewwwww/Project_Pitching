"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookX,
  Calendar,
  CloudLightning,
  CloudRain,
  DoorOpen,
  Droplets,
  Eye,
  Info,
  MapPin,
  Megaphone,
  Siren,
  Tag,
  Thermometer,
  TrafficCone,
  TriangleAlert,
  User,
  Wrench,
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
import type { ArticleImage, ArticleDocument, AnnouncementType } from "@/lib/api/public-types";

/* -------------------------------------------------------------------------- */
/*  Type map                                                                   */
/* -------------------------------------------------------------------------- */

type CategoryMeta = { label: string; Icon: React.ElementType };

const TYPE_MAP: Record<AnnouncementType, CategoryMeta> = {
  general:              { label: "General",              Icon: Tag            },
  class_suspension:     { label: "Class Suspension",     Icon: BookX          },
  road_closure:         { label: "Road Closure",         Icon: TrafficCone    },
  utility_interruption: { label: "Utility Interruption", Icon: Wrench         },
  flood_warning:        { label: "Flood Warning",        Icon: Droplets       },
  earthquake:           { label: "Earthquake",           Icon: Activity       },
  typhoon:              { label: "Typhoon",              Icon: CloudLightning  },
  heavy_rainfall:       { label: "Heavy Rainfall",       Icon: CloudRain      },
  heat_index:           { label: "Heat Index",           Icon: Thermometer    },
  evacuation:           { label: "Evacuation",           Icon: DoorOpen       },
};

/* -------------------------------------------------------------------------- */
/*  Local types                                                                */
/* -------------------------------------------------------------------------- */

interface AnnouncementDetail {
  id: string;
  kind: "announcement" | "alert";
  type: string;
  severity: "info" | "warning" | "emergency" | null;
  title: string;
  excerpt: string;
  body_json: ArticleDocument;
  instruction: string | null;
  is_barangay_wide: boolean;
  area_names: string[];
  published_at: string | null;
  issued_by_name: string;
  images: ArticleImage[];
}

/* -------------------------------------------------------------------------- */
/*  Article body renderer                                                      */
/* -------------------------------------------------------------------------- */

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
              className="my-3 rounded-r-lg border-l-4 border-emerald-500 bg-emerald-50/60 py-2 pl-4 pr-3 italic"
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

/* -------------------------------------------------------------------------- */
/*  Main dialog                                                                */
/* -------------------------------------------------------------------------- */

export function ArticlePreviewDialog({
  announcementId,
  title,
}: {
  announcementId: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "announcements", announcementId],
    queryFn: () =>
      api
        .get<AnnouncementDetail>(`/admin/announcements/${announcementId}`)
        .then((r) => r.data),
    enabled: open,
  });

  const coverImage = data?.images?.find((img) => img.is_cover) || data?.images?.[0];
  const catMeta = data
    ? (TYPE_MAP[data.type as AnnouncementType] ?? { label: data.type.replace(/_/g, " "), Icon: Tag })
    : null;

  /* Severity-aware accent for alerts */
  const accentTone =
    data?.kind === "announcement"
      ? { icon: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" }
      : data?.severity === "emergency"
      ? { icon: "text-red-600", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" }
      : data?.severity === "warning"
      ? { icon: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" }
      : { icon: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" };

  /* Kind badge */
  let KindIcon: React.ElementType = Megaphone;
  let kindLabel = "Announcement";
  let kindBadge = "bg-emerald-600 text-white";

  if (data?.kind === "alert") {
    if (data.severity === "emergency") {
      KindIcon = Siren; kindLabel = "Emergency Alert"; kindBadge = "bg-red-600 text-white";
    } else if (data.severity === "warning") {
      KindIcon = TriangleAlert; kindLabel = "Warning"; kindBadge = "bg-orange-500 text-white";
    } else {
      KindIcon = Info; kindLabel = "Advisory"; kindBadge = "bg-yellow-400 text-neutral-950";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="success"
          className="h-8 cursor-pointer gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
          title="View article preview"
          aria-label="View article preview"
        >
          <Eye aria-hidden className="size-3.5 shrink-0" />
          <span className="md:hidden">View</span>
        </Button>
      </DialogTrigger>

      {/* Custom scrollbar styles injected via a style tag */}
      <style>{`
        .preview-scroll::-webkit-scrollbar { width: 6px; }
        .preview-scroll::-webkit-scrollbar-track { background: transparent; }
        .preview-scroll::-webkit-scrollbar-thumb { background: #10b981; border-radius: 99px; }
        .preview-scroll::-webkit-scrollbar-thumb:hover { background: #059669; }
        .preview-scroll { scrollbar-width: thin; scrollbar-color: #10b981 transparent; }
      `}</style>

      <DialogContent
        /* Remove default overflow — we control it per-section */
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[52rem] flex-col gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] md:min-w-[42rem]"
        /* Hide default DialogContent close button — we render our own */
        showCloseButton={false}
      >
        {/* ── Sticky Header (never scrolls) ─────────────────────────────── */}
        <div className="shrink-0 border-b border-neutral-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <Eye aria-hidden className="size-3" />
                  Admin Preview
                </span>
                {data ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      kindBadge,
                    )}
                  >
                    <KindIcon aria-hidden className="size-3" />
                    {kindLabel}
                  </span>
                ) : null}
                {catMeta ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide",
                      accentTone.bg,
                      accentTone.border,
                      accentTone.text,
                    )}
                  >
                    <catMeta.Icon aria-hidden className="size-3" />
                    {catMeta.label}
                  </span>
                ) : null}
              </div>

              {/* Title */}
              <DialogTitle className="text-base font-bold leading-snug tracking-tight text-neutral-900 sm:text-xl">
                {data?.title || title}
              </DialogTitle>
            </div>

            {/* Close button */}
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

        {/* ── Scrollable Body ────────────────────────────────────────────── */}
        <div className="preview-scroll min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="size-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-sm font-medium text-neutral-500">Loading preview…</p>
            </div>
          ) : data ? (
            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {/* Cover Image */}
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
              <div
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border px-3.5 py-3 text-xs font-medium sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5 sm:px-4",
                  accentTone.bg,
                  accentTone.border,
                  accentTone.text,
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className={cn("size-3.5 shrink-0", accentTone.icon)} />
                  {data.published_at
                    ? formatPhtDateTime(data.published_at)
                    : "Draft / Unpublished"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className={cn("size-3.5 shrink-0", accentTone.icon)} />
                  {data.issued_by_name || "Barangay Official"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className={cn("size-3.5 shrink-0", accentTone.icon)} />
                  {data.is_barangay_wide
                    ? "Barangay-wide"
                    : data.area_names?.length
                    ? data.area_names.join(", ")
                    : "Targeted Areas"}
                </span>
              </div>

              {/* Instruction / Alert Callout */}
              {data.instruction ? (
                <div
                  className={cn(
                    "space-y-1 rounded-xl border p-3.5 sm:p-4",
                    data.severity === "emergency"
                      ? "border-red-200 bg-red-50 text-red-950"
                      : data.severity === "warning"
                      ? "border-orange-200 bg-orange-50 text-orange-950"
                      : "border-amber-200 bg-amber-50 text-amber-950",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                      data.severity === "emergency"
                        ? "text-red-700"
                        : data.severity === "warning"
                        ? "text-orange-700"
                        : "text-amber-700",
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "size-4 shrink-0",
                        data.severity === "emergency"
                          ? "text-red-600"
                          : data.severity === "warning"
                          ? "text-orange-600"
                          : "text-amber-600",
                      )}
                    />
                    <span>Immediate Action Required</span>
                  </div>
                  <p className="pl-6 text-sm font-semibold leading-relaxed">
                    {data.instruction}
                  </p>
                </div>
              ) : null}

              {/* Excerpt */}
              {data.excerpt ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 sm:px-5 sm:py-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Summary
                  </p>
                  <p className="text-sm font-medium italic leading-relaxed text-neutral-600">
                    &ldquo;{data.excerpt}&rdquo;
                  </p>
                </div>
              ) : null}

              {/* Article Body */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Full Article
                </p>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3.5 sm:px-5 sm:py-4">
                  <RenderArticleBody doc={data.body_json} />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-neutral-500">
              Could not load article preview details.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
