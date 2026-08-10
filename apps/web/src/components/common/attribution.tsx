import * as React from "react";
import { Info, ShieldAlert } from "lucide-react";

import { ATTRIBUTION } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Data credits and legal disclaimers (NFR-LGL-001 … 005, FR-MAP-008, FR-MAP-009).
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

const SHORT_DISCLAIMERS: Record<DisclaimerKind, string> = {
  "warning-authority": "Not an official warning authority — see DOST-PAGASA.",
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

  const muted = onDark ? "text-primary-100/80" : "text-neutral-700";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {disclaimers.map((kind) => {
        const isWarning = kind === "warning-authority";
        const Icon = isWarning ? ShieldAlert : Info;

        return (
          <div
            key={kind}
            className={cn(
              "flex gap-2.5 items-start rounded-xl border p-3 text-caption leading-relaxed",
              onDark
                ? "border-white/10 bg-white/5 text-primary-100/90"
                : "border-neutral-200/80 bg-neutral-50/80 text-neutral-700 shadow-2xs"
            )}
          >
            <Icon className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <p className={cn("text-caption font-medium leading-normal", muted)}>
              {short ? SHORT_DISCLAIMERS[kind] : DISCLAIMERS[kind]}
            </p>
          </div>
        );
      })}
      {sources.length > 0 ? (
        <p className={cn("text-caption px-1", muted)}>
          {sources.map((s) => ATTRIBUTION[s]).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
