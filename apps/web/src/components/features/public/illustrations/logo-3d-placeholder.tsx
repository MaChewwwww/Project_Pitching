"use client";

import { cn } from "@/lib/utils";

/**
 * 3D Logo Animation Placeholder component.
 * Replaces the static isometric diagram with an interactive 3D styled logo emblem.
 */
export function Logo3DPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-full flex-col items-center justify-center p-6 select-none",
        className,
      )}
    >
      {/* Ambient background glowing lighting */}
      <div className="bg-primary-400/20 pointer-events-none absolute size-72 animate-pulse rounded-full blur-3xl" />
      <div className="bg-primary-500/10 pointer-events-none absolute size-96 rounded-full blur-[100px]" />

      {/* 3D Perspective Canvas Container */}
      <div className="group relative flex flex-col items-center justify-center [perspective:1000px]">
        {/* Orbital Ring 1 */}
        <div
          aria-hidden
          className="border-primary-400/30 absolute size-72 animate-[spin_20s_linear_infinite] rounded-full border border-dashed"
        />

        {/* Orbital Ring 2 */}
        <div
          aria-hidden
          className="border-primary-300/20 absolute size-84 animate-[spin_30s_linear_infinite_reverse] rounded-full border"
        />

        {/* Floating 3D Badge */}
        <div className="relative flex flex-col items-center justify-center transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(12deg)_rotateX(-8deg)_scale(1.05)]">
          {/* Badge 3D Shadow Base */}
          <div className="bg-primary-950/80 absolute size-44 translate-y-8 translate-z-[-40px] rounded-3xl blur-xl" />

          {/* Main 3D Emblem Container */}
          <div className="from-primary-400 via-primary-600 to-primary-900 border-primary-300/40 relative flex size-44 items-center justify-center rounded-3xl border bg-gradient-to-br p-1 shadow-2xl transition-transform duration-500 [transform-style:preserve-3d]">
            {/* Glass reflection overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-80"
            />

            {/* Inner Emblem Content */}
            <div className="bg-primary-950/90 flex size-full flex-col items-center justify-center rounded-[22px] p-5 shadow-inner backdrop-blur-sm">
              {/* Roof & Water Mark SVG with 3D Pop */}
              <svg
                viewBox="0 0 40 40"
                className="size-20 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:translate-z-[30px]"
                role="img"
                aria-label="Barangay San Jose Emblem"
              >
                <rect width="40" height="40" rx="10" className="fill-primary-500/30" />
                {/* Roof */}
                <path
                  d="M20 8 L32 18.5 H28.5 V18.7 H11.5 V18.5 L20 8 Z"
                  className="fill-white drop-shadow-md"
                />
                <path d="M13.5 20 H26.5 V24.5 H13.5 Z" className="fill-white/90" />
                {/* Water Waves */}
                <path
                  d="M7 28.5c2.4 0 2.4 2 4.8 2s2.4-2 4.8-2 2.4 2 4.8 2 2.4-2 4.8-2 2.4 2 4.8 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="text-primary-300"
                />
                <path
                  d="M7 33c2.4 0 2.4 1.8 4.8 1.8s2.4-1.8 4.8-1.8 2.4 1.8 4.8 1.8 2.4-1.8 4.8-1.8 2.4 1.8 4.8 1.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="text-primary-400/60"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
