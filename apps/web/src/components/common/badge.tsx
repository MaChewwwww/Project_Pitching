import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The app's badge (design.md Section 7.3).
 *
 * Spec: `sm` radius (6px), 11px at weight 600, `2px 8px` padding, colours drawn
 * from the domain palettes. The shadcn primitive is `rounded-4xl` at `h-5` and
 * `text-xs`, so all four are overridden here rather than in `ui/badge.tsx`.
 *
 * For anything that represents a *domain state* — an alert level, an evacuation
 * centre's status — use `StatusBadge` instead. It picks the palette from the
 * value and guarantees an icon or a word accompanies the colour, which
 * `design.md` Section 10 requires and a bare `tone` prop cannot enforce.
 */

export type BadgeTone =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "onDark";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
  primary: "bg-primary-100 text-primary-800 border-primary-200",
  success: "bg-success-bg text-success border-success-border",
  warning: "bg-warning-bg text-warning border-warning-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  info: "bg-info-bg text-info border-info-border",
  onDark: "bg-white/10 text-primary-100 border-white/15",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  neutral: "bg-transparent text-neutral-700 border-neutral-300",
  primary: "bg-transparent text-primary-700 border-primary-300",
  success: "bg-transparent text-success border-success",
  warning: "bg-transparent text-warning border-warning",
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
        "h-auto rounded-sm border px-2 py-0.5 text-[11px] leading-4 font-semibold",
        outline ? TONE_OUTLINE[tone] : TONE[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="size-3" /> : null}
      {children}
    </UiBadge>
  );
}
