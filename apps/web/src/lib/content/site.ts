import type { Route } from "next";

import { APP_TAGLINE, BARANGAY } from "@/lib/brand";

/**
 * Static site copy — navigation, utility bar, footer, hero.
 *
 * This is **not** fixture data and must never move into `lib/fixtures/`. Nothing
 * here is ever served by an API; it is the chrome around the content, and it
 * belongs in the codebase permanently.
 */

/**
 * A link target in the nav or footer.
 *
 * Bare `Route` covers static routes only — a filled dynamic segment such as a
 * specific guide needs `Route`'s generic form. The union keeps both checked: a
 * typo in a static path fails to compile, and so does a guide link if the
 * `/guides/[slug]` route is ever removed.
 */
export type NavHref = Route | Route<`/guides/${string}`>;

export interface NavItem {
  label: string;
  href: NavHref;
  /**
   * Lucide icon name — must match the fixed icon assignments in design.md Section 6.
   * Required for items that appear in the navbar dropdown; optional for footer-only extras.
   */
  icon?: string;
  /** One-line hint shown beside the label in the desktop dropdown. */
  description?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Primary navigation.
 *
 * **Every href is a real route.** An earlier version pointed four of these at
 * `/#hash` anchors on the landing page, which made the landing page carry the
 * full content of every feature and left the nav promising destinations that did
 * not exist. It also interacted badly with FR-PUB-018: a section that renders
 * nothing leaves its anchor with no target, so the link silently does nothing.
 *
 * Typing `href` as `Route` rather than `string` is what makes a stale link a
 * compile error instead of a 404 nobody clicks until the pitch.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "About",
    items: [
      {
        label: "Home",
        href: "/",
        icon: "House",
        description: "Back to the landing page",
      },
      {
        label: "Platform Details",
        href: "/about",
        icon: "Info",
        description: "What this platform is and who built it",
      },
    ],
  },
  {
    title: "Stay Informed",
    items: [
      {
        label: "Hazard Map & Evacuation Centers",
        href: "/hazard-map",
        icon: "Map",
        description: "Flood-prone areas and evacuation centers",
      },
      {
        label: "Weather & River Level",
        href: "/weather",
        icon: "CloudRain",
        description: "Current readings, forecast and flood history",
      },
      {
        label: "Announcements",
        href: "/announcements",
        icon: "Megaphone",
        description: "Advisories, suspensions and emergency notices",
      },
      {
        label: "Activities",
        href: "/activities",
        icon: "CalendarDays",
        description: "Drills, training and community programmes",
      },
    ],
  },
  {
    title: "Prepare",
    items: [
      {
        label: "Barangay Facilities",
        href: "/evacuation-centers",
        icon: "Building2",
        description: "Centers, health clinics, and emergency stations",
      },
      {
        label: "Preparedness Guidelines",
        href: "/guides",
        icon: "BookOpen",
        description: "What to do before, during and after",
      },
      {
        label: "Ask for Rescue",
        href: "/rescue",
        icon: "LifeBuoy",
        description: "No account needed — name, location, and what's happening",
      },
    ],
  },
  {
    title: "Get Involved",
    items: [
      {
        label: "Donation Drives",
        href: "/donation-drives",
        icon: "HandHeart",
        description: "What the barangay is collecting right now",
      },
      {
        label: "Help & FAQs",
        href: "/help",
        icon: "CircleHelp",
        description: "How to register, and who to contact",
      },
    ],
  },
];

export const UTILITY_BAR = {
  address: "Barangay Hall, Barangay San Jose, Rodriguez, Rizal",
  officeHours: "Office hours: Mon–Fri 8:00 AM – 5:00 PM",
} as const;

/**
 * Where the navbar's Login button points. Serves both barangay staff and
 * self-registered residents (`head` role) — one sign-in page for everyone.
 */
export const LOGIN_HREF = "/login";

/**
 * Where the Register button and footer's "Register your household" link
 * point.
 *
 * Real now (FR-REG-001) — `/register` collects account basics; the household
 * itself (address, area, map pin) is completed afterwards at
 * `/portal/onboarding`. BHW-assisted registration (no account, done in one
 * visit) is a separate admin-console flow, not reachable from here.
 */
export const REGISTER_HREF = "/register";

export const HERO = {
  eyebrow: APP_TAGLINE,
  /**
   * Two-tone headline (design.md Section 4): the first line renders in
   * `neutral-900`, the second in `primary-600` with an underline accent.
   *
   * This is copy, not the app name. The name itself is still an open item
   * (BRD OI-1) and is rendered from `APP_NAME` wherever it appears.
   */
  titleLine1: "Ready Before",
  titleLine2: "the Water Rises",
  lead: `Flood readiness, evacuation guidance, and community health information for ${BARANGAY} — updated by the barangay, reachable on any phone.`,
  primaryCta: { label: "See the Hazard Map", href: "/hazard-map" },
  secondaryCta: { label: "Preparedness Guidelines", href: "/guides" },
  /** The two quick links over the hero visual. */
  quickLinks: [
    { label: "Flood Hazard Map", href: "/hazard-map", icon: "map" },
    { label: "Barangay Facilities", href: "/evacuation-centers", icon: "shelter" },
  ],
} as const;

/**
 * Footer link groups.
 *
 * Derived from `NAV_GROUPS` so a new route is added in exactly one place, plus a
 * few footer-only extras: `/about` and the Go Bag guide are not worth a topbar
 * slot, and the register link duplicates a navbar button rather than a nav item.
 */
const FOOTER_EXTRAS: Record<string, NavItem[]> = {
  Prepare: [{ label: "San Jose Go Bag", href: "/guides/san-jose-go-bag" }],
  "Stay Informed": [{ label: "About the Platform", href: "/about" }],
  "Get Involved": [{ label: "Register Your Household", href: REGISTER_HREF }],
};

export const FOOTER_GROUPS: NavGroup[] = NAV_GROUPS.map((group) => ({
  title: group.title,
  items: [
    ...group.items.map(({ label, href }) => ({ label, href })),
    ...(FOOTER_EXTRAS[group.title] ?? []),
  ],
}));
