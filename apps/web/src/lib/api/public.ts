/**
 * The public API seam.
 *
 * Every public page and section reads its data through the functions below and
 * **never imports a fixture directly**. FR-PUB-013 is closed: each getter is a
 * single `serverGet(...)` call against the endpoint named in its comment, Zod-
 * parsed against `public-schemas.ts`. Nothing upstream of this file changed —
 * the return types were already the real response shapes, envelopes included.
 *
 * **Section-level failure isolation (FR-PUB-016, NFR-AVL-002/004).** Every
 * getter catches its own `ApiFetchError` and returns a safe, empty-shaped
 * fallback rather than throwing into the page. A failed weather fetch degrades
 * the weather section only; it does not take down the page around it. The one
 * exception is genuinely load-bearing: `getHotlines()` and `getPrimaryHotline()`
 * fall back to the static `HOTLINES` fixture on failure — hotlines must render
 * even when the API is unreachable (NFR-AVL-004) — and `error.tsx` /
 * `not-found.tsx` import that same constant directly, bypassing the fetch
 * entirely, because a fallback that depends on the fetch which may have just
 * failed is not a fallback.
 */

import { HOTLINES, PRIMARY_HOTLINE } from "@/lib/fixtures/hotlines";
import { ApiFetchError, serverGet } from "./server";
import type {
  Page,
  PublicActivity,
  PublicAnnouncement,
  PublicArea,
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
import {
  publicActivityPageSchema,
  publicAnnouncementPageSchema,
  publicAnnouncementSchema,
  publicAreaSchema,
  publicBarangayStatsSchema,
  publicDonationDrivePageSchema,
  publicEvacCenterPageSchema,
  publicFacilitySchema,
  publicFaqSchema,
  publicFloodEventPageSchema,
  publicGuideSchema,
  publicGuideSummaryPageSchema,
  publicHotlineSchema,
  publicRiverLevelSchema,
  publicWeatherCurrentSchema,
} from "./public-schemas";
import { z } from "zod";

function emptyPage<T>(page: number, size: number): Page<T> {
  return { items: [], total: 0, page, size, pages: 1 };
}

function logDegraded(endpoint: string, error: unknown): void {
  const detail = error instanceof ApiFetchError ? `${error.message}` : String(error);
  console.error(`[public seam] ${endpoint} degraded — serving fallback. ${detail}`);
}

/* --- announcements -------------------------------------------------------- */

/** `GET /public/announcements` */
export async function getAnnouncements(options?: {
  page?: number;
  size?: number;
  kind?: PublicAnnouncement["kind"];
}): Promise<Page<PublicAnnouncement>> {
  const { page = 1, size = 20, kind } = options ?? {};
  try {
    return await serverGet("/public/announcements", publicAnnouncementPageSchema, {
      searchParams: { page, size, kind },
    });
  } catch (error) {
    logDegraded("/public/announcements", error);
    return emptyPage(page, size);
  }
}

/**
 * The alert that takes over the top of the page, or null when nothing is active.
 *
 * `GET /public/announcements/active`
 *
 * Polled short-cycle by `EmergencyAlertBanner` rather than left to the ISR
 * revalidation window (architecture.md Section 10.1) — an evacuation order that
 * arrives 60 seconds late is 60 seconds too late.
 */
export async function getActiveAlert(): Promise<PublicAnnouncement | null> {
  try {
    return await serverGet(
      "/public/announcements/active",
      publicAnnouncementSchema.nullable(),
      {
        revalidate: 0,
      },
    );
  } catch (error) {
    logDegraded("/public/announcements/active", error);
    return null;
  }
}

/* --- weather and river ---------------------------------------------------- */

/** `GET /public/weather/current` */
export async function getWeatherCurrent(): Promise<PublicWeatherCurrent> {
  try {
    return await serverGet("/public/weather/current", publicWeatherCurrentSchema);
  } catch (error) {
    logDegraded("/public/weather/current", error);
    return {
      readings: [],
      observed_at: null,
      source: null,
      is_stale: false,
      forecast: [],
    };
  }
}

/** `GET /public/river-level` */
export async function getRiverLevel(): Promise<PublicRiverLevel> {
  try {
    return await serverGet("/public/river-level", publicRiverLevelSchema);
  } catch (error) {
    logDegraded("/public/river-level", error);
    return {
      reading: null,
      alert_level: 0,
      thresholds: null,
      is_stale: false,
      last_known_good: null,
    };
  }
}

/* --- reference data ------------------------------------------------------- */

/**
 * `GET /public/hotlines`
 *
 * NFR-AVL-004: this is the one thing that must render even when everything else
 * on the page has failed — falls back to the static fixture, never to an empty
 * list.
 */
export async function getHotlines(): Promise<PublicHotline[]> {
  try {
    return await serverGet("/public/hotlines", z.array(publicHotlineSchema));
  } catch (error) {
    logDegraded("/public/hotlines", error);
    return [...HOTLINES].sort((a, b) => a.sort_order - b.sort_order);
  }
}

/** The single number used by the utility bar, the FAB, and the alert banner. */
export async function getPrimaryHotline(): Promise<PublicHotline> {
  const hotlines = await getHotlines();
  return hotlines[0] ?? PRIMARY_HOTLINE;
}

/** `GET /public/facilities` */
export async function getFacilities(options?: {
  type?: PublicFacility["type"];
}): Promise<PublicFacility[]> {
  const { type } = options ?? {};
  try {
    return await serverGet("/public/facilities", z.array(publicFacilitySchema), {
      searchParams: { type },
    });
  } catch (error) {
    logDegraded("/public/facilities", error);
    return [];
  }
}

/** `GET /public/evacuation-centers` */
export async function getEvacuationCenters(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicEvacCenter>> {
  const { page = 1, size = 20 } = options ?? {};
  try {
    return await serverGet("/public/evacuation-centers", publicEvacCenterPageSchema, {
      searchParams: { page, size },
    });
  } catch (error) {
    logDegraded("/public/evacuation-centers", error);
    return emptyPage(page, size);
  }
}

/* --- content -------------------------------------------------------------- */

/** `GET /public/activities` */
export async function getActivities(options?: {
  page?: number;
  size?: number;
  upcoming?: boolean;
}): Promise<Page<PublicActivity>> {
  const { page = 1, size = 20, upcoming = true } = options ?? {};
  try {
    return await serverGet("/public/activities", publicActivityPageSchema, {
      searchParams: { page, size, upcoming },
    });
  } catch (error) {
    logDegraded("/public/activities", error);
    return emptyPage(page, size);
  }
}

/** `GET /public/donation-drives` */
export async function getDonationDrives(options?: {
  page?: number;
  size?: number;
  status?: PublicDonationDrive["status"];
}): Promise<Page<PublicDonationDrive>> {
  const { page = 1, size = 20, status = "open" } = options ?? {};
  try {
    return await serverGet("/public/donation-drives", publicDonationDrivePageSchema, {
      searchParams: { page, size, status },
    });
  } catch (error) {
    logDegraded("/public/donation-drives", error);
    return emptyPage(page, size);
  }
}

/** `GET /public/guides` */
export async function getGuides(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicGuideSummary>> {
  const { page = 1, size = 20 } = options ?? {};
  try {
    return await serverGet("/public/guides", publicGuideSummaryPageSchema, {
      searchParams: { page, size },
    });
  } catch (error) {
    logDegraded("/public/guides", error);
    return emptyPage(page, size);
  }
}

/** `GET /public/guides/{slug}` */
export async function getGuide(slug: string): Promise<PublicGuide | null> {
  try {
    return await serverGet(
      `/public/guides/${encodeURIComponent(slug)}`,
      publicGuideSchema,
    );
  } catch (error) {
    logDegraded(`/public/guides/${slug}`, error);
    return null;
  }
}

/** `GET /public/faqs` */
export async function getFaqs(): Promise<PublicFaq[]> {
  try {
    return await serverGet("/public/faqs", z.array(publicFaqSchema));
  } catch (error) {
    logDegraded("/public/faqs", error);
    return [];
  }
}

/** `GET /public/areas`. Server-component seam only — see `LocationPicker`'s
 * consumers for why client components (onboarding, the BHW form) call the
 * endpoint directly with `api.get` instead. */
export async function getAreas(): Promise<PublicArea[]> {
  try {
    return await serverGet("/public/areas", z.array(publicAreaSchema));
  } catch (error) {
    logDegraded("/public/areas", error);
    return [];
  }
}

/* --- aggregates ----------------------------------------------------------- */

/** `GET /public/area-stats` */
export async function getAreaStats(): Promise<PublicBarangayStats> {
  try {
    return await serverGet("/public/area-stats", publicBarangayStatsSchema);
  } catch (error) {
    logDegraded("/public/area-stats", error);
    return {
      registered_households: 0,
      registered_members: 0,
      configured_total_households: null,
      configured_total_population: null,
      coverage_pct: null,
      evac_center_count: 0,
      active_hotline_count: 0,
      areas: [],
      computed_at: new Date().toISOString(),
    };
  }
}

/** `GET /public/flood-events` */
export async function getFloodEvents(options?: {
  page?: number;
  size?: number;
}): Promise<Page<PublicFloodEvent>> {
  const { page = 1, size = 20 } = options ?? {};
  try {
    return await serverGet("/public/flood-events", publicFloodEventPageSchema, {
      searchParams: { page, size },
    });
  } catch (error) {
    logDegraded("/public/flood-events", error);
    return emptyPage(page, size);
  }
}
