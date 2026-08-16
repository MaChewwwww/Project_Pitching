import { z } from "zod";

/**
 * Zod mirrors of `public-types.ts`, parsed at runtime by `serverGet`
 * (`lib/api/server.ts`). Types are erased at compile time — this is what turns
 * a backend change CI somehow missed into a clear parse error instead of
 * `undefined` rendering silently on the landing page (architecture.md AR-7,
 * `apps/web/docs/data-and-state.md`).
 *
 * Field names, nullability, and shape must match `public-types.ts` exactly —
 * that file is itself a transcription of `docs/schema.md`. If one drifts from
 * the other, fix both in the same PR.
 */

function page<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    size: z.number(),
    pages: z.number(),
  });
}

export const geoJsonPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]),
});

/* --- announcements --------------------------------------------------------- */

export const announcementTypeSchema = z.enum([
  "general",
  "class_suspension",
  "road_closure",
  "utility_interruption",
  "flood_warning",
  "earthquake",
  "typhoon",
  "heavy_rainfall",
  "heat_index",
  "evacuation",
]);

export const publicAnnouncementSchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: z.enum(["announcement", "alert"]),
  type: announcementTypeSchema,
  severity: z.enum(["info", "warning", "emergency"]).nullable(),
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  instruction: z.string().nullable(),
  is_barangay_wide: z.boolean(),
  // Nullable — see public-types.ts: null only for an unpublished draft, which
  // the public endpoint never returns in practice.
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  deactivated_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  area_names: z.array(z.string()),
  issued_by_name: z.string(),
  is_active: z.boolean(),
  cover_image: z
    .object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    })
    .nullable(),
});
export const publicAnnouncementPageSchema = page(publicAnnouncementSchema);
export const announcementDetailSchema = publicAnnouncementSchema.extend({
  body_json: z.object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())),
  }),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    }),
  ),
});

/* --- emergency events (FR-SAF-018) -------------------------------------------- */

export const publicEmergencyEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["flood", "earthquake", "typhoon", "fire", "other"]),
  started_at: z.string(),
});

/* --- guides ------------------------------------------------------------------ */

export const publicGuideSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  hazard_type: z.enum([
    "flood",
    "earthquake",
    "typhoon",
    "fire",
    "landslide",
    "general",
    "food",
  ]),
  title_fil: z.string(),
  title_en: z.string(),
  phase: z.enum(["before", "during", "after", "n/a"]),
  source_attribution: z.string().nullable(),
  last_reviewed_at: z.string().nullable(),
  sort_order: z.number(),
  excerpt_fil: z.string(),
  excerpt_en: z.string(),
});
export const publicGuideSummaryPageSchema = page(publicGuideSummarySchema);

export const publicGuideSchema = publicGuideSummarySchema.extend({
  body_fil: z.string(),
  body_en: z.string(),
});

/* --- faqs --------------------------------------------------------------------- */

export const publicFaqSchema = z.object({
  id: z.string(),
  question_fil: z.string(),
  question_en: z.string(),
  answer_fil: z.string(),
  answer_en: z.string(),
  category: z.string(),
  sort_order: z.number(),
  is_published: z.boolean().optional().default(true),
});

/* --- hotlines ------------------------------------------------------------------ */

export const publicHotlineSchema = z.object({
  id: z.string(),
  label: z.string(),
  number: z.string(),
  type: z.enum([
    "barangay",
    "police",
    "fire",
    "ambulance",
    "hospital",
    "rescue",
    "mdrrmo",
  ]),
  sort_order: z.number(),
});

/* --- areas ------------------------------------------------------------------ */

export const publicAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  flood_exposure: z.enum(["low", "medium", "high"]).nullable(),
  has_boundary: z.boolean(),
});

/* --- facilities ------------------------------------------------------------------ */

export const publicFacilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    "evacuation_center",
    "hospital",
    "clinic",
    "barangay_hall",
    "police",
    "fire",
    "rescue_station",
  ]),
  address: z.string().nullable(),
  contact_number: z.string().nullable(),
  location: geoJsonPointSchema,
  area_id: z.string().nullable(),
  area_name: z.string().nullable(),
});

/* --- evacuation centres -------------------------------------------------------- */

export const publicEvacCenterSchema = z.object({
  id: z.string(),
  capacity: z.number().nullable(),
  is_open: z.boolean(),
  notes: z.string().nullable(),
  contact_number: z.string().nullable(),
  facility: publicFacilitySchema,
  occupancy: z.number(),
  occupancy_pct: z.number().nullable(),
  is_at_capacity: z.boolean(),
  occupancy_as_of: z.string(),
});
export const publicEvacCenterPageSchema = page(publicEvacCenterSchema);

/* --- activities ------------------------------------------------------------------ */

export const publicActivitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  type: z.enum([
    "drill",
    "seminar",
    "first_aid",
    "cleanup",
    "tree_planting",
    "ngo_program",
    "other",
  ]),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  venue: z.string().nullable(),
  area_id: z.string().nullable(),
  area_name: z.string().nullable(),
  is_upcoming: z.boolean(),
  published_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  cover_image: z
    .object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    })
    .nullable(),
});
export const publicActivityPageSchema = page(publicActivitySchema);
export const activityDetailSchema = publicActivitySchema.extend({
  body_json: z.object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())),
  }),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    }),
  ),
});

/* --- donation drives ---------------------------------------------------------------- */

export const publicDonationDriveSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  event_id: z.string().nullable(),
  event_name: z.string().nullable(),
  organizer_name: z.string().nullable(),
  organizer_contact: z.string().nullable(),
  drop_off_instructions: z.string().nullable(),
  active_from: z.string().nullable(),
  active_until: z.string().nullable(),
  published_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  cover_image: z
    .object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    })
    .nullable(),
});
export const publicDonationDrivePageSchema = page(publicDonationDriveSchema);
export const donationDriveDetailSchema = publicDonationDriveSchema.extend({
  body_json: z.object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())),
  }),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      sort_order: z.number(),
      is_cover: z.boolean(),
    }),
  ),
});

/* --- readings / weather ------------------------------------------------------------ */

export const publicReadingSchema = z.object({
  id: z.number(),
  source: z.enum(["open_meteo", "pagasa", "manual"]),
  metric: z.enum([
    "river_level",
    "rainfall",
    "temperature",
    "humidity",
    "heat_index",
    "precipitation_probability",
  ]),
  value: z.number(),
  unit: z.string(),
  station: z.string().nullable(),
  observed_at: z.string(),
  fetched_at: z.string(),
  age_minutes: z.number(),
  is_stale: z.boolean(),
  stale_after_minutes: z.number(),
});

export const publicForecastPointSchema = z.object({
  valid_at: z.string(),
  metric: publicReadingSchema.shape.metric,
  value: z.number(),
  unit: z.string(),
  horizon: z.enum(["hourly", "daily"]),
  source: publicReadingSchema.shape.source,
  fetched_at: z.string(),
});

export const publicWeatherCurrentSchema = z.object({
  readings: z.array(publicReadingSchema),
  peak_readings: z.array(publicReadingSchema),
  observed_at: z.string().nullable(),
  source: publicReadingSchema.shape.source.nullable(),
  is_stale: z.boolean(),
  forecast: z.array(publicForecastPointSchema),
});

export const riverThresholdsSchema = z.object({
  level_1_m: z.number().nullable(),
  level_2_m: z.number().nullable(),
  level_3_m: z.number().nullable(),
});

export const publicRiverLevelSchema = z.object({
  reading: publicReadingSchema.nullable(),
  alert_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  thresholds: riverThresholdsSchema.nullable(),
  is_stale: z.boolean(),
  last_known_good: publicReadingSchema.nullable(),
});

/* --- flood history -------------------------------------------------------------------- */

export const publicFloodEventSchema = z.object({
  id: z.string(),
  emergency_event_id: z.string().nullable().optional(),
  name: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  is_ongoing: z.boolean().optional().default(false),
  peak_level_m: z.number().nullable(),
  peak_at: z.string().nullable(),
  households_displaced: z.number().nullable(),
  notes: z.string().nullable(),
  area_names: z.array(z.string()),
});
export const publicFloodEventPageSchema = page(publicFloodEventSchema);

/* --- area statistics ---------------------------------------------------------------------- */

export const publicAreaStatSchema = z.object({
  area_id: z.string(),
  area_name: z.string(),
  area_code: z.string().nullable(),
  flood_exposure: z.enum(["low", "medium", "high"]).nullable(),
  centroid: geoJsonPointSchema.nullable(),
  registered_households: z.number(),
  registered_members: z.number(),
  evac_center_count: z.number(),
  low_risk_households: z.number().default(0),
  medium_risk_households: z.number().default(0),
  high_risk_households: z.number().default(0),
});

export const publicBarangayStatsSchema = z.object({
  registered_households: z.number(),
  registered_members: z.number(),
  configured_total_households: z.number().nullable(),
  configured_total_population: z.number().nullable(),
  coverage_pct: z.number().nullable(),
  evac_center_count: z.number(),
  active_hotline_count: z.number(),
  areas: z.array(publicAreaStatSchema),
  computed_at: z.string(),
});
