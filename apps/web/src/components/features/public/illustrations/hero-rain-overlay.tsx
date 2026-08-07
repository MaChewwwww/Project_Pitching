"use client";

import * as React from "react";

/**
 * Full Left-Column Concentric Water Ripple System (100% Animated Brand Primary Green)
 *
 * Renders expanding organic dual-ring water ripples across staggered locations
 * in the left hero column, mimicking liquid raindrop impact waves in brand green.
 */
export function HeroRainOverlay() {
  // Staggered positions (left %, top %), sizes, and animation delays for 10 water ripple nodes
  const ripples = [
    { left: "15%", top: "18%", size: "240px", delay: "0.0s", duration: "4.5s" },
    { left: "75%", top: "25%", size: "280px", delay: "1.2s", duration: "5.2s" },
    { left: "35%", top: "48%", size: "320px", delay: "2.4s", duration: "5.8s" },
    { left: "85%", top: "62%", size: "220px", delay: "0.8s", duration: "4.2s" },
    { left: "20%", top: "78%", size: "260px", delay: "1.8s", duration: "4.8s" },
    { left: "55%", top: "15%", size: "200px", delay: "3.0s", duration: "4.0s" },
    { left: "68%", top: "82%", size: "300px", delay: "3.6s", duration: "5.6s" },
    { left: "45%", top: "85%", size: "210px", delay: "2.1s", duration: "4.6s" },
    { left: "10%", top: "52%", size: "230px", delay: "4.0s", duration: "5.0s" },
    { left: "90%", top: "40%", size: "250px", delay: "1.5s", duration: "4.4s" },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Dynamic Concentric Water Ripple Nodes (Pure Brand Green) */}
      {ripples.map((r, idx) => (
        <div
          key={idx}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: r.left,
            top: r.top,
            width: r.size,
            height: r.size,
          }}
        >
          {/* Outer Primary Wave Ring */}
          <div
            className="absolute inset-0 rounded-full border border-primary-500/50 shadow-[0_0_14px_rgba(31,128,73,0.35)] water-ripple-ring"
            style={{
              animationDuration: r.duration,
              animationDelay: r.delay,
            }}
          />

          {/* Inner Secondary Wave Crest Ring */}
          <div
            className="absolute inset-4 rounded-full border border-emerald-400/40 water-ripple-ring"
            style={{
              animationDuration: r.duration,
              animationDelay: `calc(${r.delay} + 0.4s)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
