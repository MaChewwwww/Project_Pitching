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
  h1: "text-display-lg sm:text-display-xl",
  h2: "text-display-md sm:text-display-lg",
  h3: "text-h1 sm:text-display-md",
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
    <div className={cn("flex flex-col gap-2.5", className)}>
      {eyebrow && (
        <div className={cn("flex items-center gap-2.5", centred && "justify-center")}>
          {Icon ? (
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-200",
                onDark
                  ? "text-primary-300 border border-white/10 bg-white/10"
                  : "bg-primary-50 text-primary-700 border-primary-100/80 shadow-sm-card border",
                centred &&
                  "size-auto rounded-none border-none bg-transparent shadow-none",
              )}
            >
              <Icon
                aria-hidden
                className={centred ? "text-primary-600 size-4" : "size-5"}
                strokeWidth={2}
              />
            </span>
          ) : null}
          <span
            className={cn(
              "text-overline font-bold tracking-wider",
              onDark ? "text-primary-300" : "text-primary-700",
            )}
          >
            {eyebrow}
          </span>
        </div>
      )}

      {rule ? (
        <span
          aria-hidden
          className={cn(
            "block h-1 w-12 rounded-full",
            onDark
              ? "from-primary-400 to-primary-200 bg-gradient-to-r"
              : "from-primary-600 to-primary-400 bg-gradient-to-r",
          )}
        />
      ) : null}

      {/* Heading Row: Title + Action Button side by side */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap",
          centred && "justify-center",
        )}
      >
        <Heading
          className={cn(
            TITLE_CLASS[as],
            "tracking-tight flex items-center gap-3.5 flex-wrap",
            centred && "justify-center",
            onDark ? "text-white" : "text-neutral-900",
          )}
        >
          {!eyebrow && Icon ? (
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
                onDark
                  ? "bg-white/10 text-primary-300 border border-white/20 ring-4 ring-white/5"
                  : "bg-gradient-to-br from-primary-500/15 via-primary-600/10 to-emerald-600/5 text-primary-600 border border-primary-600/20 shadow-sm ring-4 ring-primary-500/10",
              )}
            >
              <Icon aria-hidden className="size-5.5 text-primary-600" strokeWidth={2.2} />
            </span>
          ) : null}
          <span className="font-extrabold">
            {title}
            {titleAccent ? (
              <>
                {" "}
                <span
                  className={cn(
                    "relative inline-block font-extrabold whitespace-nowrap",
                    onDark
                      ? "text-primary-300"
                      : "bg-gradient-to-r from-primary-600 via-primary-700 to-emerald-600 bg-clip-text text-transparent",
                  )}
                >
                  {titleAccent}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 -bottom-1 block h-[3.5px] rounded-full opacity-70",
                      onDark
                        ? "from-primary-400/80 via-primary-300/60 bg-gradient-to-r to-transparent"
                        : "from-primary-500 via-emerald-500 bg-gradient-to-r to-primary-300/40",
                    )}
                  />
                </span>
              </>
            ) : null}
          </span>
        </Heading>

        {action && !centred ? <div className="shrink-0 max-sm:w-full">{action}</div> : null}
      </div>

      {description ? (
        <p
          className={cn(
            "text-body-lg max-w-none leading-relaxed",
            onDark ? "text-primary-100/85" : "text-neutral-600",
            centred && "text-center mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
