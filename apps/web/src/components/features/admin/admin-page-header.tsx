"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { Home } from "lucide-react";

import { findAdminNavLink } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/**
 * The console's page header (design.md Section 7.2).
 *
 * Deliberately not `common/page-header.tsx`. That one is the public site's
 * marketing band — a 44px display title inside a gradient hero, sized to be the
 * first thing a resident sees. In the console the header is a label above a
 * worklist, and every pixel it takes is a table row an officer cannot see, so
 * this is a single compact row: icon, title, one line of context, action.
 *
 * The icon defaults to the sidebar entry for the current route, so a page never
 * has to restate what the nav already knows.
 */

export interface AdminPageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Overrides the icon inferred from the current route. */
  icon?: typeof Home;
  action?: React.ReactNode;
  /** Status chips, counts, or filters rendered under the title block. */
  meta?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  icon,
  action,
  meta,
  className,
}: AdminPageHeaderProps) {
  const pathname = usePathname();
  const Icon = icon ?? findAdminNavLink(pathname)?.icon;

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-5 shadow-sm transition-all duration-[260ms] sm:p-6",
        className,
      )}
    >
      {/* Decorative ambient background blur */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          {Icon ? (
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md ring-4 shadow-emerald-700/20 ring-emerald-500/10 transition-transform duration-200 hover:scale-105">
              <Icon aria-hidden className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="font-sans text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed font-normal text-neutral-600 sm:text-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? (
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:border-t max-sm:border-neutral-200/50 max-sm:pt-2">
            {action}
          </div>
        ) : null}
      </div>

      {meta ? (
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-emerald-950/10 pt-3">
          {meta}
        </div>
      ) : null}
    </header>
  );
}
