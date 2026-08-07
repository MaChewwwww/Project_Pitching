import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { CountUp } from "@/components/common/count-up";
import { cn } from "@/lib/utils";

/**
 * High-impact Statistic Card component (design.md Section 7.2).
 * Maximizes card space with bold metrics, glowing icon accents, and structured typography.
 */

export interface StatCardProps {
  label: string;
  /** `null` renders "—". Pass the reason in `caption`. */
  value: string | number | null;
  /**
   * When provided, the big number counts from 0 → this value when the card
   * scrolls into view. Supply the raw integer so the formatter can apply
   * `toLocaleString` at each animation frame.
   */
  countUpValue?: number;
  caption?: string;
  captionClassName?: string;
  /** Rendered after the value in a lighter weight, e.g. "of 2,400". */
  denominator?: string;
  icon?: LucideIcon;
  tone?: "light" | "dark";
  className?: string;
}

export function StatCard({
  label,
  value,
  countUpValue,
  caption,
  captionClassName,
  denominator,
  icon: Icon,
  tone = "light",
  className,
}: StatCardProps) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-2xl p-4.5 sm:p-5 transition-all duration-300",
        dark
          ? "bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/15 backdrop-blur-md hover:border-primary-400/50 hover:bg-white/12 hover:shadow-xl hover:-translate-y-0.5"
          : "bg-white border border-neutral-200/90 shadow-sm-card hover:border-primary-400 hover:shadow-md-card hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Top Header: Label & Icon Badge */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-overline font-bold tracking-wider uppercase",
            dark ? "text-primary-300" : "text-neutral-500",
          )}
        >
          {label}
        </span>

        {Icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl transition-all duration-200 group-hover:scale-105",
              dark
                ? "text-primary-200 bg-white/10 border border-white/10 group-hover:bg-primary-600 group-hover:text-white"
                : "bg-primary-50 text-primary-700 border border-primary-100/80 group-hover:bg-primary-600 group-hover:text-white",
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>

      {/* Hero Metric Number */}
      <p
        className={cn(
          "text-3xl sm:text-4xl tabular font-extrabold tracking-tight leading-tight",
          dark ? "text-white" : "text-neutral-900",
        )}
      >
        {countUpValue !== undefined ? (
          <CountUp to={countUpValue} />
        ) : (
          (value ?? "—")
        )}
        {denominator ? (
          <span
            className={cn(
              "text-h3 ml-1.5 font-normal",
              dark ? "text-primary-200/75" : "text-neutral-500",
            )}
          >
            {denominator}
          </span>
        ) : null}
      </p>

      {/* Caption */}
      {caption ? (
        <p
          className={cn(
            "text-caption font-medium leading-snug tracking-tight whitespace-nowrap overflow-hidden text-ellipsis",
            dark ? "text-primary-100/70" : "text-neutral-500",
            captionClassName,
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
