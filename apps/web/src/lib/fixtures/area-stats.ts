import type { PublicAreaStat, PublicBarangayStats } from "@/lib/api/public-types";
import { AREAS } from "./areas";
import { fixtureNow } from "./clock";
import { EVAC_CENTERS } from "./evac-centers";
import { HOTLINES } from "./hotlines";

/**
 * Area-level aggregates (FR-ANL-002/003, FR-MAP-007, FR-PUB-014).
 *
 * Counts only. There is no field here that could hold a name or an address, which
 * is how NFR-PRV-006 is satisfied structurally rather than by remembering to
 * filter.
 *
 * `centroid` is null throughout — the barangay has not supplied area boundaries
 * (BRD OI-3), and inventing coordinates would make the map look authoritative.
 */
const areas: PublicAreaStat[] = AREAS.map((a) => ({
  area_id: a.id,
  area_name: a.name,
  area_code: a.code,
  flood_exposure: a.flood_exposure,
  centroid: null,
  registered_households: a.households,
  registered_members: a.members,
  evac_center_count: EVAC_CENTERS.filter((c) => c.facility.area_id === a.id).length,
}));

const households = areas.reduce((sum, a) => sum + a.registered_households, 0);
const members = areas.reduce((sum, a) => sum + a.registered_members, 0);

export const BARANGAY_STATS: PublicBarangayStats = {
  registered_households: households,
  registered_members: members,

  /**
   * **Null on purpose.** The barangay's total household count has not been
   * supplied by the LGU (BRD OI-12), so there is no denominator.
   */
  configured_total_households: null,

  /** 143,031 — this one *is* known, and is seeded in the foundation migration. */
  configured_total_population: 143031,

  /**
   * **Null follows from the null denominator.** FR-ANL-003 makes coverage the
   * honest headline metric; printing a percentage derived from a guessed total
   * would defeat the entire point of tracking it.
   */
  coverage_pct: null,

  evac_center_count: EVAC_CENTERS.length,
  active_hotline_count: HOTLINES.length,
  areas,
  computed_at: fixtureNow().toISOString(),
};
