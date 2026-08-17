import * as React from "react";

import { EmergencyAlertBanner } from "./emergency-alert-banner";
import { Footer } from "./footer";
import { PublicNavbar } from "./public-navbar";
import { PageSplashLoader } from "./page-splash-loader";
import { TopUtilityBar } from "./top-utility-bar";
import type {
  PublicAnnouncement,
  PublicEmergencyEvent,
  PublicHotline,
} from "@/lib/api/public-types";

export interface PublicShellProps {
  children: React.ReactNode;
  activeAlert: PublicAnnouncement | null;
  emergencyEvents?: PublicEmergencyEvent[];
  hotlines: PublicHotline[];
  primaryHotline: PublicHotline;
}

export function PublicShell({
  children,
  activeAlert,
  emergencyEvents,
  hotlines,
  primaryHotline,
}: PublicShellProps) {
  return (
    <div className="flex min-h-full w-full max-w-full flex-col">
      <PageSplashLoader />
      <TopUtilityBar primaryHotline={primaryHotline} />

      <div className="sticky top-0 z-50 w-full max-w-full">
        <EmergencyAlertBanner
          alert={activeAlert}
          emergencyEvents={emergencyEvents}
          primaryHotline={primaryHotline}
          hotlines={hotlines}
        />
        <PublicNavbar primaryHotline={primaryHotline} />
      </div>

      <main id="main" className="w-full max-w-full flex-1 overflow-x-clip">
        {children}
      </main>

      <Footer hotlines={hotlines} />
    </div>
  );
}
