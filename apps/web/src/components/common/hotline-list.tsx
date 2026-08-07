import * as React from "react";
import {
  Ambulance,
  Building2,
  Flame,
  LifeBuoy,
  Phone,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HotlineType, PublicHotline } from "@/lib/api/public-types";

/**
 * The one-tap callable hotline directory (FR-PUB-007, FR-SYS-014).
 *
 * Plain `<a href="tel:">` anchors — no JavaScript, no click handler, nothing that
 * can fail to hydrate. NFR-AVL-004 makes this the component that must render when
 * everything else on the page has broken, so it deliberately has no dependency
 * that could break with it.
 *
 * Rows are 48px, not the usual 44px floor: design.md Section 9.7 raises the
 * minimum for anything used during an emergency, and this is the definitive case.
 */

const ICONS: Record<HotlineType, typeof Phone> = {
  barangay: Building2,
  police: ShieldAlert,
  fire: Flame,
  ambulance: Ambulance,
  hospital: Stethoscope,
  rescue: LifeBuoy,
  mdrrmo: ShieldAlert,
};

export interface HotlineListProps {
  hotlines: PublicHotline[];
  layout?: "grid" | "stack";
  onDark?: boolean;
  className?: string;
}

export function HotlineList({
  hotlines,
  layout = "grid",
  onDark = false,
  className,
}: HotlineListProps) {
  return (
    <ul
      className={cn(
        layout === "grid"
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-2",
        className,
      )}
    >
      {hotlines.map((hotline) => {
        const Icon = ICONS[hotline.type];
        return (
          <li key={hotline.id}>
            <a
              href={toTelHref(hotline.number)}
              // Spelled out because a screen reader announcing "(02) 8555-0100"
              // as punctuation is not a number anyone can act on.
              aria-label={`Call ${hotline.label} at ${hotline.number}`}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                onDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "hover:border-primary-300 hover:bg-primary-50 border-neutral-200 bg-white",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md",
                  onDark
                    ? "text-primary-300 bg-white/10"
                    : "bg-primary-100 text-primary-700",
                )}
              >
                <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-label truncate",
                    onDark ? "text-white" : "text-neutral-800",
                  )}
                >
                  {hotline.label}
                </span>
                <span
                  className={cn(
                    "text-body-sm tabular font-semibold",
                    onDark ? "text-primary-300" : "text-primary-700",
                  )}
                >
                  {hotline.number}
                </span>
              </span>
              <Phone
                aria-hidden
                className={cn(
                  "ml-auto size-4 shrink-0",
                  onDark ? "text-primary-300" : "text-primary-600",
                )}
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
