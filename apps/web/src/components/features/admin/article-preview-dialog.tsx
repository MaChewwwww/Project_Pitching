"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Eye, MapPin, AlertTriangle, Calendar, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import { formatPhtDateTime } from "@/lib/format";
import type { ArticleImage, ArticleDocument } from "@/lib/api/public-types";

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

function RenderArticleBody({ doc }: { doc: ArticleDocument }) {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return <p className="text-sm text-neutral-500 italic">No detailed content provided.</p>;
  }

  return (
    <div className="prose prose-emerald max-w-none text-sm text-neutral-800 leading-relaxed space-y-4">
      {doc.content.map((block, idx) => {
        if (block.type === "paragraph") {
          const textContent = Array.isArray(block.content)
            ? block.content.map((c: Record<string, unknown>) => (c.text as string) || "").join("")
            : "";
          return <p key={idx} className="my-2">{textContent}</p>;
        }
        if (block.type === "heading") {
          const textContent = Array.isArray(block.content)
            ? block.content.map((c: Record<string, unknown>) => (c.text as string) || "").join("")
            : "";
          const level = block.attrs && typeof block.attrs === "object" ? (block.attrs as Record<string, unknown>).level : 2;
          if (level === 2) return <h2 key={idx} className="text-lg font-bold text-neutral-900 mt-4 mb-2">{textContent}</h2>;
          return <h3 key={idx} className="text-base font-bold text-neutral-900 mt-3 mb-1.5">{textContent}</h3>;
        }
        if (block.type === "bulletList") {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1 my-2">
              {Array.isArray(block.content) &&
                block.content.map((li: Record<string, unknown>, liIdx: number) => {
                  const liText = Array.isArray(li.content)
                    ? li.content
                        .flatMap((p: Record<string, unknown>) =>
                          Array.isArray(p.content)
                            ? p.content.map((c: Record<string, unknown>) => (c.text as string) || "")
                            : []
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
            ? block.content.map((c: Record<string, unknown>) => (c.text as string) || "").join("")
            : "";
          return (
            <blockquote key={idx} className="border-l-4 border-emerald-500 pl-4 py-1 italic bg-emerald-50/50 rounded-r-lg my-3">
              {quoteText}
            </blockquote>
          );
        }
        return null;
      })}
    </div>
  );
}

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
      api.get<AnnouncementDetail>(`/admin/announcements/${announcementId}`).then((r) => r.data),
    enabled: open,
  });

  const coverImage = data?.images?.find((img) => img.is_cover) || data?.images?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="success"
          className="h-8 rounded-lg border border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors px-2.5 gap-1.5 font-semibold text-xs cursor-pointer"
          title="View article preview"
          aria-label="View article preview"
        >
          <Eye aria-hidden className="size-3.5 shrink-0" />
          <span className="md:hidden">View</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl sm:max-w-5xl w-[92vw] max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border border-neutral-200 bg-white shadow-xl">
        <DialogHeader className="p-5 border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
              Admin Portal Article Preview
            </span>
            {data?.type ? (
              <span className="text-[10px] font-bold tracking-wider uppercase bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">
                {data.type.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <DialogTitle className="text-lg font-bold text-neutral-900 mt-2">
            {data?.title || title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-neutral-500 animate-pulse">
            Loading preview...
          </div>
        ) : data ? (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Cover Image */}
            {coverImage ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xs">
                <Image
                  src={coverImage.url}
                  alt={coverImage.alt_text || data.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : null}

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 border-b border-neutral-100 pb-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-600" />
                {data.published_at ? formatPhtDateTime(data.published_at) : "Draft / Unpublished"}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="size-3.5 text-emerald-600" />
                {data.issued_by_name || "Barangay Official"}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-600" />
                {data.is_barangay_wide
                  ? "Barangay-wide"
                  : data.area_names?.length
                  ? data.area_names.join(", ")
                  : "Targeted Areas"}
              </span>
            </div>

            {/* Instruction Warning Box (for Alerts / Critical info) */}
            {data.instruction ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <span>Required Action Instruction</span>
                </div>
                <p className="text-sm font-semibold pl-6">{data.instruction}</p>
              </div>
            ) : null}

            {/* Summary / Excerpt */}
            {data.excerpt ? (
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80">
                <p className="text-sm font-medium text-neutral-700 italic">
                  &ldquo;{data.excerpt}&rdquo;
                </p>
              </div>
            ) : null}

            {/* Article Body */}
            <div>
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Article Body Content
              </h4>
              <RenderArticleBody doc={data.body_json} />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
            Could not load article preview details.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
