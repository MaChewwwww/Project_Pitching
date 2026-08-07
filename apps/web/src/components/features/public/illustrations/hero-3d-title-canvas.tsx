"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Flood-Themed Liquid Hero Title ("Ready Before the Water Rises")
 *
 * Balanced Palette: Main text is rich Brand Green with darker, rich ocean/river
 * blue-teal liquid currents & wave crests.
 */
export function Hero3DTitleCanvas({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = React.useState(0);
  const [rotY, setRotY] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Subtle 3D tilt: -5deg to +5deg
    const rY = (x / (rect.width / 2)) * 5;
    const rX = (-y / (rect.height / 2)) * 4;
    setRotY(rY);
    setRotX(rX);
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
  };

  const line1Text = "Ready Before";
  const line2Text = "the Water Rises";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative py-1 select-none cursor-pointer [perspective:1000px]",
        className
      )}
    >
      {/* Hidden Accessible H1 for SEO */}
      <h1 className="sr-only">
        {line1Text} {line2Text}
      </h1>

      {/* 3D Main Scene Container with Liquid Floating Wave */}
      <div
        className="relative transition-transform duration-500 ease-out [transform-style:preserve-3d] animate-[water-surface-float_5s_ease-in-out_infinite]"
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {/* Line 1: "Ready Before" - Deep Charcoal Typography */}
        <div
          aria-hidden
          className="text-4xl sm:text-5xl lg:text-[42px] xl:text-[52px] 2xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-neutral-900 drop-shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
        >
          {line1Text}
        </div>

        {/* Line 2: "the Water Rises" - Brand Primary Green with Darker Ocean Blue Current */}
        <div
          aria-hidden
          className="relative mt-1 text-4xl sm:text-5xl lg:text-[42px] xl:text-[52px] 2xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-primary-600 drop-shadow-[0_6px_16px_rgba(22,128,61,0.18)]"
        >
          <span className="relative inline-block whitespace-nowrap bg-gradient-to-r from-primary-800 via-primary-600 via-teal-600 to-primary-700 bg-clip-text text-transparent bg-[length:300%_100%] animate-[liquid-river-flow_6s_linear_infinite]">
            {line2Text}
            
            {/* Liquid Surface Water Current Reflection Flare */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent bg-[length:200%_100%] animate-[light-sweep_4s_ease-in-out_infinite] mix-blend-overlay"
            />
          </span>

          {/* DUAL-LAYER SVG WATER WAVE UNDERLINE (Green Front Wave + Darker Ocean Blue Back Crest) */}
          <div aria-hidden className="relative -mt-1 sm:-mt-2 h-4 sm:h-5.5 w-full max-w-lg overflow-hidden max-lg:mx-auto">
            {/* Wave Layer 1 (Front Primary Green Wave) */}
            <svg
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className="h-full w-[200%] animate-[wave-flow_6s_linear_infinite] drop-shadow-[0_3px_8px_rgba(31,128,73,0.4)]"
            >
              <defs>
                <linearGradient id="wave-grad-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="35%" stopColor="#1f8049" />
                  <stop offset="70%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path
                d="M0 20 Q150 5 300 20 T600 20 T900 20 T1200 20 V40 H0 Z"
                fill="url(#wave-grad-primary)"
              />
            </svg>

            {/* Wave Layer 2 (Back Translucent Darker Ocean Blue Crest Wave) */}
            <svg
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-[200%] animate-[wave-flow_8s_linear_infinite_reverse] opacity-75 mix-blend-screen"
            >
              <defs>
                <linearGradient id="wave-grad-secondary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="50%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path
                d="M0 24 Q150 8 300 24 T600 24 T900 24 T1200 24 V40 H0 Z"
                fill="url(#wave-grad-secondary)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
