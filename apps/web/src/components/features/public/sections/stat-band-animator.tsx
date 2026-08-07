"use client";

import * as React from "react";

/**
 * Drives the two-phase entrance animation on the statistics band:
 *   1. The green background div slides up from off-screen.
 *   2. The stat cards follow with staggered delays (handled by CSS).
 *
 * The critical timing problem this component solves:
 *   CSS transitions only animate if the browser has *painted* the starting
 *   state. If `data-ready` goes from `"false"` to `"true"` before the browser
 *   paints the `"false"` frame, the `translateY(110%)` is never composited and
 *   the transition has no starting point — it just snaps to the end state.
 *
 *   This happens reliably when the stat band is near the viewport on page load:
 *   `useEffect` fires → IntersectionObserver sees it's already visible →
 *   `setReady(true)` in the same tick → React commits before the browser paints.
 *
 *   Fix: the **double-requestAnimationFrame** pattern. The first rAF schedules
 *   a callback for the next frame (where the hidden state IS painted). The
 *   second rAF fires after that frame, guaranteeing the browser has composited
 *   the `data-ready="false"` state. Only then do we flip to `"true"`.
 */
export function StatBandAnimator({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ready, setReady] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setReady(true));
      return;
    }

    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    const reveal = () => {
      // Double-rAF: first rAF waits for the next frame (hidden state painted),
      // second rAF fires after that frame is composited on screen.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          reveal();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} data-ready={String(ready)} className={className}>
      {children}
    </div>
  );
}
