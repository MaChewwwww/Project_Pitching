import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { WaterSpinner } from "./water-spinner";

/**
 * Loading building blocks for authenticated portal surfaces. They share a
 * calm pulse, accessible label, and space reservation without forcing every
 * domain surface into the same generic card shape.
 */

const PORTAL_SKELETON = "portal-skeleton";

function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-2xl border border-neutral-100 bg-white p-4", className)}
    >
      <Skeleton className={cn(PORTAL_SKELETON, "mb-4 size-9 rounded-xl")} />
      <Skeleton className={cn(PORTAL_SKELETON, "h-3 w-20")} />
      <Skeleton className={cn(PORTAL_SKELETON, "mt-2 h-7 w-16")} />
      <Skeleton className={cn(PORTAL_SKELETON, "mt-2 h-3 w-28")} />
    </div>
  );
}

export function MetricGridSkeleton({
  count = 4,
  label = "Loading metrics",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <section
      aria-busy="true"
      className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}
    >
      <LoadingAnnouncement label={label} />
      {Array.from({ length: count }, (_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </section>
  );
}

export function DetailCardSkeleton({
  label = "Loading details",
  rows = 5,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <section
      aria-busy="true"
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <LoadingAnnouncement label={label} />
      <div aria-hidden className="space-y-4">
        <Skeleton className={cn(PORTAL_SKELETON, "h-6 w-2/5")} />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className={cn(PORTAL_SKELETON, "h-3 w-20")} />
              <Skeleton className={cn(PORTAL_SKELETON, "h-5 w-full")} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FormFieldsSkeleton({
  label = "Loading form",
  fields = 6,
  className,
}: {
  label?: string;
  fields?: number;
  className?: string;
}) {
  return (
    <section aria-busy="true" className={cn("space-y-5", className)}>
      <LoadingAnnouncement label={label} />
      <div aria-hidden className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div
            key={index}
            className={cn("space-y-2", index === fields - 1 && "sm:col-span-2")}
          >
            <Skeleton className={cn(PORTAL_SKELETON, "h-3 w-24")} />
            <Skeleton className={cn(PORTAL_SKELETON, "h-10 w-full rounded-lg")} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function TimelineSkeleton({
  label = "Loading records",
  rows = 4,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <section aria-busy="true" className={cn("space-y-4", className)}>
      <LoadingAnnouncement label={label} />
      <div aria-hidden className="space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex gap-3 rounded-2xl border border-neutral-100 bg-white p-4"
          >
            <Skeleton
              className={cn(PORTAL_SKELETON, "mt-0.5 size-8 shrink-0 rounded-full")}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={cn(PORTAL_SKELETON, "h-4 w-2/5")} />
              <Skeleton className={cn(PORTAL_SKELETON, "h-3 w-full")} />
              <Skeleton className={cn(PORTAL_SKELETON, "h-3 w-3/5")} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChartSkeleton({
  label = "Loading chart",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <section
      aria-busy="true"
      className={cn(
        "relative h-60 overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4",
        className,
      )}
    >
      <LoadingAnnouncement label={label} />
      <div aria-hidden className="flex h-full items-end gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(
              PORTAL_SKELETON,
              "flex-1 rounded-t-md",
              index % 3 === 0 ? "h-[76%]" : index % 3 === 1 ? "h-[48%]" : "h-[62%]",
            )}
          />
        ))}
      </div>
    </section>
  );
}

export function DataSurfaceLoading({
  label = "Loading records",
  minHeight = "20rem",
  className,
}: {
  label?: string;
  minHeight?: string;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "grid place-items-center rounded-2xl border border-neutral-200 bg-white px-4 py-10",
        className,
      )}
      style={{ minHeight }}
    >
      <WaterSpinner size="md" tempo="calm" label={label} showLabel />
    </div>
  );
}

export function MapWorkspaceSkeleton({
  label = "Loading map workspace",
  minHeight = "28rem",
  className,
}: {
  label?: string;
  minHeight?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 bg-slate-100",
        className,
      )}
      style={{ minHeight }}
    >
      <div aria-hidden className="absolute inset-0 p-4">
        <Skeleton
          className={cn(PORTAL_SKELETON, "h-full w-full rounded-xl bg-slate-200/80")}
        />
        <Skeleton
          className={cn(
            PORTAL_SKELETON,
            "absolute top-8 left-8 h-24 w-44 rounded-xl bg-white/80",
          )}
        />
        <Skeleton
          className={cn(
            PORTAL_SKELETON,
            "absolute right-8 bottom-8 h-32 w-52 rounded-xl bg-white/80",
          )}
        />
      </div>
      <DataSurfaceLoading
        label={label}
        minHeight={minHeight}
        className="relative bg-transparent"
      />
    </section>
  );
}
