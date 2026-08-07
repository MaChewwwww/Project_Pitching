/**
 * DTOs for the public (unauthenticated) API surface.
 *
 * Every field below is transcribed from `docs/schema.md` — same names, same
 * nullability, same CHECK values. Where the API computes something that is not a
 * column, it is marked `derived`. Keeping the names identical is what makes the
 * fixture → real-API swap a one-file change instead of a rename pass.
 *
 * Two rules this file enforces by construction:
 *
 * 1. **No personal data** (FR-PUB-014, NFR-PRV-006). A public DTO cannot carry a
 *    resident's name, address, or contact because there is no field for it. The
 *    one exception is documented where it appears.
 * 2. **No money** (FR-DON-010). The platform never handles money, so there is no
 *    amount field anywhere.
 *
 * Once the API exists, `make types` generates `packages/api-types` from OpenAPI
 * and this file becomes a thin re-export of those models.
 */

/* ---------------------------------------------------------------------------
   Envelopes and primitives (architecture.md Section 6.1)
   --------------------------------------------------------------------------- */

/** The list envelope every paginated endpoint returns. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** GeoJSON, as PostGIS emits it. Coordinates are `[longitude, latitude]`. */
export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

/**
 * `NUMERIC` columns are typed as `number` on the assumption that FastAPI
 * serialises Pydantic `Decimal` to a JSON number. If it is ever configured to
 * emit strings instead, these types change — worth pinning before the API lands.
 */
type Numeric = number;

/* ---------------------------------------------------------------------------
   Announcements and alerts — `announcement` (FR-ALT-*, FR-PUB-003, FR-PUB-017)

   One table, two presentations. `kind` decides which.
   --------------------------------------------------------------------------- */

export type AnnouncementKind = "announcement" | "alert";

export type AnnouncementType =
  | "general"
  | "class_suspension"
  | "road_closure"
  | "utility_interruption"
  | "flood_warning"
  | "earthquake"
  | "typhoon"
  | "heavy_rainfall"
  | "heat_index"
  | "evacuation";

export type AnnouncementSeverity = "info" | "warning" | "emergency";

/** River alert level. `0` is Normal, which the `announcement` table stores as NULL. */
export type AlertLevel = 0 | 1 | 2 | 3;

export interface PublicAnnouncement {
  id: string;
  kind: AnnouncementKind;
  type: AnnouncementType;
  severity: AnnouncementSeverity | null;
  /** Only ever set for river alerts. */
  alert_level: 1 | 2 | 3 | null;
  title: string;
  body: string;
  /** NOT NULL when `kind === "alert"` — enforced by `chk_alert_needs_instruction` (FR-ALT-005). */
  instruction: string | null;
  is_barangay_wide: boolean;
  published_at: string;
  expires_at: string | null;
  deactivated_at: string | null;

  /** derived — `announcement_area` ⋈ `area.name`. Empty means barangay-wide. */
  area_names: string[];
  /**
   * derived — `user.full_name` of the issuing officer (FR-ALT-007).
   *
   * This is the one deliberate exception to FR-PUB-014: an officer publishing an
   * evacuation order acts in an official capacity, and the requirement explicitly
   * calls for attribution. The raw `issued_by_user_id` is never exposed.
   */
  issued_by_name: string;
  /** derived — published, not expired, not deactivated. */
  is_active: boolean;
}

/* ---------------------------------------------------------------------------
   Preparedness guides — `guide` (FR-PRP-001/003/004/007, FR-PUB-005)

   Content tables are bilingual by column, not by translation table
   (schema.md Section 11), so both languages travel together.
   --------------------------------------------------------------------------- */

export type HazardType =
  "flood" | "earthquake" | "typhoon" | "fire" | "landslide" | "general" | "food";

export type GuidePhase = "before" | "during" | "after" | "n/a";

export interface PublicGuideSummary {
  id: string;
  slug: string;
  hazard_type: HazardType;
  title_fil: string;
  title_en: string;
  phase: GuidePhase;
  /** FR-PRP-007 — NDRRMC / DOH / PRC / NNC. Displayed, never optional in practice. */
  source_attribution: string | null;
  last_reviewed_at: string | null;
  sort_order: number;

  /** derived — server-side truncation of `body_*`. List responses only. */
  excerpt_fil: string;
  excerpt_en: string;
}

/** The detail response. `body_*` is omitted from the list to keep it small. */
export interface PublicGuide extends PublicGuideSummary {
  body_fil: string;
  body_en: string;
}

/* ---------------------------------------------------------------------------
   FAQs — `faq` (FR-PRP-005, FR-PUB-011)
   --------------------------------------------------------------------------- */

export interface PublicFaq {
  id: string;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  category: string;
  sort_order: number;
}

/* ---------------------------------------------------------------------------
   Hotlines — `hotline` (FR-SYS-014, FR-PUB-007, FR-PUB-015)
   --------------------------------------------------------------------------- */

export type HotlineType =
  "barangay" | "police" | "fire" | "ambulance" | "hospital" | "rescue" | "mdrrmo";

export interface PublicHotline {
  id: string;
  label: string;
  number: string;
  type: HotlineType;
  sort_order: number;
}

/* ---------------------------------------------------------------------------
   Facilities — `facility` (FR-SYS-015, FR-MAP-005)
   --------------------------------------------------------------------------- */

export type FacilityType =
  | "evacuation_center"
  | "hospital"
  | "clinic"
  | "barangay_hall"
  | "police"
  | "fire"
  | "rescue_station";

export interface PublicFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string | null;
  contact_number: string | null;
  location: GeoJsonPoint;
  area_id: string | null;

  /** derived — `area.name`. */
  area_name: string | null;
}

/* ---------------------------------------------------------------------------
   Evacuation centres — `evac_center` ⋈ `facility` (FR-EVC-*, FR-PUB-008)
   --------------------------------------------------------------------------- */

export interface PublicEvacCenter {
  id: string;
  capacity: number | null;
  is_open: boolean;
  notes: string | null;
  /** The centre's own line, which may differ from the facility's. */
  contact_number: string | null;

  /**
   * derived — the joined `facility` row. Name and address live there, not on
   * `evac_center`, so FR-PUB-008 ("address, capacity, map preview") needs both.
   */
  facility: PublicFacility;
  /**
   * derived — `COUNT(evac_checkin WHERE checked_out_at IS NULL)`.
   * schema.md Section 8 is explicit that this is computed, never a stored counter.
   */
  occupancy: number;
  /** derived — null when capacity is unknown or zero. Never divide by a guess. */
  occupancy_pct: number | null;
  /** derived — FR-EVC-008. */
  is_at_capacity: boolean;
  /** derived — when the count was taken. Drives the freshness marker. */
  occupancy_as_of: string;

  // `contact_person` is deliberately absent. It names an individual, which
  // FR-PUB-014 and NFR-PRV-006 forbid on a public surface. The official
  // `contact_number` above carries the same practical value.
}

/* ---------------------------------------------------------------------------
   Activities — `activity` (FR-ACT-*, FR-PUB-006)
   --------------------------------------------------------------------------- */

export type ActivityType =
  | "drill"
  | "seminar"
  | "first_aid"
  | "cleanup"
  | "tree_planting"
  | "ngo_program"
  | "other";

export interface PublicActivity {
  id: string;
  title: string;
  type: ActivityType;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  area_id: string | null;

  /** derived — `area.name`. Null means barangay-wide. */
  area_name: string | null;
  /** derived — `starts_at > now`. */
  is_upcoming: boolean;
}

/* ---------------------------------------------------------------------------
   Donation drives — `donation_drive` + `drive_need` (FR-DON-*, FR-PUB-010)

   No monetary field exists anywhere below, and none may be added (FR-DON-010).
   --------------------------------------------------------------------------- */

export type DonationDriveStatus = "open" | "closed";

export interface PublicDriveNeed {
  id: string;
  item_name: string;
  target_quantity: Numeric;
  unit: string;
  sort_order: number;

  /**
   * derived — SUM of `donation.quantity_received` for this need.
   *
   * Progress is measured in what actually arrived, never in what was promised.
   * schema.md Section 9: "a drive never appears funded while shelves are empty."
   */
  received_quantity: Numeric;
  /** derived — SUM of `quantity_pledged`. Secondary information only. */
  pledged_quantity: Numeric;
  /** derived — `received / target`, clamped to 0–100. */
  progress_pct: number;
}

export interface PublicDonationDrive {
  id: string;
  title: string;
  description: string | null;
  status: DonationDriveStatus;
  opened_at: string;
  closed_at: string | null;
  event_id: string | null;

  /** derived — `emergency_event.name`. */
  event_name: string | null;
  /** derived — child `drive_need` rows, sorted. */
  needs: PublicDriveNeed[];
  /** derived — Σreceived / Σtarget across all needs. */
  overall_progress_pct: number;
}

/* ---------------------------------------------------------------------------
   Readings — `reading` (FR-WX-*, FR-PUB-004)
   --------------------------------------------------------------------------- */

export type ReadingSource = "open_meteo" | "pagasa" | "manual";

export type ReadingMetric =
  | "river_level"
  | "rainfall"
  | "temperature"
  | "humidity"
  | "heat_index"
  | "precipitation_probability";

export interface PublicReading {
  /** `BIGSERIAL` — one of only two non-UUID ids in the schema. */
  id: number;
  source: ReadingSource;
  metric: ReadingMetric;
  value: Numeric;
  unit: string;
  /** PAGASA station name. Null for Open-Meteo. */
  station: string | null;
  /** When the world was measured. */
  observed_at: string;
  /** When we learned it. The gap between the two is the staleness. */
  fetched_at: string;

  /** derived — minutes since `observed_at`. */
  age_minutes: number;
  /** derived — FR-WX-011, against `config.reading.stale_after_minutes`. */
  is_stale: boolean;
  /** derived — echoed from config so the UI can explain *why* it is stale. */
  stale_after_minutes: number;

  // `entered_by_user_id` and `raw` are never public.
}

/**
 * A forecast point.
 *
 * There is **no table for this** — `reading.observed_at` means "when the world
 * was measured", and a forecast is not an observation. FR-WX-002 requires one
 * anyway, so it is modelled separately here rather than by quietly writing
 * future-dated rows into `reading`. Raising a schema open item: either a
 * `forecast` table or a `reading.kind` discriminator.
 */
export interface PublicForecastPoint {
  valid_at: string;
  metric: ReadingMetric;
  value: Numeric;
  unit: string;
  source: ReadingSource;
  fetched_at: string;
}

export interface PublicWeatherCurrent {
  /** The latest reading per metric. */
  readings: PublicReading[];
  /** derived — the representative observation time for the set. */
  observed_at: string;
  /** derived — the dominant source. */
  source: ReadingSource;
  /** derived — true when *any* reading in the set is stale. */
  is_stale: boolean;
  forecast: PublicForecastPoint[];
}

export interface RiverThresholds {
  level_1_m: Numeric | null;
  level_2_m: Numeric | null;
  level_3_m: Numeric | null;
}

export interface PublicRiverLevel {
  /** The latest `river_level` reading, or null if we have never had one. */
  reading: PublicReading | null;
  /** derived — FR-WX-005. `0` is Normal. */
  alert_level: AlertLevel;
  /**
   * derived — from `config`. **Null until MDRRMO confirms them (BRD OI-4).**
   * A null here must render as "pending", never as an invented number.
   */
  thresholds: RiverThresholds | null;
  is_stale: boolean;
  /**
   * derived — FR-WX-012 / NFR-AVL-003. When a fetch fails we show the previous
   * reading with its age rather than blanking the panel.
   */
  last_known_good: PublicReading | null;
}

/* ---------------------------------------------------------------------------
   Flood history — `flood_event` (FR-WX-013)
   --------------------------------------------------------------------------- */

export interface PublicFloodEvent {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  peak_level_m: Numeric | null;
  peak_at: string | null;
  households_displaced: number | null;
  notes: string | null;

  /**
   * derived — FR-WX-013 requires "areas affected", but `flood_event` has no area
   * relation in schema.md. Modelled as derived; needs a `flood_event_area` join
   * table to match the `announcement_area` pattern.
   */
  area_names: string[];
}

/* ---------------------------------------------------------------------------
   Area statistics (FR-ANL-002/003, FR-MAP-007, FR-PUB-014)

   No table — these are aggregates. Counts only: never a row, never a name.
   NFR-PRV-006 holds by construction because there is nowhere to put a person.
   --------------------------------------------------------------------------- */

export type FloodExposure = "low" | "medium" | "high";

export interface PublicAreaStat {
  area_id: string;
  area_name: string;
  area_code: string | null;
  flood_exposure: FloodExposure | null;
  centroid: GeoJsonPoint | null;

  /** derived — COUNT. */
  registered_households: number;
  /** derived — COUNT. */
  registered_members: number;
  /** derived — COUNT. */
  evac_center_count: number;
}

export interface PublicBarangayStats {
  registered_households: number;
  registered_members: number;
  /** `config.barangay.total_households` — **null until the LGU supplies it (OI-12)**. */
  configured_total_households: number | null;
  /** `config.barangay.total_population` — 143,031 is already known. */
  configured_total_population: number | null;
  /**
   * derived — registered / configured.
   *
   * **Must be null when the denominator is unknown.** FR-ANL-003 and BR-10.1b make
   * coverage the honest headline metric; a fabricated percentage defeats the point.
   */
  coverage_pct: number | null;
  evac_center_count: number;
  active_hotline_count: number;
  areas: PublicAreaStat[];
  computed_at: string;
}
