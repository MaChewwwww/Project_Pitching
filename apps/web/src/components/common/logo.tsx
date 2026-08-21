import Image from "next/image";

import { BARANGAY } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Shared system logo from the approved transparent PNG asset.
 *
 * The source is a self-contained square lockup, so the full variant only adds
 * the barangay descriptor. The `mark` variant keeps the image-only form for
 * compact console headers.
 */

export interface LogoLockupProps {
  variant?: "full" | "mark";
  onDark?: boolean;
  /** Mark height in pixels. 40 in the navbar and footer, 32 in a collapsed rail. */
  size?: 32 | 40;
  className?: string;
}

function Mark({ size }: { size: number }) {
  return (
    <Image
      src="/logo-transparent.png"
      alt="SAGIP-SJ logo"
      width={size}
      height={size}
      className="shrink-0 rounded-[32%] object-contain"
    />
  );
}

export function LogoLockup({
  variant = "full",
  onDark = false,
  size = 40,
  className,
}: LogoLockupProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 sm:gap-2.5", className)}>
      <Mark size={size} />
      {variant === "full" ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "mt-0.5 truncate text-[11px] leading-tight font-semibold tracking-tight sm:text-[13.5px]",
              onDark ? "text-neutral-300" : "text-neutral-600",
            )}
          >
            {BARANGAY}
          </span>
        </span>
      ) : null}
    </span>
  );
}
