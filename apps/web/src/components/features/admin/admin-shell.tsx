"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Droplets,
  Gift,
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  UserPlus,
  MapPin,
  Megaphone,
  Phone,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

interface NavLink {
  href: Route;
  label: string;
  icon: typeof Home;
}

interface NavCategory {
  id: string;
  title: string;
  icon: typeof Home;
  items: NavLink[];
}

const CATEGORIES: NavCategory[] = [
  {
    id: "registry",
    title: "Community Registry",
    icon: Users,
    items: [{ href: "/admin/households", label: "Households & Members", icon: Users }],
  },
  {
    // Second, right after registry, so a walkthrough reads in demo order:
    // who's registered → what's happening right now. Items land one per
    // phase as each is built (FR-SAF-018 first) — a nav link to a 404 is
    // worse than a missing one, so this list grows across S0–S5.
    id: "emergency",
    title: "Emergency Response",
    icon: ShieldCheck,
    items: [
      { href: "/admin/emergency-events", label: "Emergency Events", icon: Siren },
      { href: "/admin/safety", label: "Accounted For", icon: ShieldCheck },
      { href: "/admin/rescue-requests", label: "Rescue Queue", icon: LifeBuoy },
      {
        href: "/admin/unregistered-persons",
        label: "Unregistered Persons",
        icon: UserPlus,
      },
      { href: "/admin/incident-reports", label: "Incident Reports", icon: Camera },
    ],
  },
  {
    id: "weather",
    title: "Weather & Flood Watch",
    icon: CloudRain,
    items: [
      { href: "/admin/announcements", label: "Announcements & Alerts", icon: Megaphone },
      { href: "/admin/alert-prompts", label: "Alert Prompts", icon: ShieldAlert },
      { href: "/admin/readings", label: "River & Weather Readings", icon: Droplets },
      { href: "/admin/flood-events", label: "Flood History", icon: AlertTriangle },
    ],
  },
  {
    id: "operations",
    title: "Operations & Facilities",
    icon: Building2,
    items: [
      { href: "/admin/evacuation-centers", label: "Evacuation Centers", icon: MapPin },
      { href: "/admin/facilities", label: "Barangay Facilities", icon: Building2 },
      { href: "/admin/sirens", label: "Siren Units", icon: Siren },
      { href: "/admin/donation-drives", label: "Donation Drives", icon: Gift },
      { href: "/admin/hotlines", label: "Hotlines Directory", icon: Phone },
    ],
  },
  {
    id: "content",
    title: "Community & Content",
    icon: BookOpen,
    items: [
      { href: "/admin/activities", label: "Activities & Programs", icon: Activity },
      { href: "/admin/guides", label: "Preparedness Guidelines", icon: BookOpen },
      { href: "/admin/faqs", label: "Frequently Asked Questions", icon: HelpCircle },
    ],
  },
  {
    id: "system",
    title: "System & Setup",
    icon: Settings,
    items: [
      { href: "/admin/areas", label: "Barangay Areas / Zones", icon: MapPin },
      { href: "/admin/config", label: "Settings & Thresholds", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // All categories OPEN by default as requested
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      for (const cat of CATEGORIES) {
        initialState[cat.id] = true; // OPEN BY DEFAULT
      }
      return initialState;
    },
  );

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isDashboardActive = pathname === "/admin";

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Light Clean Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-neutral-200/80 bg-white shadow-xs md:flex">
        {/* Top Header Branding Lockup */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/60 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <LogoLockup size={32} variant="mark" />
            <div className="flex flex-col">
              <span className="text-body-sm leading-none font-bold tracking-tight text-neutral-900">
                SAGIP-SJ
              </span>
              <span className="mt-1 text-[11px] font-medium text-neutral-500">
                Barangay San Jose
              </span>
            </div>
          </div>
          <span className="border-primary-600/30 bg-primary-50 text-primary-800 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase shadow-xs">
            Admin
          </span>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 scrollbar-thin space-y-3.5 overflow-y-auto px-3.5 py-4">
          {/* Main Console Dashboard Link */}
          <div>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200",
                isDashboardActive
                  ? "bg-primary-700 shadow-primary-900/10 ring-primary-600/30 text-white shadow-sm ring-1"
                  : "border border-neutral-200/60 bg-neutral-100/70 text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              <LayoutDashboard aria-hidden className="text-primary-600 size-4 shrink-0" />
              <span>Console Dashboard</span>
            </Link>
          </div>

          {/* Categorized Modules */}
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const isOpen = !!openCategories[cat.id];
              const hasActiveChild = cat.items.some(
                (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
              );
              const CatIcon = cat.icon;

              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-1.5 transition-all"
                >
                  {/* Category Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-all duration-150",
                      hasActiveChild
                        ? "text-primary-800 bg-primary-50/80"
                        : "text-neutral-800 hover:bg-neutral-100/80",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          hasActiveChild ? "text-primary-700" : "text-neutral-500",
                        )}
                      />
                      <span>{cat.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="size-3.5 text-neutral-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="size-3.5 text-neutral-400 transition-transform duration-200" />
                    )}
                  </button>

                  {/* Indented Sub-links (Left Whitespace Indentation) */}
                  {isOpen ? (
                    <ul className="mt-1 ml-2.5 space-y-1 border-l border-neutral-200/70 py-0.5 pl-2">
                      {cat.items.map((item) => {
                        const active =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const ItemIcon = item.icon;

                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                                active
                                  ? "bg-primary-100 text-primary-900 border-primary-600 border-l-3 font-bold shadow-xs"
                                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                              )}
                            >
                              <ItemIcon
                                aria-hidden
                                className={cn(
                                  "size-3.5 shrink-0 transition-colors",
                                  active ? "text-primary-700" : "text-neutral-400",
                                )}
                              />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Pinned User Profile Footer */}
        <div className="border-t border-neutral-200/80 bg-neutral-50/80 p-3.5">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="bg-primary-100 text-primary-800 ring-primary-600/20 grid size-9 place-items-center rounded-full text-xs font-bold ring-1">
              {user?.full_name?.charAt(0) ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-neutral-900">
                {user?.full_name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                <ShieldCheck className="text-primary-600 size-3 shrink-0" />
                <span className="text-primary-700 font-semibold capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="hover:bg-danger-bg hover:text-danger hover:border-danger-border flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 shadow-xs transition-all"
            onClick={() => void logout()}
          >
            <LogOut aria-hidden className="size-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Header */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 text-neutral-900 md:hidden">
          <div className="flex items-center gap-2.5">
            <LogoLockup size={32} />
            <span className="text-body-sm font-bold text-neutral-900">
              SAGIP-SJ Admin
            </span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
            onClick={() => void logout()}
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
