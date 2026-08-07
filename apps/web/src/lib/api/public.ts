/**
 * The public API seam.
 *
 * Every public page and section reads its data through the functions below and
 * **never imports a fixture directly**. Today each one returns a fixture; once the
 * backend exists each body becomes a single `api.get(...)` call against the
 * endpoint named in its comment, and nothing upstream changes — the return types
 * are already the real response shapes, envelopes included.
 *
 * `grep -rn "TODO(FR-PUB-013)" src` lists the entire integration surface.
 *
 * The functions are `async` even though nothing awaits: it makes the call sites
 * correct in advance, so wiring the real client is a change to this file only.
 */

import { ACTIVE_ALERT, ANNOUNCEMENTS } from "@/lib/fixtures/announcements";
import { ACTIVITIES } from "@/lib/fixtures/activities";
import { BARANGAY_STATS } from "@/lib/fixtures/area-stats";
import { DONATION_DRIVES } from "@/lib/fixtures/donation-drives";
import { EVAC_CENTERS } from "@/lib/fixtures/evac-centers";
import { FACILITIES } from "@/lib/fixtures/facilities";
import { FAQS } from "@/lib/fixtures/faqs";
import { FLOOD_EVENTS } from "@/lib/fixtures/flood-events";
import { GUIDES, guideBySlug } from "@/lib/fixtures/guides";
import { HOTLINES, PRIMARY_HOTLINE } from "@/lib/fixtures/hotlines";
import { paginate } from "@/lib/fixtures/envelope";
import { RIVER_LEVEL, WEATHER_CURRENT } from "@/lib/fixtures/weather";
import type {
  Page,
  PublicActivity,
  PublicAnnouncement,
  PublicBarangayStats,
  PublicDonationDrive,
  PublicEvacCenter,
  PublicFacility,
  PublicFaq,
  PublicFloodEvent,
  PublicGuide,
  PublicGuideSummary,
  PublicHotline,
  PublicRiverLevel,
  PublicWeatherCurrent,
} from "./public-types";

/* --- announcements -------------------------------------------------------- */

/** TODO(FR-PUB-013): `GET /public/announcements` */
export async function getAnnouncements(options?: {
  page?: number;
  size?: number;
  kind?: PublicAnnouncement["kind"];
}): Promise<Page<PublicAnnouncement>> {
  const { page = 1, size = 20, kind } = options ?? {};
  const rows = ANNOUNCEMENTS.filter((a) => (kind ? a.kind === kind : true)).sort(
    (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
  );
  return paginate(rows, page, size);
}

/**
 * The alert that takes over the top of the page, or null when nothing is active.
 *
 * TODO(FR-PUB-013): `GET /public/announcements?kind=alert&active=true`
 *
 * This is the one call that must be re-checked continuously rather than at the
 * ISR revalidation window (architecture.md Section 10.1) — an evacuation order
 * that arrives 60 seconds late is 60 seconds too late. `EmergencyAlertBanner` is
 * already a client component so the poll is a one-line addition here.
 */
export async function getActiveAlert(): Promise<PublicAnnouncement | null> {
  return ACTIVE_ALERT;
}

/* --- weather and river ---------------------------------------------------- */

/** TODO(FR-PUB-013): `GET /public/weather/current` */
export async function getWeatherCurrent(): Promise<PublicWeatherCurrent> {
  return WEATHER_CURRENT;
}

/** TODO(FR-PUB-013): `GET /public/river-level` */
export async function getRiverLevel(): Promise<PublicRiverLevel> {
  return RIVER_LEVEL;
}

/* --- reference data ------------------------------------------------------- */

/**
 * TODO(FR-PUB-013): `GET /public/hotlines`
 *
 * NFR-AVL-004: this is the one thing that must render even when everything else
 * on the page has failed.
 */
export async function getHotlines(): Promise<PublicHotline[]> {
  return [...HOTLINES].sort((a, b) => a.sort_order - b.sort_order);
}

/** The single number used by the utility bar, the FAB, and the alert banner. */
export async function getPrimaryHotline(): Promise<PublicHotline> {
  return PRIMARY_HOTLINE;
}

/** TODO(FR-PUB-013): `GET /public/facilities` */
export async function getFacilities(options?: {
  type?: PublicFacility["type"];
}): Promise<PublicFacility[]> {
  const { type } = options ?? {};
  return FACILITIES.filter((f) => (type ? f.type === type : true));
}

/** TODO(FR-PUB-013): `GET /public/evacuation-centers` */
export async function getEvacuationCenters(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicEvacCenter>> {
  const { page = 1, size = 20 } = options ?? {};
  return paginate(EVAC_CENTERS, page, size);
}

/* --- content -------------------------------------------------------------- */

/** TODO(FR-PUB-013): `GET /public/activities` */
export async function getActivities(options?: {
  page?: number;
  size?: number;
  upcoming?: boolean;
}): Promise<Page<PublicActivity>> {
  const { page = 1, size = 20, upcoming = true } = options ?? {};
  const rows = ACTIVITIES.filter((a) => (upcoming ? a.is_upcoming : true)).sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
  return paginate(rows, page, size);
}

/** TODO(FR-PUB-013): `GET /public/donation-drives` */
export async function getDonationDrives(options?: {
  page?: number;
  size?: number;
  status?: PublicDonationDrive["status"];
}): Promise<Page<PublicDonationDrive>> {
  const { page = 1, size = 20, status = "open" } = options ?? {};
  const rows = DONATION_DRIVES.filter((d) => (status ? d.status === status : true));
  return paginate(rows, page, size);
}

/** TODO(FR-PUB-013): `GET /public/guides` */
export async function getGuides(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicGuideSummary>> {
  const { page = 1, size = 20 } = options ?? {};
  const rows = [...GUIDES].sort((a, b) => a.sort_order - b.sort_order);
  return paginate(rows, page, size);
}

/** TODO(FR-PUB-013): `GET /public/guides/{slug}` */
export async function getGuide(slug: string): Promise<PublicGuide | null> {
  return guideBySlug(slug) ?? null;
}

/**
 * TODO(FR-PUB-013): `GET /public/faqs`
 *
 * **This endpoint is missing from architecture.md Section 6.3** even though
 * FR-PUB-011 and FR-PRP-005 both require FAQs on a public surface. Adding the row
 * to the contract is part of this change.
 */
export async function getFaqs(): Promise<PublicFaq[]> {
  return [...FAQS].sort((a, b) => a.sort_order - b.sort_order);
}

/* --- aggregates ----------------------------------------------------------- */

/** TODO(FR-PUB-013): `GET /public/area-stats` */
export async function getAreaStats(): Promise<PublicBarangayStats> {
  return BARANGAY_STATS;
}

/**
 * TODO(FR-PUB-013): `GET /public/flood-events`
 *
 * **Also missing from architecture.md Section 6.3**, though FR-WX-013 requires
 * flood history to be publicly viewable.
 */
export async function getFloodEvents(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicFloodEvent>> {
  const { page = 1, size = 20 } = options ?? {};
  const rows = [...FLOOD_EVENTS].sort(
    (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at),
  );
  return paginate(rows, page, size);
}
