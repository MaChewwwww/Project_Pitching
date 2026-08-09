import * as React from "react";

import { EmergencyAlertBanner } from "./emergency-alert-banner";
import { Footer } from "./footer";
import { PublicNavbar } from "./public-navbar";
import { TopUtilityBar } from "./top-utility-bar";
import type {
  PublicAnnouncement,
  PublicEmergencyEvent,
  PublicHotline,
} from "@/lib/api/public-types";

/**
 * The frame around every public page (design.md Section 7.2).
 *
 * **The stacking order is the requirement, not a layout preference.**
 *
 * The utility bar scrolls away — it is convenience information. Everything that
 * matters during an emergency lives in a single sticky container: the alert
 * banner first, the navbar under it. One container rather than two sticky
 * elements, because two elements both claiming `top-0` fight, and the loser ends
 * up underneath — which for FR-PUB-017 would mean an evacuation order hidden
 * behind the navigation.
 *
 * Because this lives in `(public)/layout.tsx`, it renders *above* `error.tsx` in
 * the tree. A route-level error replaces the page body and leaves the navbar,
 * footer and hotlines standing — which is how NFR-AVL-004 is satisfied
 * structurally rather than by remembering to handle it.
 */

export interface PublicShellProps {
  children: React.ReactNode;
  activeAlert: PublicAnnouncement | null;
  emergencyEvent?: PublicEmergencyEvent | null;
  hotlines: PublicHotline[];
  primaryHotline: PublicHotline;
}

export function PublicShell({
  children,
  activeAlert,
  emergencyEvent,
  hotlines,
  primaryHotline,
}: PublicShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <TopUtilityBar primaryHotline={primaryHotline} />

      <div className="sticky top-0 z-50">
        <EmergencyAlertBanner
          alert={activeAlert}
          emergencyEvent={emergencyEvent}
          primaryHotline={primaryHotline}
          hotlines={hotlines}
        />
        <PublicNavbar primaryHotline={primaryHotline} />
      </div>

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer hotlines={hotlines} />
    </div>
  );
}
