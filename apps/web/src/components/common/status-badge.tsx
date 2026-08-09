import * as React from "react";
import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge, type BadgeTone } from "./badge";

/**
 * A domain status, rendered as a badge (design.md Section 7.2).
 *
 * The point of routing every status through one component is design.md Section
 * 10's rule: **never colour alone.** Each case below emits an icon *and* a word,
 * and river alert levels always show their number, because "orange" means nothing
 * to a resident who is colour-blind, in sunlight, or simply has not memorised the
 * scheme.
 *
 * The prop is a discriminated union rather than a free `tone`, so a caller cannot
 * pair "needs rescue" with a green palette. It stays open for the vulnerability
 * and safety variants that arrive with the registry and safety modules.
 */

export type SafetyStatusValue = "safe" | "needs_rescue" | "unaccounted";
export type SafetySetMethod = "self" | "assisted" | "household_bulk" | null;
export type RescueRequestStatusValue =
  | "pending"
  | "verified"
  | "dispatched"
  | "resolved"
  | "dismissed";

export type StatusBadgeProps =
  | { kind: "alert"; level: 0 | 1 | 2 | 3 }
  | { kind: "severity"; value: "info" | "warning" | "emergency" }
  | { kind: "evac"; isOpen: boolean; isAtCapacity: boolean }
  | { kind: "drive"; status: "open" | "closed" }
  | { kind: "stale" }
  | { kind: "safety"; status: SafetyStatusValue; setMethod: SafetySetMethod }
  | { kind: "rescue"; status: RescueRequestStatusValue };

interface Resolved {
  tone: BadgeTone;
  label: string;
  icon: typeof Info;
  outline?: boolean;
  pulse?: boolean;
}

/** BR-3.2 — the level number is part of the label, never implied by colour. */
const ALERT: Record<0 | 1 | 2 | 3, Resolved> = {
  0: { tone: "success", label: "Normal", icon: CircleCheck },
  1: { tone: "warning", label: "Alert Level 1 · Prepare", icon: CircleAlert },
  2: { tone: "warning", label: "Alert Level 2 · Evacuate", icon: TriangleAlert },
  3: { tone: "danger", label: "Alert Level 3 · Forced Evacuation", icon: TriangleAlert },
};

function resolve(props: StatusBadgeProps): Resolved {
  switch (props.kind) {
    case "alert":
      return ALERT[props.level];

    case "severity":
      if (props.value === "emergency")
        return { tone: "danger", label: "Emergency", icon: TriangleAlert };
      if (props.value === "warning")
        return { tone: "warning", label: "Advisory", icon: CircleAlert };
      return { tone: "info", label: "Information", icon: Info };

    case "evac":
      if (!props.isOpen) return { tone: "neutral", label: "Closed", icon: CircleX };
      if (props.isAtCapacity)
        return { tone: "danger", label: "At capacity", icon: TriangleAlert };
      return { tone: "success", label: "Open", icon: BadgeCheck };

    case "drive":
      return props.status === "open"
        ? { tone: "success", label: "Accepting donations", icon: CircleCheck }
        : { tone: "neutral", label: "Closed", icon: CircleX };

    case "stale":
      return { tone: "warning", label: "Stale reading", icon: CircleAlert };

    case "safety":
      // FR-SAF-005: individually confirmed and bulk-covered are visually
      // distinct, not just distinguishable by hovering for a tooltip — an
      // outlined badge reads as "less certain" at a glance, which is exactly
      // the point (BR-5.1c).
      if (props.status === "needs_rescue")
        return {
          tone: "danger",
          label: "Needs rescue",
          icon: TriangleAlert,
          pulse: true,
        };
      if (props.status === "unaccounted")
        return { tone: "neutral", label: "Unaccounted", icon: CircleX };
      if (props.setMethod === "household_bulk")
        return {
          tone: "success",
          label: "Safe (household)",
          icon: Users,
          outline: true,
        };
      return { tone: "success", label: "Safe", icon: CircleCheck };

    case "rescue":
      switch (props.status) {
        case "pending":
          return { tone: "danger", label: "Pending", icon: TriangleAlert, pulse: true };
        case "verified":
          return { tone: "warning", label: "Verified", icon: CircleAlert };
        case "dispatched":
          return { tone: "warning", label: "Dispatched", icon: BadgeCheck };
        case "resolved":
          return { tone: "success", label: "Resolved", icon: CircleCheck };
        case "dismissed":
          return { tone: "neutral", label: "Dismissed", icon: CircleX };
      }
  }
}

export function StatusBadge(props: StatusBadgeProps & { className?: string }) {
  const { tone, label, icon, outline, pulse } = resolve(props);
  return (
    <Badge
      tone={tone}
      icon={icon}
      outline={outline}
      className={cn(pulse && "animate-pulse", props.className)}
    >
      {label}
    </Badge>
  );
}

/**
 * Alert level 2 and 3 are the two that mean "move". The banner uses this to
 * decide between the warning and danger palettes.
 */
export function isEvacuationLevel(level: 0 | 1 | 2 | 3): boolean {
  return level >= 2;
}
