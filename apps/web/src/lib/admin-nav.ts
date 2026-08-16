import type { Route } from "next";
import type { Role } from "@/lib/auth/auth-context";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  Camera,
  CloudRain,
  Droplets,
  Gift,
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Megaphone,
  Phone,
  ShieldCheck,
  Siren,
  UserPlus,
  Users,
} from "lucide-react";

/**
 * The console's route map. Owned here rather than in `admin-shell.tsx` because
 * the sidebar and the topbar breadcrumb must agree on every label — two copies
 * would drift the moment a page is renamed.
 */

export interface AdminNavLink {
  href: Route;
  label: string;
  icon: typeof Home;
  roles?: Role[];
}

export interface AdminNavCategory {
  id: string;
  title: string;
  icon: typeof Home;
  items: AdminNavLink[];
}

export const ADMIN_ROOT = {
  href: "/admin/households" as Route,
  label: "Barangay Admin",
  icon: LayoutDashboard,
};

export const ADMIN_CATEGORIES: AdminNavCategory[] = [
  {
    id: "registry",
    title: "Community Registry",
    icon: Users,
    items: [
      { href: "/admin/households" as Route, label: "Household List", icon: Home },
      { href: "/admin/citizens" as Route, label: "Registered Citizens", icon: Users },
      {
        href: "/admin/unregistered-persons" as Route,
        label: "Unregistered Persons",
        icon: UserPlus,
      },
    ],
  },
  {
    // Second, right after registry, so a walkthrough reads in demo order:
    // who's registered → what's happening right now.
    id: "emergency",
    title: "Emergency Response",
    icon: ShieldCheck,
    items: [
      {
        href: "/admin/emergency-events" as Route,
        label: "Emergency Events",
        icon: Siren,
      },
      {
        href: "/admin/rescue-requests" as Route,
        label: "Rescue Queue",
        icon: LifeBuoy,
        roles: ["admin", "superadmin"],
      },
      {
        href: "/admin/incident-reports" as Route,
        label: "Incident Reports",
        icon: Camera,
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    id: "weather",
    title: "Weather & Flood Watch",
    icon: CloudRain,
    items: [
      { href: "/admin/announcements" as Route, label: "Announcements", icon: Megaphone },
      {
        href: "/admin/weather-readings" as Route,
        label: "River & Weather Readings",
        icon: Droplets,
      },
      {
        href: "/admin/flood-events" as Route,
        label: "Flood History",
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: "operations",
    title: "Operations & Facilities",
    icon: Building2,
    items: [
      {
        href: "/admin/evacuation-centers" as Route,
        label: "Evacuation Centers",
        icon: MapPin,
      },
      {
        href: "/admin/facilities" as Route,
        label: "Barangay Facilities",
        icon: Building2,
      },
      { href: "/admin/sirens" as Route, label: "Siren Units", icon: Siren },
      { href: "/admin/donation-drives" as Route, label: "Donation Drives", icon: Gift },
      { href: "/admin/hotlines" as Route, label: "Hotlines Directory", icon: Phone },
    ],
  },
  {
    id: "content",
    title: "Community & Content",
    icon: BookOpen,
    items: [
      {
        href: "/admin/activities" as Route,
        label: "Activities & Programs",
        icon: Activity,
      },
      {
        href: "/admin/guides" as Route,
        label: "Preparedness Guidelines",
        icon: BookOpen,
      },
      {
        href: "/admin/faqs" as Route,
        label: "Frequently Asked Questions",
        icon: HelpCircle,
      },
    ],
  },
];

/** The nav entry whose href is the longest prefix of `pathname`, if any. */
export function findAdminNavLink(pathname: string): AdminNavLink | undefined {
  let best: AdminNavLink | undefined;
  for (const category of ADMIN_CATEGORIES) {
    for (const item of category.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }
  return best;
}

export interface AdminCrumb {
  label: string;
  href?: Route;
}

const LEAF_LABELS: Record<string, string> = {
  new: "Create Announcement",
  "create-announcement": "Create Announcement",
  edit: "Edit",
};

/**
 * "Barangay Admin → Announcements & Alerts → New". Detail routes carry an
 * opaque id as their last segment, which is noise in a trail — they read as
 * "Edit" instead, matching what the page actually does.
 */
export function resolveAdminBreadcrumbs(pathname: string): AdminCrumb[] {
  const crumbs: AdminCrumb[] = [{ label: ADMIN_ROOT.label, href: ADMIN_ROOT.href }];
  if (pathname === "/admin") return [{ label: ADMIN_ROOT.label }];

  const link = findAdminNavLink(pathname);
  if (!link) return crumbs;

  const rest = pathname.slice(link.href.length).split("/").filter(Boolean);
  crumbs.push(
    rest.length > 0 ? { label: link.label, href: link.href } : { label: link.label },
  );

  for (let index = 0; index < rest.length; index += 1) {
    const segment = rest[index];
    const label =
      link.href === "/admin/sirens"
        ? segment === "edit"
          ? "Edit Siren"
          : index === 0
            ? "Siren Details"
            : (LEAF_LABELS[segment] ?? "Siren Details")
        : link.href === "/admin/announcements"
        ? segment === "create-announcement"
          ? "Create Announcement"
          : "Edit Announcement"
        : link.href === "/admin/donation-drives"
          ? segment === "create-drive" || segment === "new"
            ? "Create Donation Drive"
            : "Edit Donation Drive"
        : link.href === "/admin/households"
          ? segment === "new"
            ? "Create Household"
            : segment === "edit"
              ? "Edit Household"
              : index === 0
                ? "Household Details"
                : (LEAF_LABELS[segment] ?? "Edit Household")
          : link.href === "/admin/emergency-events"
            ? index === 0
              ? "Manage Specific Emergency Event"
              : segment === "edit"
                ? "Edit"
                : (LEAF_LABELS[segment] ?? "Manage Specific Emergency Event")
            : link.href === "/admin/citizens"
              ? segment === "new"
                ? "Add Household Member"
                : segment === "edit"
                  ? "Edit Citizen"
                  : segment === "promote"
                    ? "Create Household"
                    : index === 0
                      ? "Citizen Details"
                      : (LEAF_LABELS[segment] ?? "Citizen Details")
              : link.href === "/admin/evacuation-centers"
                ? segment === "new"
                  ? "Designate Evacuation Center"
                  : segment === "edit"
                    ? "Edit Evacuation Center"
                    : index === 0
                      ? "Evacuation Center Details"
                      : (LEAF_LABELS[segment] ?? "Evacuation Center Details")
                : link.href === "/admin/facilities"
                  ? segment === "new"
                    ? "Register Facility"
                    : segment === "edit"
                      ? "Edit Facility"
                      : index === 0
                        ? "Facility Details"
                        : (LEAF_LABELS[segment] ?? "Facility Details")
                  : (LEAF_LABELS[segment] ?? "Edit");
    const href =
      (link.href === "/admin/households" || link.href === "/admin/citizens") &&
      index === 0 &&
      rest.length > 1
        ? `${link.href}/${segment}`
        : undefined;
    crumbs.push({ label, href: href as Route | undefined });
  }
  return crumbs;
}
