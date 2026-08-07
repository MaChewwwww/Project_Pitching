"use client";

import * as React from "react";
import { Phone, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HotlineList } from "./hotline-list";
import { cn } from "@/lib/utils";
import type { PublicHotline } from "@/lib/api/public-types";

/**
 * The always-reachable emergency hotline action (FR-PUB-015, BR-0.15).
 *
 * BR-0.15 is a hard requirement: the hotline must be reachable from anywhere on
 * the page **without scrolling**. The team's own layout puts the hotlines section
 * seventh, and during an actual flood it is the most-used element on the page —
 * so it also lives here, fixed above everything.
 *
 * A popover anchored to the button, rather than a bottom sheet, for two reasons:
 * it opens upward into the thumb zone from a bottom-right anchor, and it has no
 * viewport-dependent branch, so there is no hydration flash on the one component
 * that must never be missing.
 *
 * 56px, `safe-bottom` for the home indicator, and `z-40` — below the alert banner
 * at `z-50`, because an evacuation order outranks the means to ask about one.
 */

export interface HotlineButtonProps {
  hotlines: PublicHotline[];
  label?: string;
}

export function HotlineButton({
  hotlines,
  label = "Emergency hotlines",
}: HotlineButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex max-w-[1440px] justify-end px-4 pb-4 md:px-6 md:pb-6">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            aria-label={label}
            className={cn(
              "pointer-events-auto inline-flex min-h-14 items-center gap-2.5 rounded-full",
              "bg-danger shadow-lg-card px-5 text-white transition-colors",
              "hover:bg-danger-hover focus-visible:ring-danger/40 focus-visible:ring-3",
              "focus-visible:outline-none",
            )}
          >
            {open ? (
              <X aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <Phone aria-hidden className="size-5" strokeWidth={2.5} />
            )}
            <span className="text-label hidden sm:inline">Hotlines</span>
            <span
              aria-hidden
              className="size-2 rounded-full bg-white motion-safe:animate-pulse"
            />
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="end"
            sideOffset={12}
            className="shadow-lg-card pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-[14px] border-neutral-200 p-3"
          >
            <p className="text-overline mb-2 px-1 text-neutral-500">{label}</p>
            <HotlineList hotlines={hotlines} layout="stack" />
            <p className="text-caption mt-2 px-1 text-neutral-500">
              In an emergency, call rather than submitting anything online.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
