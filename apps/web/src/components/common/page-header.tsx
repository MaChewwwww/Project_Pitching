import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The header band on an interior route (design.md Section 7.2).
 *
 * Title, optional description, optional breadcrumb, and a right-aligned action
 * slot. Below `sm` the title stacks above the action and the action goes full
 * width (Section 9.3).
 *
 * Breadcrumbs are rendered as plain anchors rather than through `ui/breadcrumb`:
 * that primitive carries `"use client"`, and a trail of links needs no
 * interactivity. Every client boundary avoided on the public site is bundle
 * budget kept (NFR-PERF-006).
 */

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Rendered in `primary-600`, after `title`. */
  titleAccent?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  titleAccent,
  description,
  breadcrumb,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("bg-surface-tint border-b border-neutral-200", className)}>
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1">
              {breadcrumb.map((crumb, i) => {
                const last = i === breadcrumb.length - 1;
                return (
                  <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 ? (
                      <ChevronRight aria-hidden className="size-3.5 text-neutral-400" />
                    ) : null}
                    {crumb.href && !last ? (
                      <Link
                        href={crumb.href}
                        className="text-body-sm hover:text-primary-700 focus-visible:ring-ring rounded-sm text-neutral-600 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={last ? "page" : undefined}
                        className="text-body-sm font-semibold text-neutral-800"
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            {eyebrow ? (
              <span className="text-overline text-primary-700">{eyebrow}</span>
            ) : null}
            <h1 className="text-display-md text-neutral-900">
              {title}
              {titleAccent ? (
                <span className="text-primary-600"> {titleAccent}</span>
              ) : null}
            </h1>
            {description ? (
              <p className="text-body-lg max-w-2xl text-neutral-600">{description}</p>
            ) : null}
          </div>

          {action ? <div className="shrink-0 max-sm:w-full">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
