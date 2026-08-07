import * as React from "react";

import { ATTRIBUTION } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Data credits and legal disclaimers (NFR-LGL-001 … 005, FR-MAP-008, FR-MAP-009).
 *
 * **These are licence terms and statutory positions, not footer decoration.**
 * The Project NOAH hazard data is ODC-ODbL: attribution is mandatory and
 * derivatives inherit the licence. And NFR-LGL-005 requires the platform state
 * plainly that it is not an official warning authority — PAGASA and the NDRRMC
 * are. Removing any of this because it clutters a layout is not a design call.
 *
 * Source strings live in `lib/brand.ts` so the wording is identical everywhere.
 */

export type AttributionSource = keyof typeof ATTRIBUTION;

export type DisclaimerKind = "warning-authority" | "no-rescue-promise" | "boundaries";

const DISCLAIMERS: Record<DisclaimerKind, string> = {
  // NFR-LGL-005
  "warning-authority":
    "This platform is not an official warning authority. Official warnings are issued by DOST-PAGASA and the NDRRMC. Always follow instructions from the barangay and local authorities.",
  // NFR-LGL-007, FR-SAF-017
  "no-rescue-promise":
    "Submitting information here does not guarantee a rescue response. In an emergency, call the hotlines above.",
  // FR-MAP-008
  boundaries:
    "Area boundaries shown are approximations for planning and orientation. They are not cadastral or survey-grade data.",
};

export interface AttributionProps {
  sources?: AttributionSource[];
  disclaimer?: DisclaimerKind | DisclaimerKind[] | null;
  onDark?: boolean;
  className?: string;
}

export function Attribution({
  sources = [],
  disclaimer = null,
  onDark = false,
  className,
}: AttributionProps) {
  const disclaimers = disclaimer
    ? Array.isArray(disclaimer)
      ? disclaimer
      : [disclaimer]
    : [];

  if (sources.length === 0 && disclaimers.length === 0) return null;

  const muted = onDark ? "text-primary-100/60" : "text-neutral-500";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {disclaimers.map((kind) => (
        <p key={kind} className={cn("text-caption", muted)}>
          {DISCLAIMERS[kind]}
        </p>
      ))}
      {sources.length > 0 ? (
        <p className={cn("text-caption", muted)}>
          {sources.map((s) => ATTRIBUTION[s]).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
