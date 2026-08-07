"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/common/button";
import { HotlineList } from "@/components/common/hotline-list";
import { HOTLINES } from "@/lib/fixtures/hotlines";

/**
 * Last-resort boundary for a public route.
 *
 * **This is not the primary error mechanism** — `SectionBoundary` is. This one
 * replaces the entire page body, which is exactly what FR-PUB-016 and BR-0.17
 * forbid as a response to one failing section. It exists for a failure that
 * escapes every section boundary.
 *
 * Because it lives inside the route group, `PublicShell` from the layout is still
 * mounted above it: the navbar, footer, utility bar and floating hotline button
 * all survive. The hotline list is nonetheless repeated inline here, because
 * NFR-AVL-004 puts hotline access above everything and a second copy costs
 * nothing.
 *
 * It imports the hotline fixture directly rather than going through the API seam:
 * an error boundary that depends on a fetch which may itself be what failed is
 * not a fallback.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Public route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <div className="flex flex-col items-start gap-4">
        <span className="bg-warning-bg text-warning grid size-12 place-items-center rounded-md">
          <TriangleAlert aria-hidden className="size-6" />
        </span>

        <h1 className="text-h1 text-neutral-900">This page could not be loaded</h1>

        <p className="text-body-lg text-neutral-600">
          Something went wrong on our side. The emergency hotlines below still work, and
          you can try loading the page again.
        </p>

        <Button pill size="lg" onClick={retry} className="max-sm:w-full">
          <RotateCw aria-hidden className="size-4" />
          Try again
        </Button>
      </div>

      <div className="mt-10">
        <p className="text-overline mb-3 text-neutral-500">Emergency hotlines</p>
        <HotlineList hotlines={HOTLINES} />
      </div>
    </div>
  );
}
