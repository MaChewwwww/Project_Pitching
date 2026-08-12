"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fades a section or card in as it scrolls into view (design.md Section 8).
 *
 * Uses a lightweight IntersectionObserver that triggers ONCE per session frame
 * when scrolling down, keeping content permanently visible afterwards until
 * page refresh.
 */

export interface RevealProps extends React.ComponentProps<"div"> {
  /** Staggers the reveal of items in a grid. */
  delay?: 0 | 1 | 2 | 3;
}

const DELAY_MS = [0, 200, 400, 600] as const;

export function Reveal({
  className,
  delay = 0,
  children,
  style,
  ...props
}: RevealProps) {
  const [isRevealed, setIsRevealed] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Respect user prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setIsRevealed(true));
      return;
    }

    const element = ref.current;
    if (!element) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const start = () => {
      if (cancelled) return;

      // Check if element is already inside the viewport on initial render.
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        requestAnimationFrame(() => {
          if (!cancelled) setIsRevealed(true);
        });
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsRevealed(true);
            observer?.unobserve(entry.target);
          }
        },
        {
          threshold: 0.05,
          rootMargin: "0px 0px -30px 0px",
        },
      );

      observer.observe(element);
    };

    const onSplashReady = () => start();
    if (document.documentElement.dataset.splashReady === "true") {
      start();
    } else {
      document.addEventListener("splash-ready", onSplashReady, { once: true });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("splash-ready", onSplashReady);
      observer?.disconnect();
    };
  }, []);

  const delayMs = DELAY_MS[delay] || 0;

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "none" : "translateY(22px)",
        transitionDelay: `${delayMs}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
