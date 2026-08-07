import * as React from "react";

import {
  Card as UiCard,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The app's card (design.md Sections 5 and 8).
 *
 * Three things the shadcn primitive gets differently from the spec:
 *
 * - **Radius.** The primitive is `rounded-xl` (20px). Section 5 wants `lg` (14px)
 *   for a card, and Section 8 overrides that to `xl` on the public site, where
 *   the softer corner is part of the "brochure not tool" personality. Hence the
 *   `radius` prop, defaulting to `lg`.
 * - **Border.** The primitive uses `ring-1 ring-foreground/10`. Section 5 asks
 *   for a 1px `neutral-200` hairline and no shadow at rest — "prefer borders over
 *   shadows" is what keeps dense layouts readable.
 * - **Padding.** 16px on mobile, 24px from `md` up. The primitive drives its own
 *   padding through `--card-spacing`, so setting that variable moves the header,
 *   content and footer together.
 *
 * Subcomponents are re-exported so pages never reach into `ui/` for them.
 */

export interface CardProps extends React.ComponentProps<typeof UiCard> {
  /** `lg` (14px) for admin surfaces, `xl` (20px) for the public site. */
  radius?: "lg" | "xl";
  /** `flat` is the default and should stay the default. */
  variant?: "flat" | "raised" | "dark" | "tint";
  /** Adds hover elevation. Only for cards that are themselves a link or button. */
  interactive?: boolean;
  /** The green top edge from the reference layout's service cards. */
  topAccent?: boolean;
}

const RADIUS = {
  lg: "rounded-[14px]",
  xl: "rounded-[20px]",
} as const;

const VARIANT = {
  flat: "bg-card ring-0 border border-neutral-200 shadow-flat",
  raised: "bg-card ring-0 border border-neutral-200 shadow-sm-card",
  dark: "bg-primary-950 ring-0 border border-primary-800 text-primary-100 shadow-flat",
  tint: "bg-surface-tint ring-0 border border-primary-200 shadow-flat",
} as const;

export function Card({
  className,
  radius = "lg",
  variant = "flat",
  interactive = false,
  topAccent = false,
  ...props
}: CardProps) {
  return (
    <UiCard
      data-variant={variant}
      className={cn(
        RADIUS[radius],
        VARIANT[variant],
        "[--card-spacing:--spacing(4)] md:[--card-spacing:--spacing(6)]",
        interactive &&
          "hover:shadow-md-card focus-within:shadow-md-card transition-shadow duration-150 ease-out",
        topAccent && "border-t-primary-600 border-t-[3px]",
        className,
      )}
      {...props}
    />
  );
}

export { CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
