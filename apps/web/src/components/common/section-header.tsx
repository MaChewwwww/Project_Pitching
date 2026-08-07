import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The header above a section or a content card (design.md Section 7.2).
 *
 * Carries the two signature moves of the public site:
 *
 * - **The `overline` eyebrow** — uppercase, letterspaced, muted. design.md
 *   Section 4 calls it "the signature", and it is what makes the page read as
 *   institutional rather than commercial.
 * - **The two-tone headline** — first part `neutral-900`, second part
 *   `primary-600` with an underline accent. Pass the second part as `titleAccent`.
 *
 * The icon sits in a 40px tinted rounded-square, per Section 6's sizing table.
 */

export interface SectionHeaderProps {
  eyebrow?: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  /** Rendered in `primary-600` with an underline accent, after `title`. */
  titleAccent?: React.ReactNode;
  description?: React.ReactNode;
  align?: "start" | "center";
  /** Heading level. A page has exactly one `h1`; sections below it use `h2`. */
  as?: "h1" | "h2" | "h3";
  /** Short rule under the eyebrow, as in the reference layout. */
  rule?: boolean;
  /** Right-aligned slot — a "view all" link, usually. Ignored when centred. */
  action?: React.ReactNode;
  className?: string;
  /** Inverts the palette for use on `primary-950` surfaces. */
  onDark?: boolean;
}

const TITLE_CLASS = {
  h1: "text-display-md",
  h2: "text-display-md",
  h3: "text-h2",
} as const;

export function SectionHeader({
  eyebrow,
  icon: Icon,
  title,
  titleAccent,
  description,
  align = "start",
  as = "h2",
  rule = false,
  action,
  className,
  onDark = false,
}: SectionHeaderProps) {
  const Heading = as;
  const centred = align === "center";

  return (
    <div
      className={cn(
        "flex gap-4",
        centred ? "flex-col items-center text-center" : "flex-col",
        !centred && action && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-3", centred && "items-center")}>
        {(eyebrow || Icon) && (
          <div className={cn("flex items-center gap-2", centred && "justify-center")}>
            {Icon ? (
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-md",
                  onDark
                    ? "text-primary-300 bg-white/10"
                    : "bg-primary-100 text-primary-700",
                  // The icon chip shrinks to a bare glyph when it sits beside a
                  // centred eyebrow, where a 40px block would dominate the line.
                  centred && "size-auto rounded-none bg-transparent",
                )}
              >
                <Icon
                  aria-hidden
                  className={centred ? "size-4" : "size-5"}
                  strokeWidth={2}
                />
              </span>
            ) : null}
            {eyebrow ? (
              <span
                className={cn(
                  "text-overline",
                  onDark ? "text-primary-300" : "text-primary-700",
                )}
              >
                {eyebrow}
              </span>
            ) : null}
          </div>
        )}

        {rule ? (
          <span
            aria-hidden
            className={cn(
              "block h-0.5 w-10 rounded-full",
              onDark ? "bg-primary-400" : "bg-primary-600",
            )}
          />
        ) : null}

        <Heading
          className={cn(TITLE_CLASS[as], onDark ? "text-white" : "text-neutral-900")}
        >
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span
                className={cn(
                  "relative whitespace-nowrap",
                  onDark ? "text-primary-300" : "text-primary-600",
                )}
              >
                {titleAccent}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 -bottom-1 block h-[3px] rounded-full",
                    onDark ? "bg-primary-400/60" : "bg-primary-600/40",
                  )}
                />
              </span>
            </>
          ) : null}
        </Heading>

        {description ? (
          <p
            className={cn(
              "text-body-lg max-w-2xl",
              onDark ? "text-primary-100/80" : "text-neutral-600",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action && !centred ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
