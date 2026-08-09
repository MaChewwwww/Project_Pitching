"use client";

import * as React from "react";
import {
  Ambulance,
  Building2,
  Check,
  Copy,
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
 * The hotline directory with one-click copy functionality (FR-PUB-007, FR-SYS-014).
 * Clicking any hotline item copies the phone number directly to the clipboard.
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
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, number: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(number);
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <ul
      className={cn(
        layout === "grid"
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-2.5",
        className,
      )}
    >
      {hotlines.map((hotline) => {
        const Icon = ICONS[hotline.type];
        const isCopied = copiedId === hotline.id;

        return (
          <li key={hotline.id}>
            <div
              className={cn(
                "group shadow-sm-card flex min-h-14 items-center justify-between gap-3.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200",
                onDark
                  ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/15"
                  : "hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-md-card border-neutral-200/90 bg-white",
              )}
            >
              {/* Click main body to copy */}
              <button
                type="button"
                onClick={() => handleCopy(hotline.id, hotline.number)}
                className="focus-visible:ring-ring -m-1 flex flex-1 cursor-pointer items-center gap-3.5 rounded-lg p-1 text-left focus-visible:ring-2 focus-visible:outline-none"
                title="Click to copy phone number"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                    onDark
                      ? "text-primary-300 bg-white/10"
                      : "bg-primary-100/80 text-primary-700 group-hover:bg-primary-600 group-hover:text-white",
                  )}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "text-label truncate font-semibold",
                      onDark ? "text-white" : "text-neutral-900",
                    )}
                  >
                    {hotline.label}
                  </span>
                  <span
                    className={cn(
                      "text-body-sm tabular font-bold tracking-tight",
                      onDark ? "text-primary-300" : "text-primary-700",
                    )}
                  >
                    {hotline.number}
                  </span>
                </span>
              </button>

              {/* Action Buttons: Copy Indicator & Direct Call Option */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(hotline.id, hotline.number)}
                  title={isCopied ? "Copied to clipboard!" : `Copy ${hotline.number}`}
                  aria-label={
                    isCopied ? "Copied to clipboard" : `Copy phone number ${hotline.number}`
                  }
                  className={cn(
                    "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors",
                    isCopied
                      ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                      : onDark
                        ? "hover:bg-primary-500 bg-white/10 text-white"
                        : "hover:bg-primary-600 border border-neutral-200/80 bg-neutral-100 text-neutral-600 hover:text-white",
                  )}
                >
                  {isCopied ? (
                    <Check className="size-3.5 text-emerald-700" strokeWidth={2.5} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={2} />
                  )}
                </button>

                {/* Direct Tel Call Link */}
                <a
                  href={toTelHref(hotline.number)}
                  title={`Direct call ${hotline.number}`}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                    onDark
                      ? "hover:bg-primary-500 bg-white/10 text-white"
                      : "hover:bg-primary-600 border border-neutral-200/80 bg-neutral-100 text-neutral-600 hover:text-white",
                  )}
                >
                  <Phone aria-hidden className="size-3.5" strokeWidth={2} />
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
