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
  const activeAlert = alert && alert.is_active ? alert : null;
  if (!activeAlert && !emergencyEvent) return null;

  // Level 2 and 3 mean "move now"; level 1 is a preparation notice. The palette
  // separates them so a Prepare notice does not read as an evacuation order.
  // An active event with no announcement is always urgent — a declared
  // emergency with no advisory yet is not a "prepare" state.
  const urgent = activeAlert
    ? (activeAlert.alert_level ?? 0) >= 2 || activeAlert.severity === "emergency"
    : true;
  const levelText = activeAlert
    ? activeAlert.alert_level != null
      ? `Level ${activeAlert.alert_level}`
      : "Emergency"
    : "Active";

  const title = activeAlert ? activeAlert.title : `${emergencyEvent!.type} emergency declared`;
  const instruction = activeAlert
    ? activeAlert.instruction
    : "An emergency has been declared for the barangay. Follow official instructions and monitor this site for updates.";

  // Areas plus the issuing officer (FR-ALT-007). One string, rendered in one of
  // two places depending on width. The event has neither, so it falls back to
  // its start time instead.
  const meta = activeAlert
    ? `${
        activeAlert.area_names.length > 0 ? activeAlert.area_names.join(", ") : "Barangay-wide"
      } · ${activeAlert.issued_by_name}`
    : `Barangay-wide · Declared ${new Date(emergencyEvent!.started_at).toLocaleString()}`;

  const availableHotlines = hotlines && hotlines.length > 0
    ? hotlines
    : primaryHotline
      ? [primaryHotline]
      : [];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "border-b transition-colors shadow-sm",
        urgent
          ? "border-danger-hover bg-gradient-to-r from-danger via-red-600 to-danger text-white"
          : "border-warning/30 bg-gradient-to-r from-warning-bg via-amber-500/10 to-warning-bg text-neutral-900",
      )}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        {/* Left / Center Content */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl backdrop-blur-md shadow-xs",
              urgent ? "bg-white/20 text-white" : "bg-warning/20 text-warning-hover",
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
              <span className="text-h4 font-bold tracking-tight min-w-0 truncate">{title}</span>
              {!/level/i.test(title) ? (
                <span
                  className={cn(
                    "text-overline shrink-0 rounded-md px-2 py-0.5 font-bold tracking-wider uppercase border",
                    urgent ? "bg-white/25 text-white border-white/20" : "bg-warning text-white border-warning-hover",
                  )}
                >
                  {levelText}
                </span>
              ) : null}
              <span
                className={cn(
                  "text-caption hidden font-medium lg:inline-block",
                  urgent ? "text-white/75" : "text-neutral-600",
                )}
              >
                • {meta}
              </span>
            </div>

            {instruction ? (
              <p
                className={cn(
                  "text-body-sm font-medium line-clamp-1 leading-snug",
                  urgent ? "text-white/90" : "text-neutral-700",
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
                    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 cursor-pointer sm:w-auto",
                    "text-label font-bold transition-all duration-200 focus-visible:ring-3 focus-visible:outline-none hover:scale-105 shadow-sm-card",
                    urgent
                      ? "bg-white text-danger hover:bg-white/95 focus-visible:ring-white/50"
                      : "bg-danger text-white hover:bg-danger-hover focus-visible:ring-danger/40",
                  )}
                >
                  <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                  <span>Emergency Hotlines</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200/90 p-6 shadow-2xl bg-white">
                <DialogHeader className="space-y-2 pb-2">
                  <DialogTitle className="flex items-center gap-3 text-h3 font-bold text-neutral-900">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-danger-bg to-red-100 border border-danger/20 text-danger shadow-xs">
                      <Phone className="size-5" strokeWidth={2.5} />
                    </span>
                    Emergency Hotlines
                  </DialogTitle>
                  <DialogDescription className="text-body-sm text-neutral-600 leading-relaxed">
                    Call directly or click to copy emergency contact numbers for Barangay San Jose.
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
