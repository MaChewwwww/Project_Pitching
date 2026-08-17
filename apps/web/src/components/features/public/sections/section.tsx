import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The shared wrapper every landing-page section sits in.
 *
 * Holds the two spacing rules from design.md Section 5 in one place: 16px gutters
 * on mobile and 24px from `md`, inside a 1440px maximum; 32px between sections on
 * mobile and 48px from `md` — the public site's "generous" density, as opposed to
 * the admin console's 24px.
 *
 * The `id` is what the navbar's in-page anchors target.
 */

export interface SectionProps extends React.ComponentProps<"section"> {
  tone?: "default" | "tint" | "dark";
  /** Removes vertical padding, for a section that paints its own band. */
  flush?: boolean;
}

const TONE = {
  default: "bg-background",
  tint: "bg-surface-tint",
  dark: "bg-surface-dark text-primary-100",
} as const;

export function Section({
  className,
  tone = "default",
  flush = false,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(TONE[tone], !flush && "py-8 md:py-12", "w-full max-w-full overflow-hidden", className)} {...props}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">{children}</div>
    </section>
  );
}
