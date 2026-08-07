import type { PublicEvacCenter, PublicFacility } from "@/lib/api/public-types";
import { minutesAgo } from "./clock";
import { FACILITIES } from "./facilities";

/**
 * Evacuation centres (FR-EVC-001/002/003, FR-PUB-008).
 *
 * `evac_center` carries only capacity and status — the name and address come from
 * the joined `facility` row, which is why `facility` is embedded rather than
 * flattened. Occupancy is *derived* (`COUNT` of open check-ins), never stored, so
 * the fixture supplies it the same way the API will compute it.
 *
 * `contact_person` exists on the table but is deliberately not exposed: it names
 * an individual, which FR-PUB-014 forbids on a public surface.
 */
function evacCenter(
  n: number,
  facility: PublicFacility,
  capacity: number | null,
  occupancy: number,
  isOpen: boolean,
  notes: string | null,
): PublicEvacCenter {
  const pct = capacity && capacity > 0 ? Math.round((occupancy / capacity) * 100) : null;
  return {
    id: `d1000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    capacity,
    is_open: isOpen,
    notes,
    contact_number: facility.contact_number,
    facility,
    occupancy,
    occupancy_pct: pct,
    is_at_capacity: capacity !== null && occupancy >= capacity,
    occupancy_as_of: minutesAgo(12),
  };
}

const byName = (name: string) => FACILITIES.find((f) => f.name === name)!;

export const EVAC_CENTERS: PublicEvacCenter[] = [
  evacCenter(
    1,
    byName("San Jose Elementary School"),
    320,
    0,
    true,
    "Ground floor reserved for seniors and persons with disabilities.",
  ),
  evacCenter(
    2,
    byName("San Jose National High School"),
    450,
    0,
    true,
    "Largest capacity. Covered parking available for evacuee vehicles.",
  ),
  evacCenter(3, byName("Barangay Covered Court"), 180, 0, true, null),
  evacCenter(
    4,
    byName("San Jose Multi-Purpose Hall"),
    140,
    0,
    false,
    "Currently closed for roof repair. Reopens once works are complete.",
  ),
];
