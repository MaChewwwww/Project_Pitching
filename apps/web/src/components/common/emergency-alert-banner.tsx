"use client";

import * as React from "react";
import { Phone, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HotlineList } from "./hotline-list";
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
  emergencyEvent?: PublicEmergencyEvent | null;
  primaryHotline?: PublicHotline;
  hotlines?: PublicHotline[];
}

export function EmergencyAlertBanner({
  alert,
  emergencyEvent,
  primaryHotline,
  hotlines,
}: EmergencyAlertBannerProps) {
  // An alert banner is only displayed within 24 hours after publishing.
  const nowTimestamp = React.useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0
  );

  const activeAlert = React.useMemo(() => {
    if (!alert || !alert.is_active) return null;
    if (!alert.published_at || nowTimestamp === 0) return alert;
    const pubDate = new Date(alert.published_at).getTime();
    if (isNaN(pubDate)) return alert;
    const diffMs = nowTimestamp - pubDate;
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000 ? alert : null;
  }, [alert, nowTimestamp]);

  if (!activeAlert && !emergencyEvent) return null;

  // Severity determines the urgency palette (info = Yellow, warning = Orange, emergency = Red).
  const severity = activeAlert?.severity || (emergencyEvent ? "emergency" : "info");
  const levelText = activeAlert?.severity ?? "Active";

  const title = activeAlert
    ? activeAlert.title
    : `${emergencyEvent!.type} emergency declared`;
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

  const availableHotlines =
    hotlines && hotlines.length > 0 ? hotlines : primaryHotline ? [primaryHotline] : [];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "border-b shadow-sm transition-colors relative z-20 opacity-100",
        severity === "info"
          ? "bg-amber-400 border-amber-500 text-amber-950"
          : severity === "warning"
          ? "bg-orange-500 border-orange-600 text-white"
          : "bg-red-600 border-red-700 text-white"
      )}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        {/* Left / Center Content */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl shadow-xs",
              severity === "info" ? "bg-amber-950/15 text-amber-950" : "bg-white/20 text-white"
            )}
          >
            <TriangleAlert
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
                      ? "border-amber-900/30 bg-amber-950 text-white"
                      : "border-white/25 bg-white/25 text-white"
                  )}
                >
                  {levelText}
                </span>
              ) : null}
              <span
                className={cn(
                  "text-caption hidden font-medium lg:inline-block",
                  severity === "info" ? "text-amber-900/80" : "text-white/80"
                )}
              >
                • {meta}
              </span>
            </div>

            {instruction ? (
              <p
                className={cn(
                  "text-body-sm line-clamp-1 leading-snug font-medium",
                  severity === "info" ? "text-amber-950 font-semibold" : "text-white/95"
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
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 sm:w-auto",
                    "text-label shadow-sm-card font-bold transition-all duration-200 hover:scale-105 focus-visible:ring-3 focus-visible:outline-none",
                    severity === "info"
                      ? "bg-amber-950 text-white hover:bg-black focus-visible:ring-amber-950/50"
                      : "bg-neutral-900 text-white hover:bg-black focus-visible:ring-white/50"
                  )}
                >
                  <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                  <span>Emergency Hotlines</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xl sm:max-w-lg">
                <DialogHeader className="space-y-2 pb-2">
                  <DialogTitle className="text-h3 flex items-center gap-3 font-bold text-neutral-900">
                    <span className="from-danger-bg border-danger/20 text-danger grid size-10 shrink-0 place-items-center rounded-2xl border bg-gradient-to-br to-red-100 shadow-xs">
                      <Phone className="size-5" strokeWidth={2.5} />
                    </span>
                    Emergency Hotlines
                  </DialogTitle>
                  <DialogDescription className="text-body-sm leading-relaxed text-neutral-600">
                    Call directly or click to copy emergency contact numbers for Barangay
                    San Jose.
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-2">
                  <HotlineList hotlines={availableHotlines} layout="stack" />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>
    </div>
  );
}
