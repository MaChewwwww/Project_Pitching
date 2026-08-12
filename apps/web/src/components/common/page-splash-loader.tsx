"use client";

import * as React from "react";
import { WaterSpinner } from "./water-spinner";

/**
 * Full-screen splash loader component displayed on initial page load / hard refresh.
 * Holds the loading screen for ~1.8 seconds to allow background data & Leaflet maps
 * to initialize cleanly before fading out gracefully.
 */
export function PageSplashLoader() {
  const [mounted, setMounted] = React.useState(true);
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.splashReady = "false";

    // Lock scroll during splash load
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Begin fade-out transition at 2.6s
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2600);

    // Unmount and restore scroll at 3.0s
    const unmountTimer = setTimeout(() => {
      root.dataset.splashReady = "true";
      document.dispatchEvent(new Event("splash-ready"));
      setMounted(false);
      document.body.style.overflow = originalOverflow;
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      delete root.dataset.splashReady;
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/90 backdrop-blur-xl transition-all duration-500 ease-in-out select-none ${
        fading ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Decorative Ambient Green Orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/50 blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl border border-emerald-200/80 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-950/10 backdrop-blur-md sm:p-10">
        {/* Brand Icon Badge with Pulsing Green Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-emerald-500/25 blur-2xl animate-pulse" />
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
        <div className="mt-1 h-1.5 w-52 overflow-hidden rounded-full bg-emerald-100 border border-emerald-300/70">
          <div className="h-full w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 animate-splash-progress origin-left rounded-full" />
        </div>
      </div>
    </div>
  );
}
