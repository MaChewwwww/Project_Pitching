"use client";

import * as React from "react";
import { WaterSpinner } from "./water-spinner";

const EXIT_DURATION_MS = 400;

/**
 * Full-screen splash loader component displayed on initial page load / hard refresh.
 * The public shell keeps its original three-second presentation. Authenticated
 * portals pass a shorter minimum and a readiness signal so the same visual language
 * stays consistent without hiding a slow session restore behind a hard timeout.
 */
export function PageSplashLoader({
  minDurationMs = 3000,
  ready = true,
  loadingLabel = "Loading application data...",
}: {
  /** Minimum time the splash remains visible before it can begin fading. */
  minDurationMs?: number;
  /** Keep the splash mounted while the surrounding shell is still preparing. */
  ready?: boolean;
  /** Accessible label announced by the spinner. */
  loadingLabel?: string;
}) {
  const [mounted, setMounted] = React.useState(true);
  const [fading, setFading] = React.useState(false);
  const startedAtRef = React.useRef<number | null>(null);
  const finishTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const originalOverflowRef = React.useRef("");
  const previousSplashReadyRef = React.useRef<string | undefined>(undefined);

  const finish = React.useCallback(() => {
    if (!ready || !mounted || fading) return;

    const startedAt = startedAtRef.current ?? Date.now();
    const remaining = Math.max(
      0,
      minDurationMs - (Date.now() - startedAt) - EXIT_DURATION_MS,
    );

    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setFading(true);
      unmountTimerRef.current = setTimeout(() => {
        if (rootRef.current) rootRef.current.dataset.splashReady = "true";
        document.dispatchEvent(new Event("splash-ready"));
        document.body.style.overflow = originalOverflowRef.current;
        setMounted(false);
      }, EXIT_DURATION_MS);
    }, remaining);
  }, [fading, minDurationMs, mounted, ready]);

  React.useEffect(() => {
    const root = document.documentElement;
    rootRef.current = root;
    startedAtRef.current = Date.now();
    previousSplashReadyRef.current = root.dataset.splashReady;
    root.dataset.splashReady = "false";

    // Lock scroll during splash load
    originalOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
      if (previousSplashReadyRef.current === undefined) {
        delete root.dataset.splashReady;
      } else {
        root.dataset.splashReady = previousSplashReadyRef.current;
      }
      document.body.style.overflow = originalOverflowRef.current;
    };
  }, []);

  React.useEffect(() => {
    finish();
    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [finish]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex h-[100dvh] w-screen max-w-full flex-col items-center justify-center overflow-hidden p-4 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/90 backdrop-blur-xl transition-all duration-500 ease-in-out select-none ${
        fading ? "pointer-events-none scale-105 opacity-0" : "scale-100 opacity-100"
      }`}
    >
      {/* Decorative Ambient Green Orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-teal-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[350px] w-[350px] sm:h-[500px] sm:w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/50 blur-[80px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[340px] sm:max-w-sm flex-col items-center gap-5 sm:gap-6 rounded-3xl border border-emerald-200/80 bg-white/95 p-6 sm:p-8 text-center shadow-2xl shadow-emerald-950/15 backdrop-blur-md">
        {/* Brand Icon Badge with Pulsing Green Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-5 sm:-inset-6 animate-pulse rounded-full bg-emerald-500/25 blur-xl" />
          <WaterSpinner size="lg" label={loadingLabel} />
        </div>

        {/* Brand Title & Subtitle */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-ping rounded-full bg-emerald-600" />
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
              SAGIP <span className="text-emerald-700">San Jose</span>
            </h1>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-neutral-500 uppercase">
            Disaster Readiness & Community Health
          </p>
        </div>

        {/* Smooth Loading Progress Bar */}
        <div className="mt-1 h-1.5 w-44 sm:w-52 max-w-full overflow-hidden rounded-full border border-emerald-300/70 bg-emerald-100">
          <div
            className="animate-splash-progress h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400"
            style={{ animationDuration: `${Math.max(minDurationMs, 600)}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
