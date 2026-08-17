import type { PublicHotline } from "@/lib/api/public-types";

/**
 * Emergency hotlines (FR-SYS-014, FR-PUB-007).
 *
 * Official directory for Barangay San Jose, Rodriguez (Montalban), Rizal.
 */
export const HOTLINES: PublicHotline[] = [
  // --- Primary, Emergency & Municipal Hotlines ---
  {
    id: "b1000000-0000-4000-8000-000000000001",
    label: "Barangay San Jose - Emergency Hotline",
    number: "0951-188-7878",
    type: "barangay",
    sort_order: 1,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    label: "National Emergency Hotline (911)",
    number: "911",
    type: "rescue",
    sort_order: 2,
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    label: "Municipal Disaster Risk Reduction and Management Office (MDRRMO)",
    number: "0915-001-6988 / 0969-614-4825",
    type: "mdrrmo",
    sort_order: 3,
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    label: "PNP Rodriguez Municipal Police Station",
    number: "0999 195 5988",
    type: "police",
    sort_order: 4,
  },
  {
    id: "b1000000-0000-4000-8000-000000000005",
    label: "Rodriguez Fire Station (BFP)",
    number: "0951 604 7279",
    type: "fire",
    sort_order: 5,
  },
  {
    id: "b1000000-0000-4000-8000-000000000006",
    label: "Montalban Infirmary",
    number: "0917 129 3515",
    type: "hospital",
    sort_order: 6,
  },
  {
    id: "b1000000-0000-4000-8000-000000000007",
    label:
      "Rizal Provincial Hospital System (RPHS) — Casimiro A. Ynares Sr. Memorial Hospital",
    number: "(02) 8256-3000 / 0920 432 7079",
    type: "hospital",
    sort_order: 7,
  },

  // --- Barangay Health Emergency Response Team (BHERT 2024) ---
  {
    id: "b1000000-0000-4000-8000-000000000010",
    label: "BHERT Command Center",
    number: "0951-188-7878",
    type: "barangay",
    sort_order: 10,
  },
  {
    id: "b1000000-0000-4000-8000-000000000011",
    label: "BHERT Area 01",
    number: "0963-1644357",
    type: "barangay",
    sort_order: 11,
  },
  {
    id: "b1000000-0000-4000-8000-000000000012",
    label: "BHERT Area 02",
    number: "0963-1644358",
    type: "barangay",
    sort_order: 12,
  },
  {
    id: "b1000000-0000-4000-8000-000000000013",
    label: "BHERT Area 03",
    number: "0963-1644359",
    type: "barangay",
    sort_order: 13,
  },
  {
    id: "b1000000-0000-4000-8000-000000000014",
    label: "BHERT Area 04 & 05",
    number: "0938-4552877",
    type: "barangay",
    sort_order: 14,
  },
  {
    id: "b1000000-0000-4000-8000-000000000015",
    label: "BHERT Area 06",
    number: "0963-1644355",
    type: "barangay",
    sort_order: 15,
  },

  // --- San Jose Proper & Relocation Area Hotlines ---
  {
    id: "b1000000-0000-4000-8000-000000000020",
    label: "Area 01 (San Jose Proper)",
    number: "0981-3310283",
    type: "barangay",
    sort_order: 20,
  },
  {
    id: "b1000000-0000-4000-8000-000000000021",
    label: "Area 1A (Litex Village/Abatex, Christine Ville Creek/Med Heights)",
    number: "0951-2101957",
    type: "barangay",
    sort_order: 21,
  },
  {
    id: "b1000000-0000-4000-8000-000000000022",
    label:
      "Area 02 (VRV/Amityville/Christine Ville, Pamahay/Villa Ana/Zuniga Farm)",
    number: "0930-6367957",
    type: "barangay",
    sort_order: 22,
  },
  {
    id: "b1000000-0000-4000-8000-000000000023",
    label: "Area 03 (Relocation)",
    number: "0981-3310286",
    type: "barangay",
    sort_order: 23,
  },
  {
    id: "b1000000-0000-4000-8000-000000000024",
    label: "Area 04 (Kasiglahan Phase 1-D/Phase 1-M)",
    number: "0951-2100870",
    type: "barangay",
    sort_order: 24,
  },
  {
    id: "b1000000-0000-4000-8000-000000000025",
    label:
      "Area 05 (Kasiglahan Phase 1-K/Phase 1-KT, Phase 1-Z/Phase 1-E/Phase 1-C)",
    number: "0930-4577488",
    type: "barangay",
    sort_order: 25,
  },
  {
    id: "b1000000-0000-4000-8000-000000000026",
    label: "Area 06 (Sub-Urban/Metro Manila Hills)",
    number: "0963-4605277",
    type: "barangay",
    sort_order: 26,
  },
];

/**
 * The number shown in the utility bar, the floating action button and the alert
 * banner's call action.
 */
export const PRIMARY_HOTLINE: PublicHotline = HOTLINES[0];

/** National emergency line for immediate rescue or medical danger. */
export const NATIONAL_EMERGENCY_HOTLINE: PublicHotline = HOTLINES[1];
