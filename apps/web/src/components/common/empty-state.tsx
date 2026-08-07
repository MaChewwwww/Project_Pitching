import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Nothing to show (design.md Section 7.2).
 *
 * Note this is **not** the answer to an empty landing-page section — FR-PUB-018
 * says a section with no content is not rendered at all, so those return `null`
 * rather than an empty shell. This is for places where the container must stay:
 * a search with no matches, a guide index filtered down to nothing, a hotline
 * list that somehow came back empty.
 *
 * Icon is 40px at stroke 1.5, per Section 6's sizing table.
 */

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        size === "md" ? "px-6 py-12" : "px-4 py-8",
        className,
      )}
    >
      <Icon aria-hidden className="size-10 text-neutral-400" strokeWidth={1.5} />
      <p className="text-h3 text-neutral-800">{title}</p>
      {description ? (
        <p className="text-body max-w-md text-neutral-600">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
