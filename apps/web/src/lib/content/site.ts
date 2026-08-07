import { BARANGAY } from "@/lib/brand";

/**
 * Static site copy — navigation, utility bar, footer, hero.
 *
 * This is **not** fixture data and must never move into `lib/fixtures/`. Nothing
 * here is ever served by an API; it is the chrome around the content, and it
 * belongs in the codebase permanently.
 */

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Primary navigation.
 *
 * The first four are in-page anchors on the landing page; the rest are routes.
 * A section that renders nothing (FR-PUB-018) leaves its anchor with no target,
 * and the link simply does not scroll. That is deliberate — the alternative is
 * rendering empty sections purely so the nav has somewhere to land, which is the
 * exact thing FR-PUB-018 forbids.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Hazard Map", href: "/#hazard-map" },
  { label: "Evacuation", href: "/#evacuation-centers" },
  { label: "Preparedness", href: "/guides" },
  { label: "Announcements", href: "/announcements" },
  { label: "Help & FAQs", href: "/help" },
];

export const UTILITY_BAR = {
  address: "Barangay Hall, Barangay San Jose, Rodriguez, Rizal",
  officeHours: "Office hours: Mon–Fri 8:00 AM – 5:00 PM",
} as const;

/**
 * Where the Login and Register buttons point.
 *
 * Accounts do not exist yet — the `(auth)` routes ship with the registry module
 * (M1). Both therefore point at the registration FAQ, which explains how to
 * register in person today. A stub sign-in page would be scope creep, and a
 * dead link would just look broken.
 */
export const AUTH_HREF = "/help#registration";

export const HERO = {
  eyebrow: "Handa ang San Jose",
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
  primaryCta: { label: "See the hazard map", href: "/#hazard-map" },
  secondaryCta: { label: "Preparedness guides", href: "/guides" },
} as const;

export const FOOTER_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Prepare",
    items: [
      { label: "Preparedness guides", href: "/guides" },
      { label: "San Jose Go Bag", href: "/guides/san-jose-go-bag" },
      { label: "Hazard map", href: "/#hazard-map" },
      { label: "Evacuation centres", href: "/#evacuation-centers" },
    ],
  },
  {
    title: "Stay informed",
    items: [
      { label: "Announcements", href: "/announcements" },
      { label: "Weather & river level", href: "/#weather" },
      { label: "Upcoming activities", href: "/#activities" },
    ],
  },
  {
    title: "Get involved",
    items: [
      { label: "Donation drives", href: "/#donation-drives" },
      { label: "Help & FAQs", href: "/help" },
      { label: "Register your household", href: AUTH_HREF },
    ],
  },
];
