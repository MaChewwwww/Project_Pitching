import type { PublicFacility } from "@/lib/api/public-types";
import { AREAS } from "./areas";

/**
 * Barangay facilities (FR-SYS-015, FR-MAP-005).
 *
 * Coordinates are scattered around the Barangay San Jose centroid
 * (14.735, 121.135 — see `lib/brand.ts`) so the map placeholder and the 3D scene
 * have plausible geometry. They are **not surveyed positions**; the boundary
 * disclaimer in FR-MAP-008 applies to these pins too.
 *
 * Note the GeoJSON coordinate order: `[longitude, latitude]`, not the other way
 * round. Getting this backwards puts Barangay San Jose in the Indian Ocean.
 */
function facility(
  n: number,
  name: string,
  type: PublicFacility["type"],
  address: string,
  contact: string | null,
  lon: number,
  lat: number,
  areaIndex: number,
): PublicFacility {
  const area = AREAS[areaIndex];
  return {
    id: `c1000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name,
    type,
    address,
    contact_number: contact,
    location: { type: "Point", coordinates: [lon, lat] },
    area_id: area.id,
    area_name: area.name,
  };
}

export const FACILITIES: PublicFacility[] = [
  facility(
    1,
    "Barangay San Jose Hall",
    "barangay_hall",
    "Purok 1, Barangay San Jose",
    "(02) 8555-0100",
    121.1351,
    14.7352,
    0,
  ),
  facility(
    2,
    "San Jose Elementary School",
    "evacuation_center",
    "Purok 2, Barangay San Jose",
    "(02) 8555-0110",
    121.1318,
    14.7371,
    1,
  ),
  facility(
    3,
    "San Jose National High School",
    "evacuation_center",
    "Purok 5, Barangay San Jose",
    "(02) 8555-0111",
    121.1389,
    14.7334,
    3,
  ),
  facility(
    4,
    "Barangay Covered Court",
    "evacuation_center",
    "Purok 1, Barangay San Jose",
    null,
    121.1357,
    14.7344,
    0,
  ),
  facility(
    5,
    "San Jose Multi-Purpose Hall",
    "evacuation_center",
    "Purok 7, Barangay San Jose",
    null,
    121.1402,
    14.7318,
    4,
  ),
  facility(
    6,
    "Barangay Health Center",
    "clinic",
    "Purok 1, Barangay San Jose",
    "(02) 8555-0120",
    121.1346,
    14.7357,
    0,
  ),
  facility(
    7,
    "Rodriguez District Hospital",
    "hospital",
    "Manggahan, Rodriguez, Rizal",
    "(02) 8555-0106",
    121.1287,
    14.7296,
    2,
  ),
  facility(
    8,
    "Police Community Precinct",
    "police",
    "Purok 3, Barangay San Jose",
    "(02) 8555-0103",
    121.1364,
    14.7381,
    2,
  ),
  facility(
    9,
    "Fire Sub-Station",
    "fire",
    "Purok 4, Barangay San Jose",
    "(02) 8555-0104",
    121.1331,
    14.7309,
    3,
  ),
  facility(
    10,
    "Barangay Rescue Station",
    "rescue_station",
    "Purok 2, Barangay San Jose",
    "0917-555-0101",
    121.1325,
    14.7365,
    1,
  ),
  facility(
    11,
    "Riverside Health Outpost",
    "clinic",
    "Purok 6, Barangay San Jose",
    null,
    121.1412,
    14.7288,
    5,
  ),
];
