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
export type PublicationStatus = "draft" | "published" | "archived";

export interface ArticleImage {
  id: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export interface ArticleDocument {
  type: "doc";
  content: Array<Record<string, unknown>>;
}

/** River alert level. `0` represents normal conditions. */
export type AlertLevel = 0 | 1 | 2 | 3;

export interface PublicAnnouncement {
  id: string;
  slug: string;
  kind: AnnouncementKind;
  type: AnnouncementType;
  severity: AnnouncementSeverity | null;
  title: string;
  excerpt: string;
  body: string;
  /** NOT NULL when `kind === "alert"` — enforced by `chk_alert_needs_instruction` (FR-ALT-005). */
  instruction: string | null;
  is_barangay_wide: boolean;
  /**
   * Nullable — `announcement.published_at` (schema.md Section 6) is null for an
   * unpublished draft. The public endpoint always filters these out, so a value
   * read through `getAnnouncements()`/`getActiveAlert()` is never actually null
   * in practice; the type stays nullable because `PublicAnnouncement` is the
   * same shape the admin console's draft-creation response uses.
   */
  published_at: string | null;
  expires_at: string | null;
  deactivated_at: string | null;
  archived_at: string | null;

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
  cover_image: ArticleImage | null;
}

export interface AnnouncementDetail extends PublicAnnouncement {
  body_json: ArticleDocument;
  images: ArticleImage[];
}

export type EmergencyEventType = "flood" | "earthquake" | "typhoon" | "fire" | "other";

/**
 * The currently declared emergency, scoping every safety check-in and rescue
 * request (FR-SAF-018). No `declared_by_*` — that is barangay-staff
 * information, not public.
 */
export interface PublicEmergencyEvent {
  name: string;
  type: EmergencyEventType;
  started_at: string;
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
   Areas — `area` (FR-SYS-013). No PII — names only, used for registration's
   area picker as well as the public area-stats breakdown.
   --------------------------------------------------------------------------- */

export interface PublicArea {
  id: string;
  name: string;
  code: string | null;
  flood_exposure: "low" | "medium" | "high" | null;
  has_boundary: boolean;
}

/* ---------------------------------------------------------------------------
   Area boundaries — GeoJSON FeatureCollection (FR-MAP-001)

   Separate from PublicArea: that endpoint returns names and stats; this one
   returns the polygon geometries the Leaflet map needs. The geometry is
   typed loosely (unknown) because the map passes it straight to react-leaflet
   without inspecting the coordinate rings.
   --------------------------------------------------------------------------- */

export interface AreaBoundaryProperties {
  area_id: string;
  name: string;
  code: string | null;
  flood_exposure: "low" | "medium" | "high" | null;
  boundary_source: "official" | "approximate" | null;
}

export interface AreaBoundaryFeature {
  type: "Feature";
  properties: AreaBoundaryProperties;
  /** GeoJSON MultiPolygon geometry — passed through verbatim from PostGIS. */
  geometry: unknown;
}

/**
 * GeoJSON FeatureCollection of area boundary polygons.
 * An empty `features` array is valid — degrades the area layer, not the whole map.
 */
export interface AreaBoundaryCollection {
  type: "FeatureCollection";
  features: AreaBoundaryFeature[];
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

export interface EvacCheckinCreate {
  evac_center_id: string;
  event_id?: string | null;
  member_id?: string | null;
  unregistered_person_id?: string | null;
  person_name: string;
  checked_in_at?: string | null;
}

export interface EvacCheckinOut {
  id: string;
  evac_center_id: string;
  evac_center_name: string;
  event_id: string;
  event_name: string;
  member_id: string | null;
  unregistered_person_id: string | null;
  person_name: string;
  checked_in_at: string;
  checked_out_at: string | null;
  recorded_by_user_id: string | null;
  recorded_by_name: string | null;
}

export interface PortalEvacuationStatusOut {
  is_currently_evacuated: boolean;
  active_checkin: EvacCheckinOut | null;
  history: EvacCheckinOut[];
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
  slug: string;
  title: string;
  excerpt: string;
  type: ActivityType;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  area_id: string | null;

  /** derived — `area.name`. Null means barangay-wide. */
  area_name: string | null;
  /** derived — `starts_at > now`. */
  is_upcoming: boolean;
  published_at: string | null;
  archived_at: string | null;
  cover_image: ArticleImage | null;
}

export interface ActivityDetail extends PublicActivity {
  body_json: ArticleDocument;
  images: ArticleImage[];
}

/* ---------------------------------------------------------------------------
   Donation notices — `donation_drive` (FR-DON-015 … 017, FR-PUB-010)

   Informational calls for goods only. Donors, quantities, targets, payments,
   and distribution are deliberately absent (D-16).
   --------------------------------------------------------------------------- */

export interface PublicDonationDrive {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  event_id: string | null;

  /** derived — `emergency_event.name`. */
  event_name: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  drop_off_instructions: string | null;
  active_from: string | null;
  active_until: string | null;
  published_at: string | null;
  archived_at: string | null;
  cover_image: ArticleImage | null;
}

export interface DonationDriveDetail extends PublicDonationDrive {
  body_json: ArticleDocument;
  images: ArticleImage[];
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
  | "precipitation_probability"
  | "tcws_signal";

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
 * A forecast point — from `forecast` (FR-WX-002).
 *
 * A separate table from `reading` on purpose. `reading.observed_at` means "when
 * the world was measured"; a forecast has no such moment, so folding the two
 * together would leave every "latest reading" query one missed filter away from
 * rendering a prediction as the current value.
 */
export interface PublicForecastPoint {
  valid_at: string;
  metric: ReadingMetric;
  value: Numeric;
  unit: string;
  horizon: "hourly" | "daily";
  source: ReadingSource;
  fetched_at: string;
}

export interface PublicWeatherCurrent {
  /** The latest reading per metric. */
  readings: PublicReading[];
  /**
   * derived — the representative observation time for the set.
   *
   * **Null only when `readings` is empty** — the platform has never received a
   * weather reading yet (a fresh deployment before the scheduler's first
   * successful run). This is a real, if rare, empty state (NFR-UX-008), not a
   * modelling gap: discovered wiring FR-PUB-013 against the live scheduler,
   * where the fixture this type was drafted against never exercised it.
   */
  observed_at: string | null;
  /** derived — the dominant source. Null under the same condition as `observed_at`. */
  source: ReadingSource | null;
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
  emergency_event_id?: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_ongoing?: boolean;
  peak_level_m: Numeric | null;
  peak_at: string | null;
  households_displaced: number | null;
  notes: string | null;

  /**
   * derived — `flood_event_area` ⋈ `area.name`.
   *
   * Unlike `announcement.area_names`, **empty means unrecorded, not
   * barangay-wide.** Historical events predate the platform, so their extent is
   * whatever the barangay could reconstruct.
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
  low_risk_households: number;
  medium_risk_households: number;
  high_risk_households: number;
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
