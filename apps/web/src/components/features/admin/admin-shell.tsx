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
  Menu,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type SessionUser, useAuth } from "@/lib/auth/auth-context";
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

function ConsoleProfileMenu({
  user,
  onLogout,
  compact = false,
}: {
  user: SessionUser | null;
  onLogout: () => Promise<void>;
  compact?: boolean;
}) {
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-1.5 text-left shadow-xs transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:ring-primary-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            compact && "border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15",
          )}
          aria-label="Open profile menu"
        >
          <span className="bg-primary-700 grid size-8 place-items-center rounded-full text-xs font-bold text-white">
            {initial}
          </span>
          {!compact ? (
            <span className="min-w-0 pr-1">
              <span className="block max-w-36 truncate text-xs font-bold text-neutral-900">
                {user?.full_name ?? "Barangay staff"}
              </span>
              <span className="block text-[10px] font-semibold tracking-wide text-primary-700 uppercase">
                {user?.role ?? "staff"}
              </span>
            </span>
          ) : null}
          <ChevronDown aria-hidden className={cn("size-3.5 text-neutral-500 transition-transform group-data-[state=open]:rotate-180", compact && "text-primary-100")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-lg border border-neutral-200 p-1.5 shadow-lg">
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block truncate text-sm font-bold text-neutral-900">{user?.full_name ?? "Barangay staff"}</span>
          <span className="mt-0.5 block truncate text-xs font-normal text-neutral-500">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="gap-2 px-2.5 py-2 text-sm font-semibold"
          onSelect={() => void onLogout()}
        >
          <LogOut aria-hidden className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="bg-primary-950 text-primary-50 hidden w-64 shrink-0 flex-col lg:flex">
        {/* Top Header Branding Lockup */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <LogoLockup size={32} variant="mark" />
            <div className="flex flex-col">
              <span className="text-body-sm leading-none font-bold tracking-tight text-white">
                SAGIP-SJ
              </span>
              <span className="text-primary-200 mt-1 text-[11px] font-medium">
                Barangay San Jose
              </span>
            </div>
          </div>
          <span className="border-primary-300/20 bg-primary-800 text-primary-100 shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
            Admin
          </span>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {/* Main Console Dashboard Link */}
          <div>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold transition-colors",
                isDashboardActive
                  ? "bg-primary-600 text-white"
                  : "text-primary-100 hover:bg-white/10 hover:text-white",
              )}
            >
              <LayoutDashboard aria-hidden className="text-primary-200 size-4 shrink-0" />
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
                <div key={cat.id} className="p-0.5">
                  {/* Category Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-[10px] font-bold tracking-[0.12em] uppercase transition-colors",
                      hasActiveChild
                        ? "text-primary-100"
                        : "text-primary-300 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          hasActiveChild ? "text-primary-200" : "text-primary-400",
                        )}
                      />
                      <span>{cat.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="text-primary-400 size-3.5" />
                    ) : (
                      <ChevronRight className="text-primary-400 size-3.5" />
                    )}
                  </button>

                  {/* Indented Sub-links (Left Whitespace Indentation) */}
                  {isOpen ? (
                    <ul className="mt-1 ml-2.5 space-y-0.5 border-l border-white/10 py-0.5 pl-2">
                      {cat.items.map((item) => {
                        const active =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const ItemIcon = item.icon;

                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                                active
                                  ? "bg-white/15 font-bold text-white"
                                  : "text-primary-200 hover:bg-white/10 hover:text-white",
                              )}
                            >
                              <ItemIcon
                                aria-hidden
                                className={cn(
                                  "size-3.5 shrink-0 transition-colors",
                                  active ? "text-primary-100" : "text-primary-400",
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

      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-6 backdrop-blur lg:flex xl:px-8">
          <div>
            <p className="text-overline text-primary-700 font-bold">Barangay San Jose</p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-800">Operations console</p>
          </div>
          <ConsoleProfileMenu user={user} onLogout={logout} />
        </header>
        {/* Mobile Top Header */}
        <header className="bg-primary-950 flex h-14 items-center justify-between px-4 text-white lg:hidden">
          <div className="flex items-center gap-2.5">
            <LogoLockup size={32} />
            <span className="text-body-sm font-bold text-white">SAGIP-SJ Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ConsoleProfileMenu user={user} onLogout={logout} compact />
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="text-primary-100 rounded p-2 hover:bg-white/10"
                >
                  <Menu aria-hidden className="size-5" />
                  <span className="sr-only">Open console navigation</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-primary-950 w-80 border-0 p-0 text-white"
              >
                <SheetTitle className="sr-only">Console navigation</SheetTitle>
                <nav className="space-y-4 overflow-y-auto p-4">
                <Link
                  href="/admin"
                  className="bg-primary-600 flex items-center gap-3 rounded px-3 py-2.5 text-sm font-bold"
                >
                  <LayoutDashboard className="size-4" /> Console dashboard
                </Link>
                {CATEGORIES.map((category) => (
                  <section key={category.id}>
                    <p className="text-primary-300 mb-1 px-2 text-[10px] font-bold tracking-[0.12em] uppercase">
                      {category.title}
                    </p>
                    {category.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-primary-100 flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-white/10"
                      >
                        <item.icon className="text-primary-300 size-4" /> {item.label}
                      </Link>
                    ))}
                  </section>
                ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
