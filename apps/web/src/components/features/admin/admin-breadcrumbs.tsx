"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { resolveAdminBreadcrumbs } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/**
 * The console topbar trail. Replaces the static "Barangay San Jose / Operations
 * console" lockup, which said the same thing on every screen and so told an
 * officer nothing about where they were.
 *
 * On narrow viewports only the last two crumbs are rendered — the trail is
 * never more than three deep, so that is always "parent → here".
 */
export function AdminBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = resolveAdminBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          const hideOnMobile = index < crumbs.length - 2;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className={cn("flex min-w-0 items-center gap-1.5", hideOnMobile && "hidden md:flex")}
            >
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
              ) : null}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="hover:text-primary-700 focus-visible:ring-ring truncate rounded font-medium text-neutral-500 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate",
                    last ? "font-bold text-neutral-900" : "font-medium text-neutral-500",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
