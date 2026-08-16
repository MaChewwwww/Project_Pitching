"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: Route;
}

function resolvePortalBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [{ label: "Portal", href: "/portal" as Route }];

  if (pathname === "/portal") {
    return [{ label: "Portal", href: "/portal" as Route }, { label: "Dashboard" }];
  }

  if (pathname === "/portal/household") {
    return [...base, { label: "Household & Citizens" }];
  }
  if (pathname === "/portal/household/edit") {
    return [
      ...base,
      { label: "Household", href: "/portal/household" as Route },
      { label: "Edit Details" },
    ];
  }
  if (pathname === "/portal/household/members/new") {
    return [
      ...base,
      { label: "Household", href: "/portal/household" as Route },
      { label: "Add Citizen" },
    ];
  }
  if (pathname.startsWith("/portal/household/members/")) {
    return [
      ...base,
      { label: "Household", href: "/portal/household" as Route },
      { label: "Edit Citizen Profile" },
    ];
  }
  if (pathname === "/portal/safety") {
    return [...base, { label: "Safety Check-In" }];
  }
  if (pathname === "/portal/hazard-map") {
    return [...base, { label: "Flood Hazard Map" }];
  }
  if (pathname === "/portal/updates") {
    return [...base, { label: "Updates & Notices" }];
  }
  if (pathname === "/portal/preparedness") {
    return [...base, { label: "Preparedness Hub" }];
  }
  if (pathname === "/portal/preparedness/go-bag") {
    return [
      ...base,
      { label: "Preparedness", href: "/portal/preparedness" as Route },
      { label: "72-Hour Go-Bag" },
    ];
  }
  if (pathname === "/portal/preparedness/family-plan") {
    return [
      ...base,
      { label: "Preparedness", href: "/portal/preparedness" as Route },
      { label: "Family Emergency Plan" },
    ];
  }
  if (pathname === "/portal/weather") {
    return [...base, { label: "Weather & River Watch" }];
  }
  if (pathname === "/portal/history") {
    return [...base, { label: "Household History" }];
  }
  if (pathname === "/portal/report") {
    return [...base, { label: "Report Incident" }];
  }
  if (pathname === "/portal/rescue") {
    return [...base, { label: "Emergency Rescue Dispatch" }];
  }
  if (pathname === "/portal/onboarding") {
    return [...base, { label: "Household Registration" }];
  }

  return [...base, { label: "Resident Service" }];
}

export function PortalBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = resolvePortalBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0 flex items-center gap-2", className)}>
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-black text-emerald-900">
        <Sparkles className="size-3 text-emerald-600" />
        <span>Barangay San Jose</span>
      </span>

      <span className="hidden sm:inline text-neutral-300 font-light">/</span>

      <ol className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          const hideOnMobile = index < crumbs.length - 2;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className={cn(
                "flex min-w-0 items-center gap-1.5",
                hideOnMobile && "hidden md:flex",
              )}
            >
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
              ) : null}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="truncate font-semibold text-neutral-500 hover:text-emerald-700 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate font-bold",
                    last ? "text-neutral-900" : "text-neutral-500 font-semibold",
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
