import type { FloodExposure } from "@/lib/api/public-types";

/**
 * Barangay areas.
 *
 * **The real list is an open item (BRD OI-3)** — the barangay has not yet supplied
 * its area names or boundary polygons. `schema.md` Section 3 uses "Area 1",
 * "Area 2" in its own examples, so these follow that until the real list arrives.
 *
 * `centroid` is null throughout, because inventing coordinates for a zone whose
 * boundary nobody has drawn would make the map look authoritative when it is not
 * (FR-MAP-008). The flood exposure values are illustrative and captioned as such
 * wherever they are rendered.
 */
export interface FixtureArea {
  id: string;
  name: string;
  code: string;
  flood_exposure: FloodExposure;
  /** Households registered so far. Aggregate only — never a row (FR-PUB-014). */
  households: number;
  members: number;
}

export const AREAS: FixtureArea[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Area 1",
    code: "A1",
    flood_exposure: "high",
    households: 412,
    members: 1783,
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "Area 2",
    code: "A2",
    flood_exposure: "high",
    households: 366,
    members: 1544,
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Area 3",
    code: "A3",
    flood_exposure: "medium",
    households: 298,
    members: 1229,
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    name: "Area 4",
    code: "A4",
    flood_exposure: "medium",
    households: 341,
    members: 1402,
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    name: "Area 5",
    code: "A5",
    flood_exposure: "low",
    households: 275,
    members: 1108,
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    name: "Area 6",
    code: "A6",
    flood_exposure: "low",
    households: 232,
    members: 951,
  },
];

export function areaById(id: string): FixtureArea | undefined {
  return AREAS.find((a) => a.id === id);
}
