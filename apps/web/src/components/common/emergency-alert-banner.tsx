"use client";

import * as React from "react";
import { Info, Phone, Siren, TriangleAlert } from "lucide-react";

import { EmergencyHotlinesDialog } from "./emergency-hotlines-dialog";
import { cn } from "@/lib/utils";
import type {
  PublicAnnouncement,
  PublicEmergencyEvent,
  PublicHotline,
} from "@/lib/api/public-types";

export interface EmergencyAlertBannerProps {
  alert: PublicAnnouncement | null;
  /**
   * A declared `emergency_event` (FR-SAF-018) with no matching announcement —
   * e.g. an admin declared the event but hasn't published an alert yet, or the
   * alert has since expired while the event is still active. Falls back to a
   * generic evacuation banner rather than showing nothing (NFR-AVL-004).
   */
  emergencyEvents?: PublicEmergencyEvent[];
  /** Primary hotline fallback if `hotlines` array is unsupplied. */
  primaryHotline?: PublicHotline;
  /** Array of active hotlines from public query. */
  hotlines?: PublicHotline[];
}

export function EmergencyAlertBanner({
  alert,
  emergencyEvents = [],
  primaryHotline,
  hotlines,
}: EmergencyAlertBannerProps) {
  // Pure client-side timestamp store to prevent hydration mismatches
  const nowTimestamp = React.useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );

  const activeAlert = React.useMemo(() => {
    if (!alert) return null;
    if (!alert.published_at || nowTimestamp === 0) return alert;
    const pubDate = new Date(alert.published_at).getTime();
    if (isNaN(pubDate)) return alert;
    const diffMs = nowTimestamp - pubDate;
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000 ? alert : null;
  }, [alert, nowTimestamp]);

  const emergencyEvent = emergencyEvents[0] ?? null;
  if (!activeAlert && !emergencyEvent) return null;

  const severity = activeAlert?.severity || (emergencyEvent ? "emergency" : "info");
  const levelText = activeAlert?.severity ?? "Active";

  const BannerIcon =
    severity === "info" ? Info : severity === "warning" ? TriangleAlert : Siren;

  const title = activeAlert
    ? activeAlert.title
    : `${emergencyEvent!.type} emergency declared${
        emergencyEvents.length > 1 ? ` +${emergencyEvents.length - 1} more active` : ""
      }`;
  const instruction = activeAlert
    ? activeAlert.instruction
    : "An emergency has been declared for the barangay. Follow official instructions and monitor this site for updates.";

  // Areas plus the issuing officer (FR-ALT-007). One string, rendered in one of
  // two places depending on width. The event has neither, so it falls back to
  // its start time instead.
  const meta = activeAlert
    ? `${
        activeAlert.area_names.length > 0
          ? activeAlert.area_names.join(", ")
          : "Barangay-wide"
      } · ${activeAlert.issued_by_name}`
    : `Barangay-wide · Declared ${new Date(emergencyEvent!.started_at).toLocaleString()}`;

  const availableHotlines: PublicHotline[] =
    hotlines && hotlines.length > 0 ? hotlines : primaryHotline ? [primaryHotline] : [];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "relative z-20 border-b opacity-100 shadow-md transition-all",
        severity === "info"
          ? "border-amber-500 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-950"
          : severity === "warning"
            ? "border-orange-700 bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 text-white"
            : "border-red-800 bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white",
      )}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        {/* Left / Center Content */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl shadow-xs",
              severity === "info"
                ? "bg-amber-950/15 text-amber-950"
                : "bg-white/20 text-white",
            )}
          >
            <BannerIcon
              aria-hidden
              className="size-5 motion-safe:animate-pulse"
              strokeWidth={2.5}
            />
          </span>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-h4 min-w-0 truncate font-bold tracking-tight">
                {title}
              </span>
              {!/level/i.test(title) ? (
                <span
                  className={cn(
                    "text-overline shrink-0 rounded-md border px-2 py-0.5 font-bold tracking-wider uppercase",
                    severity === "info"
                      ? "border-amber-950/30 bg-amber-950 text-white"
                      : "border-white/30 bg-white/20 text-white",
                  )}
                >
                  {levelText}
                </span>
              ) : null}
              <span
                className={cn(
                  "text-caption hidden font-medium lg:inline-block",
                  severity === "info" ? "text-amber-950/80" : "text-white/80",
                )}
              >
                • {meta}
              </span>
            </div>

            {instruction ? (
              <p
                className={cn(
                  "text-body-sm line-clamp-1 leading-snug font-medium",
                  severity === "info" ? "font-semibold text-amber-950" : "text-white/95",
                )}
              >
                {instruction}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right CTA Button */}
        {primaryHotline ? (
          <div className="shrink-0 max-sm:w-full">
            <EmergencyHotlinesDialog
              hotlines={availableHotlines}
              trigger={
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 sm:w-auto",
                    "text-label shadow-sm-card font-bold transition-all duration-200 hover:scale-105 focus-visible:ring-3 focus-visible:outline-none",
                    severity === "info"
                      ? "bg-amber-950 text-white hover:bg-black focus-visible:ring-amber-950/50"
                      : severity === "warning"
                        ? "bg-white text-orange-700 hover:bg-neutral-100 focus-visible:ring-white/50"
                        : "bg-white text-red-700 hover:bg-neutral-100 focus-visible:ring-white/50",
                  )}
                >
                  <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                  <span>Emergency Hotlines</span>
                </button>
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
