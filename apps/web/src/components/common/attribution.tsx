import * as React from "react";

import { ATTRIBUTION } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Data credits and legal disclaimers (NFR-LGL-001 … 005, FR-MAP-008, FR-MAP-009).
 */

export type AttributionSource = keyof typeof ATTRIBUTION;

export type DisclaimerKind = "warning-authority" | "no-rescue-promise" | "boundaries";

const DISCLAIMERS: Record<DisclaimerKind, string> = {
  // NFR-LGL-005 — Rephrased for Barangay implementation
  "warning-authority":
    "Official flood advisories and river level monitoring are managed by Barangay San Jose in coordination with DOST-PAGASA and the Rodriguez MDRRMO. Always follow emergency instructions issued by barangay officials.",
  // NFR-LGL-007, FR-SAF-017
  "no-rescue-promise":
    "Submitting information here does not guarantee a rescue response. In an emergency, call the hotlines above.",
  // FR-MAP-008
  boundaries:
    "Area boundaries shown are approximations for planning and orientation. They are not cadastral or survey-grade data.",
};

const SHORT_DISCLAIMERS: Record<DisclaimerKind, string> = {
  "warning-authority": "Managed by Barangay San Jose in coordination with DOST-PAGASA & MDRRMO.",
  "no-rescue-promise": "Submitting this does not guarantee a response.",
  boundaries: "Boundaries are approximate.",
};

export interface AttributionProps {
  sources?: AttributionSource[];
  disclaimer?: DisclaimerKind | DisclaimerKind[] | null;
  short?: boolean;
  onDark?: boolean;
  className?: string;
}

export function Attribution({
  sources = [],
  disclaimer = null,
  short = false,
  onDark = false,
  className,
}: AttributionProps) {
  const disclaimers = disclaimer
    ? Array.isArray(disclaimer)
      ? disclaimer
      : [disclaimer]
    : [];

  if (sources.length === 0 && disclaimers.length === 0) return null;

  const textClass = onDark ? "text-primary-100/90" : "text-neutral-600";
  const mutedClass = onDark ? "text-primary-200/70" : "text-neutral-500";
  const borderClass = onDark ? "border-white/10" : "border-neutral-200/60";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-xs leading-relaxed",
        onDark
          ? "border-white/10 bg-white/5 text-primary-100"
          : "border-neutral-200/80 bg-neutral-50/80 text-neutral-700 shadow-2xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        {disclaimers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {disclaimers.map((kind) => (
              <p key={kind} className={cn("text-xs font-medium leading-relaxed", textClass)}>
                {short ? SHORT_DISCLAIMERS[kind] : DISCLAIMERS[kind]}
              </p>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <p
            className={cn(
              "text-[11px] font-normal leading-normal pt-2 border-t",
              borderClass,
              mutedClass,
            )}
          >
            {sources.map((s) => ATTRIBUTION[s]).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

