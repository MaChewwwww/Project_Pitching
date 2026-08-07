import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The app's button (design.md Section 7.3).
 *
 * Six variants, three sizes, and a `pill` flag for the public site. shadcn's
 * primitive has none of those — its `destructive` is a tinted 10% fill, its
 * default height is 32px, and its radius is 14px where Section 5 wants 10px.
 *
 * **How this overrides the primitive without editing it.** `ui/button.tsx`
 * composes `cn(buttonVariants({ variant, size, className }))`. cva concatenates
 * `className` last, and `cn` is `twMerge`, so a class passed in here wins the
 * conflict against the primitive's own variant and size classes. The primitive
 * stays exactly as `make shadcn` wrote it (NFR-MNT-006) — we out-specify it
 * rather than restyling it, which matters because a reinstall would silently
 * discard any edit made there.
 *
 * We still pass a `variant` down so the primitive's focus-ring and
 * `aria-expanded` handling comes along; only the paint is replaced.
 */

const appButton = cva(
  "font-sans font-semibold transition-all duration-150 active:scale-[0.96] active:opacity-90",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700",
        secondary: "bg-primary-100 text-primary-800 hover:bg-primary-200",
        outline:
          "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
        ghost:
          "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        danger: "bg-danger text-white hover:bg-danger-hover",
        // The pulse is motion-safe: under prefers-reduced-motion the ring remains
        // and the animation stops, so the emphasis survives without the movement.
        emergency:
          "bg-danger text-white shadow-emergency hover:bg-danger-hover motion-safe:animate-pulse",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[13px] tap-44",
        md: "h-10 gap-2 px-4 text-[15px]",
        lg: "h-12 gap-2 px-6 text-[15px]",
      },
      pill: {
        true: "rounded-full",
        false: "rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md", pill: false },
  },
);

/** Which primitive variant to sit on, chosen for the focus ring it carries. */
const BASE_VARIANT = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
  emergency: "destructive",
} as const;

type AppVariant = keyof typeof BASE_VARIANT;

export interface ButtonProps
  extends
    Omit<React.ComponentProps<typeof UiButton>, "variant" | "size">,
    Omit<VariantProps<typeof appButton>, "variant" | "size" | "pill"> {
  variant?: AppVariant;
  size?: "sm" | "md" | "lg";
  /** Fully rounded. The public site uses pills; the admin console does not. */
  pill?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  pill = false,
  ...props
}: ButtonProps) {
  return (
    <UiButton
      variant={BASE_VARIANT[variant]}
      // Always "default" — our own cva supplies every dimension, and letting the
      // primitive's size classes through would mean two sources of truth for
      // height.
      size="default"
      className={cn(
        appButton({ variant, size, pill }),
        // An emergency action is never below the 48px touch floor, whatever size
        // the caller asked for (design.md Section 9.7).
        variant === "emergency" && "tap-48 min-h-12",
        className,
      )}
      {...props}
    />
  );
}
