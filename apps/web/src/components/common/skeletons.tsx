import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders (design.md Section 7.2, Definition of Done item 3).
 *
 * Nothing on the public site is async yet — fixtures resolve immediately. These
 * exist now so that when the real fetches land, each section gains a `<Suspense
 * fallback={…}>` wrapper and starts streaming, rather than needing loading states
 * designed after ten sections already depend on their absence.
 */

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
