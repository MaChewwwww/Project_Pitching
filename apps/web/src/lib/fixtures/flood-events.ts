import type { PublicFloodEvent } from "@/lib/api/public-types";
import { AREAS } from "./areas";
import { daysAgo, fixedDate } from "./clock";

/**
 * Flood history (FR-WX-013).
 *
 * The two named typhoons are real events with real dates, which is why they use
 * `fixedDate` rather than a relative offset — the date is part of the fact. The
 * peak levels and displacement counts are **illustrative**, not the barangay's
 * records; replace them with the MDRRMO's figures before the pitch.
 */
export const FLOOD_EVENTS: PublicFloodEvent[] = [
  {
    id: "51000000-0000-4000-8000-000000000001",
    name: "Typhoon Ondoy (Ketsana)",
    started_at: fixedDate("2009-09-26T00:00:00Z"),
    ended_at: fixedDate("2009-09-29T00:00:00Z"),
    peak_level_m: 21.5,
    peak_at: fixedDate("2009-09-26T14:00:00Z"),
    households_displaced: 1240,
    notes:
      "The reference event for the whole municipality. Water reached second-floor level across most of the riverside puroks.",
    area_names: [AREAS[0].name, AREAS[1].name, AREAS[2].name, AREAS[3].name],
  },
  {
    id: "51000000-0000-4000-8000-000000000002",
    name: "Typhoon Ulysses (Vamco)",
    started_at: fixedDate("2020-11-11T00:00:00Z"),
    ended_at: fixedDate("2020-11-14T00:00:00Z"),
    peak_level_m: 20.7,
    peak_at: fixedDate("2020-11-12T04:00:00Z"),
    households_displaced: 980,
    notes:
      "Comparable to Ondoy in river height. Earlier evacuation kept casualties lower despite similar water levels.",
    area_names: [AREAS[0].name, AREAS[1].name, AREAS[2].name],
  },
  {
    id: "51000000-0000-4000-8000-000000000003",
    name: "Southwest Monsoon Flooding",
    started_at: daysAgo(96),
    ended_at: daysAgo(94),
    peak_level_m: 16.2,
    peak_at: daysAgo(95),
    households_displaced: 210,
    notes: "Three days of continuous rainfall. Riverside Road impassable for two days.",
    area_names: [AREAS[0].name, AREAS[1].name],
  },
];
