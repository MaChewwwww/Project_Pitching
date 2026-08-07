import type { PublicActivity } from "@/lib/api/public-types";
import { AREAS } from "./areas";
import { daysAhead } from "./clock";

/** Community activities (FR-ACT-001/002/003, FR-PUB-006). */
export const ACTIVITIES: PublicActivity[] = [
  {
    id: "11000000-0000-4000-8000-000000000001",
    title: "Barangay-wide Earthquake Drill",
    type: "drill",
    description:
      "A simultaneous Duck, Cover and Hold drill across all puroks, followed by an evacuation walkthrough to the nearest centre.",
    starts_at: daysAhead(4),
    ends_at: daysAhead(4),
    venue: "All puroks — assembly at Barangay Covered Court",
    area_id: null,
    area_name: null,
    is_upcoming: true,
  },
  {
    id: "11000000-0000-4000-8000-000000000002",
    title: "Basic First Aid and CPR Training",
    type: "first_aid",
    description:
      "Hands-on session run by the Philippine Red Cross. Limited to 40 participants; sign up at the barangay office.",
    starts_at: daysAhead(9),
    ends_at: daysAhead(9),
    venue: "Barangay San Jose Hall, Session Room",
    area_id: null,
    area_name: null,
    is_upcoming: true,
  },
  {
    id: "11000000-0000-4000-8000-000000000003",
    title: "Riverbank Clean-Up Drive",
    type: "cleanup",
    description:
      "Clearing debris from the drainage channels before the next heavy rainfall. Gloves and sacks provided.",
    starts_at: daysAhead(13),
    ends_at: daysAhead(13),
    venue: "Riverside Road, Purok 2 to Purok 6",
    area_id: AREAS[0].id,
    area_name: AREAS[0].name,
    is_upcoming: true,
  },
  {
    id: "11000000-0000-4000-8000-000000000004",
    title: "Disaster Preparedness Seminar for Households",
    type: "seminar",
    description:
      "Go Bag preparation, evacuation routes, and how the barangay alert levels work. Open to all residents.",
    starts_at: daysAhead(18),
    ends_at: daysAhead(18),
    venue: "San Jose Elementary School, Covered Court",
    area_id: null,
    area_name: null,
    is_upcoming: true,
  },
  {
    id: "11000000-0000-4000-8000-000000000005",
    title: "Tree Planting along the Riverbank",
    type: "tree_planting",
    description:
      "Bamboo and native species planting to slow erosion along the most exposed stretch of the riverbank.",
    starts_at: daysAhead(24),
    ends_at: daysAhead(24),
    venue: "Riverbank, Purok 6",
    area_id: AREAS[5].id,
    area_name: AREAS[5].name,
    is_upcoming: true,
  },
];
