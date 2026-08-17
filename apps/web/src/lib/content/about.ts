import type { LucideIcon } from "lucide-react";
import { HeartPulse, Leaf, ShieldCheck } from "lucide-react";

/**
 * "About the Platform" copy & constants (BR-0.2, FR-PUB-002).
 *
 * Grounded in the 5-person interdisciplinary student team (PolSci, PubAd, Nutrition & Dietetics, IT)
 * for the SK Project Pitching competition.
 */

export const MISSION =
  "To equip Barangay San Jose with a centralized digital platform that shifts disaster management from reactive to proactive — profiling households before disaster strikes, delivering timely hazard information and alerts, and coordinating barangay officials, health workers, and residents so that preparedness, response, and recovery are faster and better informed.";

export const VISION =
  "A disaster-resilient Barangay San Jose where community-based, technology-enabled disaster risk reduction protects every resident — especially those most vulnerable to being overlooked — through accessible information, coordinated barangay action, and a registry that never has to be rebuilt from scratch after the water recedes.";

export const WHAT_IT_IS = `A single place where residents of Barangay San Jose can see what the river is doing, where to go when it rises, and what the barangay has announced — without needing an account, and on whatever phone they already own.

Everything on this page is maintained by the barangay in one place. Nothing here is copied from another site or entered twice.`;

export const MISSION_PILLARS = [
  {
    title: "Pre-Disaster Profiling",
    description:
      "Capturing vulnerability data (PWD, elderly, pregnant, infants) in advance so relief and rescue prioritize those who need it most.",
  },
  {
    title: "Human-in-the-Loop Alerts",
    description:
      "Telemetry flags rising thresholds, but verified barangay officers issue official orders — preventing false-alarm panic.",
  },
  {
    title: "Unified Response Operations",
    description:
      "Bridging the Barangay Hall, BHWs, evacuation centers, and residents with synchronized real-time situation updates.",
  },
] as const;

export const VISION_PILLARS = [
  {
    title: "Zero-Overlooked Households",
    description:
      "Ensuring even the most isolated sitios receive early warnings, flood hazard visibility, and targeted evacuation support.",
  },
  {
    title: "A Persistent Digital Registry",
    description:
      "A permanent, auditable community database that endures across calamity cycles rather than paper forms washed away in floods.",
  },
  {
    title: "Universal Phone Accessibility",
    description:
      "Zero app store barrier. Lightweight web interface engineered for low-bandwidth 3G mobile devices under emergency conditions.",
  },
] as const;

export interface SdgEntry {
  number: number;
  title: string;
  description: string;
  tag: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  };
  highlights: string[];
  icon: LucideIcon;
}

/**
 * BRD Section 12: Primary UN Sustainable Development Goal alignments.
 * SDG 13 (Climate Action), SDG 11 (Sustainable Cities), and SDG 3 (Good Health and Well-being).
 */
export const SDG_ENTRIES: SdgEntry[] = [
  {
    number: 13,
    title: "Climate Action",
    tag: "Target 13.1 · Resilience & Early Warning",
    description:
      "Strengthening resilience and adaptive capacity to climate-induced flash floods and river overflow along the Marikina River basin through live telemetry and geospatial hazard intelligence.",
    colorScheme: {
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      text: "text-sky-700 dark:text-sky-300",
      badgeBg: "bg-[#007DBC]",
      badgeText: "text-white",
      glow: "from-sky-500/20 to-transparent",
    },
    highlights: [
      "DOST-PAGASA river level telemetry integration",
      "Official Project NOAH flood hazard return-period mapping",
      "Proactive threshold-based officer alert workflows",
    ],
    icon: Leaf,
  },
  {
    number: 11,
    title: "Sustainable Cities & Communities",
    tag: "Target 11.5 · Disaster Risk Reduction",
    description:
      "Making Barangay San Jose safe, resilient, and prepared through live evacuation center management, household risk profiling, and centralized community guidance.",
    colorScheme: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-800 dark:text-amber-300",
      badgeBg: "bg-[#FD9D24]",
      badgeText: "text-white",
      glow: "from-amber-500/20 to-transparent",
    },
    highlights: [
      "Real-time evacuation center capacity tracking",
      "Barangay emergency facility and outpost mapping",
      "Vulnerability-weighted household registry",
    ],
    icon: ShieldCheck,
  },
  {
    number: 3,
    title: "Good Health & Well-being",
    tag: "Target 3.d · Health Risk Early Warning",
    description:
      "Protecting community well-being by empowering Barangay Health Workers (BHWs) to track vulnerable demographics, monitor evacuation medical needs, and coordinate rapid emergency rescue.",
    colorScheme: {
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
      text: "text-teal-800 dark:text-teal-300",
      badgeBg: "bg-[#4C9F38]",
      badgeText: "text-white",
      glow: "from-teal-500/20 to-transparent",
    },
    highlights: [
      "Direct medical & vulnerability flags for pregnant, PWD & elderly",
      "Digital emergency rescue tracking with geotagged requests",
      "Sanitation, medical supplies & safety checklist guidance",
    ],
    icon: HeartPulse,
  },
];

export interface TeamMember {
  id: string;
  name: string;
  program: string;
  programShort: string;
  role: string;
  discipline: string;
  focus: string;
  skills: string[];
  initials: string;
  avatarUrl?: string | null;
}

/**
 * 5-Person Interdisciplinary Student Team (PolSci, PubAd, Nutrition & Dietetics, IT)
 * for the SK Project Pitching Competition.
 */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-1",
    name: "Team Member 1",
    program: "Bachelor of Science in Information Technology",
    programShort: "BSIT",
    role: "Full-Stack Development & UI/UX",
    discipline: "Information Technology",
    focus:
      "Front-end architecture, high-performance responsive UI, interactive Leaflet GIS hazard mapping, and resident onboarding flows.",
    skills: ["Next.js", "TypeScript", "Tailwind CSS", "GIS Mapping"],
    initials: "IT",
    avatarUrl: null,
  },
  {
    id: "member-2",
    name: "Team Member 2",
    program: "Bachelor of Arts in Political Science",
    programShort: "BA PolSci",
    role: "Disaster Policy & Governance Lead",
    discipline: "Political Science",
    focus:
      "Aligning system architecture with Philippine DRRM frameworks (RA 10121), LGU accountability protocols, and citizen safety charters.",
    skills: ["DRRM Policy", "LGU Frameworks", "Civic Rights", "Statutory Compliance"],
    initials: "PS",
    avatarUrl: null,
  },
  {
    id: "member-3",
    name: "Team Member 3",
    program: "Bachelor of Public Administration",
    programShort: "BPA",
    role: "Public Administration & Operations Specialist",
    discipline: "Public Administration",
    focus:
      "Designing barangay hall administrative workflows, evacuation logistics, resource tracking, and inter-agency coordination pipelines.",
    skills: ["Public Logistics", "Incident Command", "Resource Allocation", "Operations"],
    initials: "PA",
    avatarUrl: null,
  },
  {
    id: "member-4",
    name: "Team Member 4",
    program: "Bachelor of Science in Nutrition and Dietetics",
    programShort: "BSND",
    role: "Community Nutrition & Public Health Specialist",
    discipline: "Nutrition & Dietetics",
    focus:
      "Formulating vulnerability criteria for maternal-infant health, BHW field coordination, and nutritional resilience during disaster relief.",
    skills: ["Vulnerability Profiling", "BHW Coordination", "Public Health", "Emergency Relief"],
    initials: "ND",
    avatarUrl: null,
  },
  {
    id: "member-5",
    name: "Team Member 5",
    program: "Bachelor of Science in Information Technology",
    programShort: "BSIT",
    role: "Backend Systems & Database Architect",
    discipline: "Information Technology",
    focus:
      "FastAPI service development, PostgreSQL geospatial schema design, automated telemetry ingest jobs, and role-based security.",
    skills: ["FastAPI", "PostgreSQL / PostGIS", "Python", "API Security"],
    initials: "IT",
    avatarUrl: null,
  },
];

/**
 * "Why preparedness matters here" — the checklist in the alternating split
 * section. Each line states something the platform actually does.
 */
export const WHY_PREPAREDNESS: string[] = [
  "River level and rainfall, timestamped and attributed to their source",
  "Evacuation centers with live capacity, not a printed list from last year",
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
