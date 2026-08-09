"use client";

import * as React from "react";

export type GeolocationStatus = "idle" | "locating" | "denied" | "unavailable" | "timeout" | "ok";

export interface GeolocationFix {
  lat: number;
  lng: number;
  accuracyM: number;
}

const ACCURACY_WARN_THRESHOLD_M = 50;

const ERROR_MESSAGES: Record<"denied" | "unavailable" | "timeout", string> = {
  denied:
    "Location permission is off. Tap the map to place your pin instead, or enable location access in your browser settings.",
  unavailable: "Couldn't get a location fix — tap the map to place your pin instead.",
  timeout: "Location took too long to respond — tap the map to place your pin instead.",
};

/**
 * FR-REG-008 / FR-MAP-013 — one-tap location, shared by every form that needs
 * it (LocationPicker, the rescue request form, incident reports, recording an
 * unregistered person). The map pin is always the primary input (design.md
 * Section 9.5); this is an accelerator that must never block on failure.
 *
 * Geolocation only ever worked over a secure context, and staging was a
 * bare-IP `http://` origin until real HTTPS landed — so this path was
 * previously unreachable and untested. It is reachable now, which is what
 * surfaced the gaps this hook closes: failures used to be silently
 * swallowed, and no accuracy/timeout options were ever passed.
 *
 * Always used from "use client" components that are themselves dynamically
 * imported with `ssr: false` (react-leaflet forces this everywhere it's
 * used), so reading `window`/`navigator` synchronously in lazy state is
 * safe — same precedent as `location-picker.tsx`'s original `isSecure` check.
 */
export function useGeolocation() {
  const [isSecureContext] = React.useState(() => window.isSecureContext);
  const [isSupported] = React.useState(() => "geolocation" in navigator);
  const [status, setStatus] = React.useState<GeolocationStatus>("idle");
  const [fix, setFix] = React.useState<GeolocationFix | null>(null);

  function locate() {
    if (!isSecureContext || !isSupported) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
        setStatus("ok");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setStatus("denied");
        else if (error.code === error.TIMEOUT) setStatus("timeout");
        else setStatus("unavailable");
      },
      // High accuracy costs battery and a few seconds; on a form that can be
      // a rescue request, that trade is obviously worth it.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  const errorMessage =
    status === "denied" || status === "unavailable" || status === "timeout"
      ? ERROR_MESSAGES[status]
      : null;

  // A default-accuracy fix from a phone can be kilometres wide. Presenting
  // that as an exact pin is worse than not having one.
  const accuracyNote =
    status === "ok" && fix && fix.accuracyM > ACCURACY_WARN_THRESHOLD_M
      ? `Accurate to about ${Math.round(fix.accuracyM)} m — drag the pin if this looks off.`
      : null;

  return { isSecureContext, isSupported, status, fix, errorMessage, accuracyNote, locate };
}
