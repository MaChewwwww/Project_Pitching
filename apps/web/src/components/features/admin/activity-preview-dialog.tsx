"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Eye, MapPin, X } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { formatPhtDateTime } from "@/lib/format";
import type { ActivityDetail } from "@/lib/api/public-types";

export function ActivityPreviewDialog({
  activityId,
  title,
}: {
  activityId: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "activities", activityId],
    queryFn: () =>
      api
        .get<ActivityDetail>(`/admin/activities/${activityId}`)
        .then((response) => response.data),
    enabled: open,
  });
  const cover = data?.cover_image ?? data?.images[0];
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
            <DialogTitle className="mt-1 text-xl">{data?.title ?? title}</DialogTitle>
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
              Loading Activity Preview…
            </p>
          ) : data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary-700 rounded-full px-3 py-1 text-xs font-bold text-white capitalize">
                  {data.type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${data.archived_at ? "bg-neutral-200 text-neutral-700" : data.published_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {data.archived_at
                    ? "Archived"
                    : data.published_at
                      ? "Published"
                      : "Draft"}
                </span>
              </div>
              {cover ? (
                <Image
                  src={cover.url}
                  alt=""
                  width={1200}
                  height={675}
                  unoptimized
                  className="aspect-video w-full rounded-xl border border-neutral-200 object-cover"
                />
              ) : null}
              <div className="border-primary-100 bg-primary-50/60 rounded-xl border p-4 text-sm text-neutral-700">
                <p className="inline-flex items-center gap-2">
                  <CalendarClock className="text-primary-700 size-4" />
                  {formatPhtDateTime(data.starts_at)}
                </p>
                {data.venue ? (
                  <p className="mt-2 inline-flex items-center gap-2">
                    <MapPin className="text-primary-700 size-4" />
                    {data.venue}
                  </p>
                ) : null}
              </div>
              <p className="text-base leading-7 text-neutral-700">
                {data.excerpt || "No Preview Summary Yet."}
              </p>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-neutral-500">
              Could Not Load This Activity.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
