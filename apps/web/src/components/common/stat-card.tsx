import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A single statistic (design.md Section 7.2).
 *
 * `overline` label, `display-md` value, optional caption. The value carries
 * `tabular` so digits do not jitter when the number changes — Section 4 requires
 * it on every KPI.
 *
 * **A null value renders an em dash and its caption explains why.** Several of
 * the barangay's totals are genuinely unknown (BRD OI-12), and a fabricated
 * number on a page whose premise is honest data would be self-defeating.
 */

export interface StatCardProps {
  label: string;
  /** `null` renders "—". Pass the reason in `caption`. */
  value: string | number | null;
  caption?: string;
  /** Rendered after the value in a lighter weight, e.g. "of 2,400". */
  denominator?: string;
  icon?: LucideIcon;
  tone?: "light" | "dark";
  className?: string;
}

export function StatCard({
  label,
  value,
  caption,
  denominator,
  icon: Icon,
  tone = "light",
  className,
}: StatCardProps) {
  const dark = tone === "dark";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              dark ? "text-primary-300 bg-white/10" : "bg-primary-100 text-primary-700",
            )}
          >
            <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
          </span>
        ) : null}
        <span
          className={cn("text-overline", dark ? "text-primary-300" : "text-neutral-500")}
        >
          {label}
        </span>
      </div>

      <p
        className={cn(
          "text-display-md tabular",
          dark ? "text-white" : "text-neutral-900",
        )}
      >
        {value ?? "—"}
        {denominator ? (
          <span
            className={cn(
              "text-h3 ml-1.5 font-normal",
              dark ? "text-primary-200/70" : "text-neutral-500",
            )}
          >
            {denominator}
          </span>
        ) : null}
      </p>

      {caption ? (
        <p
          className={cn(
            "text-caption",
            dark ? "text-primary-100/70" : "text-neutral-500",
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
