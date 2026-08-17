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
  /** Rendered in gradient text with accent underline, after `title`. */
  titleAccent?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: { label: string; href?: Route }[];
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
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
        "from-primary-50/70 via-surface-tint relative overflow-hidden border-b border-neutral-200/80 bg-gradient-to-b to-white",
        className,
      )}
    >
      <div
        aria-hidden
        className="bg-primary-200/30 pointer-events-none absolute -top-20 -right-20 size-80 rounded-full blur-3xl"
      />
      <div className="relative mx-auto max-w-[1440px] px-4 pt-5 pb-5 md:px-6 md:pt-6 md:pb-6">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4.5 flex items-center">
            <ol className="-ml-1.5 inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-sm shadow-xs backdrop-blur-md">
              {breadcrumb.map((crumb, i) => {
                const last = i === breadcrumb.length - 1;
                const formattedLabel = toTitleCase(crumb.label);
                const isHome =
                  i === 0 && (crumb.label.toLowerCase() === "home" || crumb.href === "/");

                return (
                  <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                    {i > 0 ? (
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-slate-400"
                      />
                    ) : null}
                    {crumb.href && !last ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-primary-700 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-xs font-medium text-slate-600 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {isHome ? (
                          <Home aria-hidden className="text-primary-600 size-4" />
                        ) : null}
                        <span>{formattedLabel}</span>
                      </Link>
                    ) : (
                      <span
                        aria-current={last ? "page" : undefined}
                        className="border-primary-200/80 bg-primary-50 text-primary-900 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-bold"
                      >
                        {isHome ? (
                          <Home aria-hidden className="text-primary-600 size-4" />
                        ) : null}
                        <span>{formattedLabel}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-display-md sm:text-display-lg min-w-0 font-black tracking-tight break-words text-neutral-900">
              {typeof title === "string" ? toTitleCase(title) : title}
              {titleAccent ? (
                <>
                  {" "}
                  <span className="from-primary-600 via-primary-700 relative inline-block bg-gradient-to-r to-emerald-600 bg-clip-text font-black break-words text-transparent">
                    {typeof titleAccent === "string"
                      ? toTitleCase(titleAccent)
                      : titleAccent}
                    <span
                      aria-hidden
                      className="from-primary-500/60 via-primary-600/70 absolute -bottom-1.5 left-0 h-[3.5px] w-full rounded-full bg-gradient-to-r to-emerald-500/60"
                    />
                  </span>
                </>
              ) : null}
            </h1>
            {description ? (
              <p className="text-body-lg w-full max-w-none pt-1 leading-relaxed break-words text-neutral-600">
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
