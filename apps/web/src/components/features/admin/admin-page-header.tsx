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
        "border-primary-100 shadow-sm-card rounded-[14px] border bg-white px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="bg-primary-50 border-primary-100 mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] border">
              <Icon aria-hidden className="text-primary-700 size-4.5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-h2 tracking-tight text-neutral-900">{title}</h1>
            {description ? (
              <p className="text-body-sm mt-1 max-w-3xl leading-relaxed text-neutral-600">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{action}</div>
        ) : null}
      </div>

      {meta ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          {meta}
        </div>
      ) : null}
    </header>
  );
}
