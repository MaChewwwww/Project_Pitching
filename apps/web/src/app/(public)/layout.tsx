import { PublicShell } from "@/components/common/public-shell";
import {
  getActiveAlert,
  getActiveEmergencyEvents,
  getHotlines,
  getPrimaryHotline,
} from "@/lib/api/public";

/**
 * The public route group's shell.
 *
 * ISR at ~60 seconds (architecture.md Section 10.1). Against fixtures it changes
 * nothing except re-running `fixtureNow()`, which keeps demo timestamps current;
 * the moment real fetches land it is already the right caching strategy for a
 * page that must be fast on a congested connection (NFR-PERF-001).
 *
 * The alert and hotlines are loaded here rather than per-page so the banner and
 * the floating action button exist on all four public routes without each page
 * remembering to fetch them.
 *
 * Because this layout sits above `error.tsx`, a page-level failure leaves the
 * navbar, footer and hotlines standing — see the note in `PublicShell`.
 */
export const revalidate = 60;

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [activeAlert, emergencyEvents, hotlines, primaryHotline] = await Promise.all([
    getActiveAlert(),
    getActiveEmergencyEvents(),
    getHotlines(),
    getPrimaryHotline(),
  ]);

  return (
    <PublicShell
      activeAlert={activeAlert}
      emergencyEvents={emergencyEvents}
      hotlines={hotlines}
      primaryHotline={primaryHotline}
    >
      {children}
    </PublicShell>
  );
}
