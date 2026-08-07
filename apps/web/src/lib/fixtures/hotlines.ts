import type { PublicHotline } from "@/lib/api/public-types";

/**
 * Emergency hotlines (FR-SYS-014, FR-PUB-007).
 *
 * **The numbers are deliberately non-dialable placeholders.** A realistic-looking
 * number in a demo is a number somebody eventually taps, and the person who
 * answers is a stranger. Replace these with the barangay's real directory before
 * anything is deployed or shown at the pitch.
 */
export const HOTLINES: PublicHotline[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    label: "Barangay San Jose Office",
    number: "(02) 8555-0100",
    type: "barangay",
    sort_order: 1,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    label: "Barangay Emergency Response",
    number: "0917-555-0101",
    type: "rescue",
    sort_order: 2,
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    label: "Rodriguez MDRRMO",
    number: "(02) 8555-0102",
    type: "mdrrmo",
    sort_order: 3,
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    label: "Police Station",
    number: "(02) 8555-0103",
    type: "police",
    sort_order: 4,
  },
  {
    id: "b1000000-0000-4000-8000-000000000005",
    label: "Bureau of Fire Protection",
    number: "(02) 8555-0104",
    type: "fire",
    sort_order: 5,
  },
  {
    id: "b1000000-0000-4000-8000-000000000006",
    label: "Ambulance Dispatch",
    number: "0917-555-0105",
    type: "ambulance",
    sort_order: 6,
  },
  {
    id: "b1000000-0000-4000-8000-000000000007",
    label: "Rodriguez District Hospital",
    number: "(02) 8555-0106",
    type: "hospital",
    sort_order: 7,
  },
];

/**
 * The number shown in the utility bar, the floating action button and the alert
 * banner's call action.
 *
 * All three must use the *same* number. Three different hotlines visible on one
 * screen during an emergency is worse than showing none — it forces a decision
 * at the exact moment nobody can make one.
 */
export const PRIMARY_HOTLINE: PublicHotline = HOTLINES[0];
