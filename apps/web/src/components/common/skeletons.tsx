import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "./card";
import { WaterSpinner } from "./water-spinner";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders (design.md Section 7.2, Definition of Done item 3).
 *
 * Two tiers, used for different things:
 *
 * - The **primitives** (`CardSkeleton`, `ListSkeleton`, …) are shapes to drop
 *   inside a component that is already loading.
 * - The **`Section*Skeleton`s** are `<Suspense fallback>` values for the landing
 *   page, one per section. Each reproduces its section's real grid so the layout
 *   does not shift when the content streams in (NFR-UX-*, CLS).
 *
 * Most section-level fallbacks pair grey shapes with a `WaterSpinner`, because the
 * shapes alone are ambiguous during a slow revalidation — a column of grey bars
 * that never resolves is indistinguishable from a broken section. The spinner is
 * the part that says "still working", and it carries the accessible name, so the
 * grey shapes around it are `aria-hidden`. The hero is the deliberate exception:
 * its visual half reserves empty space while a screen-reader-only status announces loading.
 */

/**
 * Shared frame for a section-level fallback: the spinner announces, the shapes
 * hold the space. `SectionBoundary` wraps this, so an error still replaces it
 * with `ErrorState` (FR-PUB-016) — this is only ever the pending state.
 */
function SectionFallback({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="opacity-60">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <WaterSpinner label={label} showLabel />
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card radius="xl" className={cn("gap-4", className)}>
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <Skeleton className="size-10 rounded-md" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </Card>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatBandSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20 bg-white/20" />
          <Skeleton className="h-9 w-24 bg-white/20" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Section-level fallbacks — the `<Suspense fallback>` for each landing section.

   Each mirrors its section's own wrapper (`Section` tone, padding, grid) so the
   page height is stable across the swap. They are kept here beside the shapes
   they compose rather than next to the sections, so a section file stays a
   single async function and the whole set of loading states is reviewable in one
   place.
   --------------------------------------------------------------------------- */

/** The `Section` chrome, duplicated here to avoid a features/ → common/ import. */
function FallbackSection({
  tone = "default",
  children,
}: {
  tone?: "default" | "tint";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        tone === "tint" ? "bg-surface-tint" : "bg-background",
        "py-8 md:py-12",
      )}
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">{children}</div>
    </section>
  );
}

function HeaderSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-2xl" />
    </div>
  );
}

/**
 * Weather and river level (FR-PUB-004). Mirrors the section's
 * `lg:grid-cols-[2fr_1fr]` split.
 *
 * This is the section the spinner matters most for: FR-WX-012 requires the last
 * known reading rather than a blank, and a blank where the river level goes
 * reads as "no flooding" to somebody scanning during a storm.
 */
export function WeatherSectionSkeleton() {
  return (
    <FallbackSection tone="tint">
      <HeaderSkeleton />
      <SectionFallback label="Loading weather" className="mt-8">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-[2fr_1fr]">
          <Card radius="xl" className="h-64" />
          <Card radius="xl" className="h-64" />
        </div>
      </SectionFallback>
    </FallbackSection>
  );
}

/**
 * The three-up card grid shared by announcements, preparedness, activities and
 * evacuation centres — same `md:grid-cols-2 lg:grid-cols-3` in all four.
 */
export function CardGridSectionSkeleton({
  label,
  tone = "default",
  count = 3,
}: {
  label: string;
  tone?: "default" | "tint";
  count?: number;
}) {
  return (
    <FallbackSection tone={tone}>
      <HeaderSkeleton />
      <SectionFallback label={label} className="mt-8">
        <CardGridSkeleton count={count} />
      </SectionFallback>
    </FallbackSection>
  );
}

/** Donation drives (FR-PUB-010) — two-up, not three. */
export function DonationDrivesSectionSkeleton() {
  return (
    <FallbackSection>
      <HeaderSkeleton />
      <SectionFallback label="Loading donation drives" className="mt-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </SectionFallback>
    </FallbackSection>
  );
}

/** Hazard map (FR-PUB-008). One tall panel — the map itself. */
export function HazardMapSectionSkeleton() {
  return (
    <FallbackSection tone="tint">
      <HeaderSkeleton />
      <SectionFallback label="Loading hazard map" className="mt-8">
        <Card radius="xl" className="h-[420px]" />
      </SectionFallback>
    </FallbackSection>
  );
}

/** Hotlines (FR-PUB-007). A list, not a grid. */
export function HotlinesSectionSkeleton() {
  return (
    <FallbackSection>
      <HeaderSkeleton />
      <SectionFallback label="Loading hotlines" className="mt-8">
        <ListSkeleton rows={4} />
      </SectionFallback>
    </FallbackSection>
  );
}

/** FAQs (FR-PUB-011). Full width header over 2-column grid. */
export function FaqSectionSkeleton() {
  return (
    <FallbackSection tone="tint">
      <HeaderSkeleton />
      <SectionFallback label="Loading FAQs" className="mt-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </SectionFallback>
    </FallbackSection>
  );
}

/**
 * The dark statistics band (FR-ANL-003).
 *
 * Reproduces the band's own dark panel and padding rather than using
 * `FallbackSection`, so the page does not flash a light gap where a dark band is
 * about to appear. `StatBandSkeleton`'s `bg-white/20` shapes only read correctly
 * on this surface.
 */
export function StatBandSectionSkeleton() {
  return (
    <section className="bg-surface-dark relative overflow-hidden border-y border-white/10">
      <div className="py-3.5 md:py-5 lg:py-3.5 xl:py-6">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="relative">
            <div aria-hidden className="opacity-50">
              <StatBandSkeleton />
            </div>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <WaterSpinner size="sm" label="Loading barangay statistics" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The hero (FR-PUB-001). Reserves the real hero's height at each breakpoint —
 * it is the largest block above the fold, so a mismatch here is the single
 * worst layout shift on the site.
 */
export function HeroSectionSkeleton() {
  return (
    <section className="relative overflow-hidden bg-white">
      <span role="status" className="sr-only">
        Loading current hero information
      </span>
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-4 px-4 py-6 max-lg:items-center md:px-6 md:py-8 lg:py-4 lg:pr-8 xl:py-8 xl:pr-12">
          <div aria-hidden className="flex w-full flex-col gap-4 max-lg:items-center">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-14 w-full max-w-lg" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex gap-3 pt-1 max-sm:w-full max-sm:flex-col">
              <Skeleton className="h-12 w-40 rounded-full max-sm:w-full" />
              <Skeleton className="h-12 w-40 rounded-full max-sm:w-full" />
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="bg-primary-800 relative min-h-[430px] overflow-hidden md:min-h-[460px] lg:min-h-0"
        />
      </div>
    </section>
  );
}
