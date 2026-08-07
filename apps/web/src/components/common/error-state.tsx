"use client";

import * as React from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * One part of the page failed (FR-PUB-016).
 *
 * Deliberately scoped and calm. A dead weather feed is a dead weather feed — it
 * is not a reason to alarm somebody who came here to find an evacuation centre,
 * and it must never be allowed to imply the emergency information is unreliable.
 * Naming the section is what keeps the failure legible: "Weather could not be
 * loaded" tells the reader exactly how much to distrust.
 *
 * Client-rendered because `onRetry` is a callback.
 */

export interface ErrorStateProps {
  /** e.g. "Weather" — used to scope the message honestly. */
  sectionName?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  sectionName,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  const heading =
    title ??
    (sectionName ? `${sectionName} could not be loaded` : "Something went wrong");

  return (
    <div
      role="status"
      className={cn(
        "border-warning-border bg-warning-bg/50 flex flex-col items-start gap-3 rounded-[14px] border p-4 md:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert aria-hidden className="text-warning mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-h4 text-neutral-900">{heading}</p>
          <p className="text-body-sm text-neutral-600">
            {description ??
              "The rest of this page is unaffected. Emergency hotlines are always available at the bottom right of your screen."}
          </p>
        </div>
      </div>

      {onRetry ? (
        <Button variant="outline" size="sm" pill onClick={onRetry}>
          <RotateCw aria-hidden className="size-4" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
