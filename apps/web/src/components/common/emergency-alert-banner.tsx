"use client";

import * as React from "react";
import { Phone, TriangleAlert } from "lucide-react";

import { toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicAnnouncement, PublicHotline } from "@/lib/api/public-types";

/**
 * The active-alert takeover (FR-PUB-017, BR-0.18, NFR-UX-005).
 *
 * Three requirements shape every decision here:
 *
 * - **It sits above everything, including the navbar.** `PublicShell` puts it
 *   first inside the sticky container, so it is the top of the viewport whatever
 *   the scroll position.
 * - **It is not dismissible while active.** There is no close button — deliberately.
 *   Somebody skimming past an evacuation order is precisely the outcome this
 *   exists to prevent. It disappears when the barangay deactivates the alert
 *   (FR-ALT-011), and only then.
 * - **It announces itself.** `role="alert"` with `aria-live="assertive"` so a
 *   resident using a screen reader hears the order without hunting for it. This is
 *   the one place on the site where interrupting is correct.
 *
 * Client-rendered because architecture.md Section 10.1 requires this to be
 * short-polled rather than picked up at the next ISR revalidation — an evacuation
 * order 60 seconds late is 60 seconds late. The boundary exists now so adding the
 * poll is one hook.
 */

export interface EmergencyAlertBannerProps {
  alert: PublicAnnouncement | null;
  primaryHotline?: PublicHotline;
}

export function EmergencyAlertBanner({
  alert,
  primaryHotline,
}: EmergencyAlertBannerProps) {
  if (!alert || !alert.is_active) return null;

  // Level 2 and 3 mean "move now"; level 1 is a preparation notice. The palette
  // separates them so a Prepare notice does not read as an evacuation order.
  const urgent = (alert.alert_level ?? 0) >= 2 || alert.severity === "emergency";
  const levelText =
    alert.alert_level != null ? `Alert Level ${alert.alert_level}` : "Emergency notice";

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "border-b",
        urgent
          ? "border-danger/30 bg-danger text-white"
          : "border-warning/30 bg-warning-bg text-neutral-900",
      )}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <TriangleAlert
            aria-hidden
            className={cn(
              "mt-0.5 size-5 shrink-0 motion-safe:animate-pulse",
              urgent ? "text-white" : "text-warning",
            )}
            strokeWidth={2.5}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-overline rounded-sm px-1.5 py-0.5",
                  urgent ? "bg-white/20 text-white" : "bg-warning text-white",
                )}
              >
                {levelText}
              </span>
              <span className="text-h4">{alert.title}</span>
            </div>

            {alert.instruction ? (
              <p
                className={cn(
                  "text-body-sm",
                  urgent ? "text-white/90" : "text-neutral-700",
                )}
              >
                {alert.instruction}
              </p>
            ) : null}

            <p
              className={cn(
                "text-caption",
                urgent ? "text-white/70" : "text-neutral-600",
              )}
            >
              {alert.area_names.length > 0
                ? `Affected areas: ${alert.area_names.join(", ")}`
                : "Barangay-wide"}
              {" · Issued by "}
              {alert.issued_by_name}
            </p>
          </div>
        </div>

        {primaryHotline ? (
          <a
            href={toTelHref(primaryHotline.number)}
            aria-label={`Call ${primaryHotline.label} at ${primaryHotline.number}`}
            className={cn(
              // 48px floor — this is an emergency action (design.md Section 9.7).
              "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5",
              "text-label transition-colors focus-visible:ring-3 focus-visible:outline-none",
              urgent
                ? "text-danger bg-white hover:bg-white/90 focus-visible:ring-white/50"
                : "bg-danger hover:bg-danger-hover focus-visible:ring-danger/40 text-white",
            )}
          >
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
            Call {primaryHotline.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}
