"use client";

import * as React from "react";

/**
 * Counts a number from 0 to `to` once the element scrolls into view.
 *
 * Implemented with IntersectionObserver + requestAnimationFrame, so it starts
 * exactly when the element becomes visible and runs off the main thread budget.
 *
 * Respects `prefers-reduced-motion`: when motion is reduced the final value is
 * shown immediately, which is the correct behaviour — there is no way to end up
 * with a mid-count number frozen on screen.
 *
 * @param to      - The target number to count up to.
 * @param duration - Animation duration in ms (default 1 200).
 * @param format   - Optional formatter applied to the current count. If omitted
 *                   the number is formatted with `toLocaleString`.
 */
export interface CountUpProps {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function CountUp({ to, duration = 1200, format, className }: CountUpProps) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Show the final value immediately for users who prefer no motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setCount(to));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const startTime = performance.now();

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Cubic ease-out: fast start, decelerates into the final value.
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * to));

          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  const display = format ? format(count) : count.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
