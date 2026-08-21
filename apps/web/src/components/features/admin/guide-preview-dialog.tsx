"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, Eye, X } from "lucide-react";

import { Button } from "@/components/common/button";
import { GuideBodyRenderer } from "@/components/features/preparedness/guide-body-renderer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { formatPhtDate } from "@/lib/format";
import type { PublicGuide } from "@/lib/api/public-types";

interface AdminGuide extends PublicGuide {
  is_published: boolean;
}

function guideLabel(value: string) {
  return value === "n/a"
    ? "Preparedness Essential"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function GuidePreviewDialog({
  guideId,
  title,
}: {
  guideId: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [language, setLanguage] = React.useState<"fil" | "en">("fil");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "guides", guideId],
    queryFn: () =>
      api.get<AdminGuide>(`/admin/guides/${guideId}`).then((response) => response.data),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="success" className="h-8 gap-1.5">
          <Eye aria-hidden className="size-3.5" />
          <span>View</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-2xl p-0"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-neutral-100 bg-white p-5">
          <div>
            <p className="text-primary-700 text-[10px] font-bold tracking-wider uppercase">
              Admin Preview
            </p>
            <DialogTitle className="mt-1 text-xl">
              {data ? (language === "fil" ? data.title_fil : data.title_en) : title}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              aria-label="Close Preview"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-neutral-500">
              Loading Guide Preview…
            </p>
          ) : data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary-700 rounded-full px-3 py-1 text-xs font-bold text-white capitalize">
                  {guideLabel(data.hazard_type)}
                </span>
                <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 capitalize">
                  {guideLabel(data.phase)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${data.is_published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {data.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div
                role="tablist"
                aria-label="Preview language"
                className="flex gap-4 border-b border-neutral-100"
              >
                {(["fil", "en"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={language === item}
                    onClick={() => setLanguage(item)}
                    className={`border-b-2 px-1 pb-2 text-xs font-bold ${language === item ? "border-primary-700 text-primary-800" : "border-transparent text-neutral-500"}`}
                  >
                    {item === "fil" ? "Filipino" : "English"}
                  </button>
                ))}
              </div>
              <GuideBodyRenderer
                content={language === "fil" ? data.body_fil : data.body_en}
              />
              <div className="border-primary-100 bg-primary-50/60 rounded-xl border p-4 text-sm text-neutral-700">
                <p className="inline-flex items-center gap-2 font-semibold text-neutral-900">
                  <BookOpen className="text-primary-700 size-4" />
                  {data.source_attribution || "No Source Attribution"}
                </p>
                {data.last_reviewed_at ? (
                  <p className="mt-2 inline-flex items-center gap-2">
                    <CalendarCheck className="text-primary-700 size-4" />
                    Reviewed {formatPhtDate(data.last_reviewed_at)}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-neutral-500">
              Could Not Load This Guide.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
