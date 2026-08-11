"use client";

import * as React from "react";
import { WaterSpinner } from "./water-spinner";

/**
 * Full-screen splash loader component displayed on initial page load / hard refresh.
 * Holds the loading screen for ~1.8 seconds to allow background data & Leaflet maps
 * to initialize cleanly before fading out gracefully.
 */
export function PageSplashLoader() {
  const [mounted, setMounted] = React.useState(false);
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Lock scroll during splash load
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Begin fade-out transition at 1.5s
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1500);

    // Unmount and restore scroll at 1.9s
    const unmountTimer = setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = originalOverflow;
    }, 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-emerald-50/40 to-white backdrop-blur-xl transition-all duration-500 ease-in-out select-none ${
        fading ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-100/90 bg-white/85 p-8 text-center shadow-2xl shadow-emerald-950/5 backdrop-blur-md sm:p-10">
        {/* Brand Icon Badge with Pulsing Green Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-emerald-400/25 blur-2xl animate-pulse" />
          <WaterSpinner size="lg" label="Loading application data..." />
        </div>

        {/* Brand Title & Subtitle */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
              SAGIP <span className="text-emerald-700">San Jose</span>
            </h1>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Disaster Readiness & Community Health
          </p>
        </div>

        {/* Smooth Loading Progress Bar */}
        <div className="mt-1 h-1.5 w-52 overflow-hidden rounded-full bg-emerald-100/90 border border-emerald-200/70">
          <div className="h-full w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 animate-splash-progress origin-left rounded-full" />
        </div>
      </div>
    </div>
  );
}
