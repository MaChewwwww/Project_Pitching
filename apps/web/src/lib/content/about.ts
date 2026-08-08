import type { LucideIcon } from "lucide-react";
import { HeartPulse, Leaf, Salad, ShieldCheck } from "lucide-react";

/**
 * "About the Platform" copy (BR-0.2, FR-PUB-002).
 *
 * The mission and vision statements close BRD OI-10 (Section 11, D-14) —
 * drafted from the team's own concept paper rather than left as placeholder
 * prose, still open to PolSci/PubAd wordsmithing before the deck. See
 * `docs/business-requirements.md` Section 1a for the source and rationale.
 *
 * The SDG alignment is not a placeholder: BRD Section 12 states it explicitly.
 */

export const MISSION =
  "To equip Barangay San Jose with a centralized digital platform that shifts disaster management from reactive to proactive — profiling households before disaster strikes, delivering timely hazard information and alerts, and coordinating barangay officials, health workers, and residents so that preparedness, response, and recovery are faster and better informed.";

export const VISION =
  "A disaster-resilient Barangay San Jose where community-based, technology-enabled disaster risk reduction protects every resident — especially those most vulnerable to being overlooked — through accessible information, coordinated barangay action, and a registry that never has to be rebuilt from scratch after the water recedes.";

export const WHAT_IT_IS = `A single place where residents of Barangay San Jose can see what the river is doing, where to go when it rises, and what the barangay has announced — without needing an account, and on whatever phone they already own.

Everything on this page is maintained by the barangay in one place. Nothing here is copied from another site or entered twice.`;

export interface SdgEntry {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** BRD Section 12. SDG 11 and 13 are primary; 2 and 3 follow from the health modules. */
export const SDG_ENTRIES: SdgEntry[] = [
  {
    number: 11,
    title: "Sustainable Cities and Communities",
    description:
      "Building the barangay's resilience to water-related disasters — knowing who lives where, and reaching them before the water does.",
    icon: ShieldCheck,
  },
  {
    number: 13,
    title: "Climate Action",
    description:
      "Strengthening adaptive capacity to a river that floods more often and less predictably than it used to.",
    icon: Leaf,
  },
  {
    number: 2,
    title: "Zero Hunger",
    description:
      "Nutrition profiling and emergency food planning, so relief goods reach the households that need them most.",
    icon: Salad,
  },
  {
    number: 3,
    title: "Good Health and Well-being",
    description:
      "Community health information and a registry that identifies residents needing help to evacuate.",
    icon: HeartPulse,
  },
];

/**
 * "Why preparedness matters here" — the checklist in the alternating split
 * section. Each line states something the platform actually does.
 */
export const WHY_PREPAREDNESS: string[] = [
  "River level and rainfall, timestamped and attributed to their source",
  "Evacuation centres with live capacity, not a printed list from last year",
  "Alerts issued by a barangay officer — never generated automatically",
  "Flood hazard mapped from Project NOAH survey data, not from memory",
];

/**
 * The founding-year badge in the alternating split section, mirroring the
 * reference layout's offset card.
 *
 * Barangay San Jose's actual founding date is not in any project document, so the
 * badge shows the reference flood event instead — a date the barangay measures
 * everything against, and one we can source.
 */
export const HISTORY_BADGE = {
  value: "2009",
  label: "Ondoy high-water mark",
  caption: "21.5 m — the level every plan since has been measured against",
} as const;
