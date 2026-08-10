"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { EvacCenterCard } from "./evac-center-card";
import { cn } from "@/lib/utils";
import type { PublicEvacCenter } from "@/lib/api/public-types";

export interface EvacCenterCarouselProps {
  centers: PublicEvacCenter[];
  className?: string;
}

export function EvacCenterCarousel({ centers, className }: EvacCenterCarouselProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);

    // Calculate active slide index
    const cardWidth = 360;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(0, index), centers.length - 1));
  }, [centers.length]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollBy = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const el = containerRef.current;
    if (!el) return;

    const card = el.children[index] as HTMLElement | undefined;
    if (card) {
      el.scrollTo({
        left: card.offsetLeft - 16,
        behavior: "smooth",
      });
    }
  };

  if (!centers || centers.length === 0) return null;

  return (
    <div className={cn("relative flex flex-col gap-4", className)}>
      {/* Carousel Track Header / Navigation Controls */}
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-neutral-500">
          Showing <strong className="font-bold text-neutral-900">{centers.length}</strong> evacuation centers
        </span>

        {/* Manual Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy("left")}
            disabled={!canScrollLeft}
            aria-label="Previous evacuation center"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-700 shadow-2xs transition-all hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy("right")}
            disabled={!canScrollRight}
            aria-label="Next evacuation center"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-700 shadow-2xs transition-all hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Track */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none py-1.5 px-0.5 -mx-1 px-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {centers.map((center) => (
          <div
            key={center.id}
            className="w-[85vw] max-w-[340px] sm:w-[360px] md:w-[380px] shrink-0 snap-start"
          >
            <EvacCenterCard center={center} className="h-full" />
          </div>
        ))}
      </div>

      {/* Pagination Dot Track */}
      {centers.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {centers.map((center, idx) => (
            <button
              key={center.id}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer",
                activeIndex === idx
                  ? "w-6 bg-emerald-600 shadow-xs"
                  : "w-2 bg-neutral-300 hover:bg-neutral-400",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
