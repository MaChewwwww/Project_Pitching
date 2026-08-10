import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Capitalizes each word in a string (Title Case).
 */
function toTitleCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

/**
 * The header band on an interior route (design.md Section 7.2).
 */

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Rendered in `primary-600`, after `title`. */
  titleAccent?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: { label: string; href?: Route }[];
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
    <div
      className={cn(
        "relative overflow-hidden border-b border-neutral-200/80 bg-gradient-to-b from-primary-50/70 via-surface-tint to-white",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-primary-200/30 blur-3xl"
      />
      <div className="relative mx-auto max-w-[1440px] px-4 py-7 md:px-6 md:py-10">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center">
            <ol className="-ml-1 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs shadow-2xs backdrop-blur-md">
              {breadcrumb.map((crumb, i) => {
                const last = i === breadcrumb.length - 1;
                const formattedLabel = toTitleCase(crumb.label);
                const isHome = i === 0 && (crumb.label.toLowerCase() === "home" || crumb.href === "/");

                return (
                  <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                    {i > 0 ? (
                      <ChevronRight aria-hidden className="size-3.5 shrink-0 text-slate-400" />
                    ) : null}
                    {crumb.href && !last ? (
                      <Link
                        href={crumb.href}
                        className="rounded-xs inline-flex items-center gap-1.5 font-medium text-slate-600 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isHome ? <Home aria-hidden className="size-3.5 text-primary-600" /> : null}
                        <span>{formattedLabel}</span>
                      </Link>
                    ) : (
                      <span
                        aria-current={last ? "page" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary-200/70 bg-primary-50 px-2 py-0.5 font-bold text-primary-900"
                      >
                        {isHome ? <Home aria-hidden className="size-3.5 text-primary-600" /> : null}
                        <span>{formattedLabel}</span>
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
              <span className="text-overline font-bold tracking-wider text-primary-700">
                {toTitleCase(eyebrow)}
              </span>
            ) : null}
            <h1 className="text-display-md font-bold tracking-tight text-neutral-900">
              {typeof title === "string" ? toTitleCase(title) : title}
              {titleAccent ? (
                <span className="font-extrabold text-primary-600">
                  {" "}
                  {typeof titleAccent === "string" ? toTitleCase(titleAccent) : titleAccent}
                </span>
              ) : null}
            </h1>
            {description ? (
              <p className="text-body-lg max-w-2xl leading-relaxed text-neutral-600">
                {description}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0 max-sm:w-full">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
