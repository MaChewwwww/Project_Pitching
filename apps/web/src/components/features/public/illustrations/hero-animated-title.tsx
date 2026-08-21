"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type HeroAnimatedTitleProps = {
  line1: string;
  line2: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * The landing-page title is intentionally a small interactive focal point:
 * pointer tilt gives the heading depth while the CSS layer supplies the
 * water-like motion. The text remains a real h1 so the effect never changes
 * the page's semantic or accessible content.
 */
export function HeroAnimatedTitle({
  line1,
  line2,
  className,
  style,
}: HeroAnimatedTitleProps) {
  const shellRef = React.useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [motionAllowed, setMotionAllowed] = React.useState(true);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const resetTilt = React.useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !motionAllowed ||
        (event.pointerType !== "mouse" && event.pointerType !== "pen")
      ) {
        return;
      }

      const shell = shellRef.current;
      if (!shell) return;

      const bounds = shell.getBoundingClientRect();
      const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
      setTilt({
        x: Number((-offsetY * 4).toFixed(2)),
        y: Number((offsetX * 5).toFixed(2)),
      });
    },
    [motionAllowed],
  );

  return (
    <div
      ref={shellRef}
      className={cn("hero-title-shell relative [perspective:1000px]", className)}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <h1
        className="hero-title-float font-display relative text-[2rem] leading-[1.08] font-extrabold tracking-[-0.04em] text-neutral-900 sm:text-5xl lg:text-[2.75rem] xl:text-[3.05rem] 2xl:text-[3.2rem]"
        style={
          motionAllowed
            ? {
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }
            : undefined
        }
      >
        <span className="block">{line1}</span>
        <span className="hero-title-liquid text-primary-600 relative mt-1 inline-block">
          <span className="hero-title-flow relative inline-block">{line2}</span>
          <span
            aria-hidden
            className="hero-title-shimmer pointer-events-none absolute inset-0"
          />

          <span
            aria-hidden
            className="hero-title-wave relative -mt-1 block h-3.5 w-full max-w-lg overflow-hidden sm:-mt-2 sm:h-5"
          >
            <svg
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className="hero-title-wave-primary h-full w-[200%]"
            >
              <defs>
                <linearGradient id="hero-wave-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="35%" stopColor="#1f8049" />
                  <stop offset="70%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path
                d="M0 20 Q150 5 300 20 T600 20 T900 20 T1200 20 V40 H0 Z"
                fill="url(#hero-wave-primary)"
              />
            </svg>
            <svg
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className="hero-title-wave-secondary absolute inset-0 h-full w-[200%] opacity-75"
            >
              <defs>
                <linearGradient
                  id="hero-wave-secondary"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="50%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path
                d="M0 24 Q150 8 300 24 T600 24 T900 24 T1200 24 V40 H0 Z"
                fill="url(#hero-wave-secondary)"
              />
            </svg>
          </span>
        </span>
      </h1>
    </div>
  );
}
