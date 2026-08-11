"use client";

import * as React from "react";
import { WaterSpinner } from "./water-spinner";
import { APP_NAME } from "@/lib/brand";

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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl transition-all duration-500 ease-in-out select-none ${
        fading ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 p-6 text-center">
        {/* Brand Icon Badge with Pulsing Ambient Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
          <WaterSpinner size="lg" label="Loading application data..." />
        </div>

        {/* Brand Title & Subtitle */}
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {APP_NAME} <span className="text-emerald-400">San Jose</span>
            </h1>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Disaster Readiness & Community Health
          </p>
        </div>

        {/* Smooth Loading Progress Bar */}
        <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
          <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 animate-splash-progress origin-left rounded-full" />
        </div>
      </div>
    </div>
  );
}
