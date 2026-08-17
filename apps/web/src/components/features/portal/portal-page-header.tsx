"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalPageHeaderProps {
  title: React.ReactNode;
  titleAccent?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PortalPageHeader({
  title,
  titleAccent,
  description,
  icon: Icon,
  action,
  badge,
  meta,
  backHref,
  backLabel = "Back",
  className,
}: PortalPageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-white via-emerald-50/25 to-teal-50/20 p-5 sm:p-6 lg:p-7 shadow-xs transition-all",
        className,
      )}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-52 rounded-full bg-emerald-500/10 blur-3xl"
      />

      {backHref ? (
        <div className="relative z-10 mb-3">
          <Link
            href={backHref as Route}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/60"
          >
            <ArrowLeft className="size-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 min-w-0 items-start gap-3.5 sm:gap-4">
          {Icon ? (
            <span className="mt-0.5 flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-700/20 ring-4 ring-emerald-500/10">
              <Icon aria-hidden className="size-5" />
            </span>
          ) : null}
          <div className="flex-1 min-w-0">
            {badge ? <div className="mb-1.5">{badge}</div> : null}
            <h1 className="text-xl font-black tracking-tight text-neutral-900 sm:text-2xl lg:text-3xl font-sans">
              {title}
              {titleAccent ? (
                <span className="ml-1.5 text-emerald-700">{titleAccent}</span>
              ) : null}
            </h1>
            {description ? (
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-neutral-600 font-normal max-w-3xl">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? (
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:pt-2 max-sm:border-t max-sm:border-neutral-200/60">
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
