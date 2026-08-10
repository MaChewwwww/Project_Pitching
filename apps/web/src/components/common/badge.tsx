import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The app's badge (design.md Section 7.3).
 */

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "orange"
  | "danger"
  | "info"
  | "onDark";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-800 border-neutral-200/80",
  primary: "bg-primary-100/90 text-primary-900 border-primary-200/80",
  success: "bg-emerald-100/90 text-emerald-950 border-emerald-300/80",
  warning: "bg-amber-100/90 text-amber-950 border-amber-300/80",
  orange: "bg-orange-100/95 text-orange-950 border-orange-400/90",
  danger: "bg-red-100/90 text-red-950 border-red-300/80",
  info: "bg-sky-100/90 text-sky-950 border-sky-300/80",
  onDark: "bg-white/15 text-white border-white/20",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  neutral: "bg-transparent text-neutral-700 border-neutral-300",
  primary: "bg-transparent text-primary-700 border-primary-300",
  success: "bg-transparent text-success border-success",
  warning: "bg-transparent text-amber-600 border-amber-400",
  orange: "bg-transparent text-orange-600 border-orange-500",
  danger: "bg-transparent text-danger border-danger",
  info: "bg-transparent text-info border-info",
  onDark: "bg-transparent text-primary-100 border-white/30",
};

export interface BadgeProps extends Omit<
  React.ComponentProps<typeof UiBadge>,
  "variant"
> {
  tone?: BadgeTone;
  outline?: boolean;
  icon?: LucideIcon;
}

export function Badge({
  className,
  tone = "neutral",
  outline = false,
  icon: Icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <UiBadge
      variant="outline"
      className={cn(
        "h-auto rounded-full border px-2.5 py-1 text-caption leading-none font-bold tracking-tight shadow-2xs gap-1.5 inline-flex items-center shrink-0 whitespace-nowrap",
        outline ? TONE_OUTLINE[tone] : TONE[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
      <span>{children}</span>
    </UiBadge>
  );
}
