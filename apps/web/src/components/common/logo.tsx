import * as React from "react";

import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Logo placeholder (design.md Section 2, open item D-OI-2).
 *
 * **No logo has been designed yet.** design.md reserves the slot and sets three
 * requirements for whoever designs it: legible at 32px, works on both
 * `primary-950` and white, and has a mark that stands alone. The inline SVG below
 * meets those so the layout is real, and swapping it is one file.
 *
 * The mark is a roof over a water line — shelter above rising water, which is the
 * platform in one glyph. Drawn as SVG rather than an image file so it inherits
 * `currentColor` and needs no binary asset.
 *
 * `APP_NAME` is a placeholder too (BRD OI-1). It is read from `lib/brand.ts` and
 * never typed as a literal.
 */

export interface LogoLockupProps {
  variant?: "full" | "mark";
  onDark?: boolean;
  /** Mark height in pixels. 40 in the navbar and footer, 32 in a collapsed rail. */
  size?: 32 | 40;
  className?: string;
}

function Mark({ size, onDark }: { size: number; onDark: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className="shrink-0"
    >
      <rect
        width="40"
        height="40"
        rx="10"
        className={onDark ? "fill-primary-400" : "fill-primary-600"}
      />
      {/* Roof */}
      <path
        d="M20 9.5 30.5 19h-3.1v.2H12.6V19L20 9.5Z"
        className={onDark ? "fill-primary-950" : "fill-white"}
      />
      <path
        d="M14.4 20.6h11.2v4.1H14.4z"
        className={onDark ? "fill-primary-950" : "fill-white"}
      />
      {/* Water line */}
      <path
        d="M8 28.4c2.4 0 2.4 1.9 4.8 1.9s2.4-1.9 4.8-1.9 2.4 1.9 4.8 1.9 2.4-1.9 4.8-1.9 2.4 1.9 4.8 1.9"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={onDark ? "stroke-primary-950" : "stroke-white"}
      />
    </svg>
  );
}

export function LogoLockup({
  variant = "full",
  onDark = false,
  size = 40,
  className,
}: LogoLockupProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} onDark={onDark} />
      {variant === "full" ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[17px] font-extrabold tracking-tight",
              onDark ? "text-white" : "text-neutral-900",
            )}
          >
            {APP_NAME}
          </span>
          <span
            className={cn(
              "text-overline mt-0.5",
              onDark ? "text-primary-300" : "text-primary-700",
            )}
          >
            Barangay San Jose
          </span>
        </span>
      ) : null}
    </span>
  );
}
