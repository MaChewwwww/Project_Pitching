"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import type { ArticleImage } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

export function AnnouncementImageCarousel({
  images,
  title,
}: {
  images: ArticleImage[];
  title: string;
}) {
  const orderedImages = React.useMemo(
    () => [...images].sort((a, b) => a.sort_order - b.sort_order),
    [images],
  );
  const coverIndex = Math.max(
    0,
    orderedImages.findIndex((image) => image.is_cover),
  );
  const [activeIndex, setActiveIndex] = React.useState(coverIndex);
  const [isPaused, setIsPaused] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  React.useEffect(() => {
    if (orderedImages.length < 2 || isPaused || prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % orderedImages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isPaused, orderedImages.length, prefersReducedMotion]);

  if (orderedImages.length === 0) return null;

  const showPrevious = () => {
    setActiveIndex((current) => (current === 0 ? orderedImages.length - 1 : current - 1));
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % orderedImages.length);
  };
  const pauseOnFocus = () => setIsPaused(true);
  const resumeAfterFocus = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsPaused(false);
    }
  };

  return (
    <figure
      className="shadow-sm-card overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onFocus={pauseOnFocus}
      onBlur={resumeAfterFocus}
    >
      <div
        className="relative aspect-[16/9] w-full"
        aria-label={`${title} images`}
        aria-roledescription="carousel"
        role="region"
      >
        {orderedImages.map((image, index) => (
          <Image
            key={image.id}
            src={image.url}
            alt=""
            fill
            unoptimized
            priority={index === coverIndex}
            sizes="(max-width: 1024px) 100vw, 66vw"
            aria-hidden={index !== activeIndex}
            className={cn(
              "object-cover transition-opacity duration-500 motion-reduce:transition-none",
              index === activeIndex ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

        {orderedImages.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Show previous image"
              onClick={showPrevious}
              className="absolute top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-neutral-950/65 text-white shadow-lg backdrop-blur-sm transition hover:bg-neutral-950/85 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Show next image"
              onClick={showNext}
              className="absolute top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-neutral-950/65 text-white shadow-lg backdrop-blur-sm transition hover:bg-neutral-950/85 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-neutral-950/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {activeIndex + 1} / {orderedImages.length}
            </span>
            <span className="sr-only" aria-live="polite">
              Image {activeIndex + 1} of {orderedImages.length}
            </span>
          </>
        ) : null}
      </div>
    </figure>
  );
}
