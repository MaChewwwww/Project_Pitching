"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Waves } from "lucide-react";

const FloodHeroScene = dynamic(() => import("./flood-hero-scene"), { ssr: false });

const AUTO_DELAY_MS = 2_200;
const AUTO_RISE_MS = 6_000;
const AUTO_HOLD_MS = 3_000;
const AUTO_RETURN_MS = 4_000;
const AUTO_TOTAL_MS = AUTO_DELAY_MS + AUTO_RISE_MS + AUTO_HOLD_MS + AUTO_RETURN_MS;
const ROTATION_STEP = Math.PI / 6;

type SceneQuality = "full" | "balanced" | "lean";

function smoothStep(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function FloodHeroVisual() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = React.useState<boolean | null>(null);
  const [quality, setQuality] = React.useState<SceneQuality>("lean");
  const [sceneFailed, setSceneFailed] = React.useState(false);
  const [sceneReady, setSceneReady] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [pageVisible, setPageVisible] = React.useState(true);
  const [splashReady, setSplashReady] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [floodLevel, setFloodLevel] = React.useState(0);
  const [rotationOffset, setRotationOffset] = React.useState(0);
  const [manualControl, setManualControl] = React.useState(false);
  const [hasPlayed, setHasPlayed] = React.useState(false);
  const [sliderHovered, setSliderHovered] = React.useState(false);
  const [sliderFocused, setSliderFocused] = React.useState(false);
  const [sliderDragging, setSliderDragging] = React.useState(false);
  const autoElapsedRef = React.useRef(0);

  React.useEffect(() => {
    let wideQuery: MediaQueryList | null = null;
    let desktopQuery: MediaQueryList | null = null;
    let updateWidth: (() => void) | null = null;
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      const hasWebgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      wideQuery = window.matchMedia("(min-width: 768px)");
      desktopQuery = window.matchMedia("(min-width: 1024px)");
      const cores =
        typeof navigator.hardwareConcurrency === "number"
          ? navigator.hardwareConcurrency
          : 4;

      updateWidth = () => {
        const isWide = Boolean(wideQuery?.matches);
        const isCapableDesktop = Boolean(desktopQuery?.matches) && cores > 4;
        setWebglAvailable(hasWebgl);
        setQuality(isWide ? (isCapableDesktop ? "full" : "balanced") : "lean");
      };
      updateWidth();
      wideQuery.addEventListener("change", updateWidth);
      desktopQuery.addEventListener("change", updateWidth);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (wideQuery && updateWidth) wideQuery.removeEventListener("change", updateWidth);
      if (desktopQuery && updateWidth) {
        desktopQuery.removeEventListener("change", updateWidth);
      }
    };
  }, []);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      {
        rootMargin: "120px",
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const markReady = () => setSplashReady(true);
    if (root.dataset.splashReady === "true") markReady();
    else document.addEventListener("splash-ready", markReady, { once: true });
    return () => document.removeEventListener("splash-ready", markReady);
  }, []);

  const shouldRenderScene = webglAvailable === true && !sceneFailed;
  const sceneEntered = shouldRenderScene && sceneReady && splashReady;
  const active = shouldRenderScene && visible && pageVisible && !reducedMotion;

  React.useEffect(() => {
    if (
      !shouldRenderScene ||
      !sceneReady ||
      !splashReady ||
      !visible ||
      !pageVisible ||
      reducedMotion ||
      manualControl ||
      hasPlayed
    ) {
      return;
    }

    let frame = 0;
    let previous: number | null = null;

    const tick = (now: number) => {
      if (previous === null) previous = now;
      autoElapsedRef.current += Math.min(now - previous, 50);
      previous = now;
      const elapsed = autoElapsedRef.current;

      if (elapsed < AUTO_DELAY_MS) {
        setFloodLevel(0);
      } else if (elapsed < AUTO_DELAY_MS + AUTO_RISE_MS) {
        setFloodLevel(smoothStep((elapsed - AUTO_DELAY_MS) / AUTO_RISE_MS));
      } else if (elapsed < AUTO_DELAY_MS + AUTO_RISE_MS + AUTO_HOLD_MS) {
        setFloodLevel(1);
      } else if (elapsed < AUTO_TOTAL_MS) {
        const returnElapsed = elapsed - AUTO_DELAY_MS - AUTO_RISE_MS - AUTO_HOLD_MS;
        setFloodLevel(1 - smoothStep(returnElapsed / AUTO_RETURN_MS));
      } else {
        autoElapsedRef.current = 0;
        setFloodLevel(0);
        setHasPlayed(true);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    hasPlayed,
    manualControl,
    pageVisible,
    reducedMotion,
    sceneReady,
    shouldRenderScene,
    splashReady,
    visible,
  ]);

  const takeManualControl = React.useCallback(() => {
    setManualControl(true);
    setHasPlayed(true);
    autoElapsedRef.current = 0;
  }, []);

  const handleSliderKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      let nextLevel: number | null = null;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowDown":
          nextLevel = Math.max(0, floodLevel - 0.01);
          break;
        case "ArrowRight":
        case "ArrowUp":
          nextLevel = Math.min(1, floodLevel + 0.01);
          break;
        case "Home":
          nextLevel = 0;
          break;
        case "End":
          nextLevel = 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      takeManualControl();
      setFloodLevel(Number(nextLevel.toFixed(2)));
    },
    [floodLevel, takeManualControl],
  );

  const levelLabel =
    floodLevel < 0.2
      ? "Calm river"
      : floodLevel < 0.45
        ? "Far road flooding"
        : floodLevel < 0.7
          ? "Market road flooding"
          : "High water";
  const showLevelTooltip = sliderHovered || sliderFocused || sliderDragging;
  const sliderTrackLength = 176;
  const tooltipPosition = 9 + (1 - floodLevel) * (sliderTrackLength - 18);

  return (
    <div ref={containerRef} className="absolute inset-0 isolate overflow-hidden">
      {shouldRenderScene && (
        <div className="hero-diorama-stage absolute inset-0" data-entered={sceneEntered}>
          <SceneErrorBoundary onError={() => setSceneFailed(true)}>
            <FloodHeroScene
              active={active}
              reducedMotion={reducedMotion}
              floodLevel={floodLevel}
              rotationOffset={rotationOffset}
              quality={quality}
              onReady={() => setSceneReady(true)}
              onContextLost={() => setSceneFailed(true)}
            />
          </SceneErrorBoundary>
        </div>
      )}

      {sceneEntered && (
        <div className="from-primary-950/55 to-primary-950/12 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent" />
      )}

      {sceneEntered ? (
        <>
          <div
            className="bg-primary-950/90 absolute bottom-16 left-3 z-40 flex items-center overflow-hidden rounded-xl border border-white/25 shadow-xl backdrop-blur-md sm:bottom-4 sm:left-4"
            role="group"
            aria-label="Rotate the San Jose flood illustration"
          >
            <button
              type="button"
              onClick={() => setRotationOffset((current) => current - ROTATION_STEP)}
              className="inline-flex size-10 sm:size-11 items-center justify-center text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
              aria-label="Rotate illustration left"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <span aria-hidden className="h-5 w-px bg-white/20" />
            <button
              type="button"
              onClick={() => setRotationOffset((current) => current + ROTATION_STEP)}
              className="inline-flex size-10 sm:size-11 items-center justify-center text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
              aria-label="Rotate illustration right"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          <div
            className="absolute top-[42%] sm:top-1/2 left-3 z-30 w-11 -translate-y-1/2 text-white sm:left-4"
            onPointerEnter={() => setSliderHovered(true)}
            onPointerLeave={() => setSliderHovered(false)}
          >
            <label
              htmlFor="hero-flood-level"
              className="mb-2 flex size-11 items-center justify-center drop-shadow-md"
            >
              <span className="sr-only">Illustrative flood level</span>
              <Waves aria-hidden className="size-5 text-sky-300" strokeWidth={2.25} />
            </label>
            <div className="relative h-44 w-11">
              <input
                id="hero-flood-level"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(floodLevel * 100)}
                onFocus={() => {
                  setSliderFocused(true);
                  takeManualControl();
                }}
                onBlur={() => setSliderFocused(false)}
                onPointerDown={() => {
                  setSliderDragging(true);
                  takeManualControl();
                }}
                onPointerUp={() => setSliderDragging(false)}
                onPointerCancel={() => setSliderDragging(false)}
                onKeyDown={handleSliderKeyDown}
                onChange={(event) => {
                  takeManualControl();
                  setFloodLevel(Number(event.currentTarget.value) / 100);
                }}
                aria-describedby="hero-flood-note"
                aria-orientation="vertical"
                aria-valuetext={levelLabel}
                className="hero-flood-range block"
                style={
                  {
                    "--flood-level": `${Math.round(floodLevel * 100)}%`,
                  } as React.CSSProperties
                }
              />
              {showLevelTooltip && (
                <output
                  htmlFor="hero-flood-level"
                  className="bg-primary-950/92 pointer-events-none absolute left-full ml-2 min-w-max -translate-y-1/2 rounded-lg border border-white/20 px-2.5 py-2 shadow-xl backdrop-blur-md"
                  style={{ top: tooltipPosition }}
                >
                  <span className="block text-[11px] leading-none font-bold">
                    {levelLabel}
                  </span>
                  <span className="mt-1 block text-[9px] font-semibold tracking-[0.08em] text-white/60 uppercase">
                    Demo only
                  </span>
                </output>
              )}
            </div>
            <p id="hero-flood-note" className="sr-only">
              This illustrative flood level is a demonstration only and is not the live
              river reading.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
