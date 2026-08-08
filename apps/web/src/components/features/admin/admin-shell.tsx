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
  Droplets,
  Gift,
  HelpCircle,
  Home,
  LogOut,
  MapPin,
  Megaphone,
  Phone,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { Button } from "@/components/common/button";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

/**
 * The barangay admin console shell — sidebar nav, current-user footer.
 *
 * Client-rendered, an application rather than a document, matching
 * `(admin)/README.md` and architecture.md A-12. Every link below is UI
 * convenience; the role check that actually matters runs server-side per
 * endpoint (FR-SYS-006) and again per-screen via `useRequireRole`.
 */

interface NavItem {
  href: Route;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/households", label: "Households", icon: Users },
  { href: "/admin/announcements", label: "Announcements & Alerts", icon: Megaphone },
  { href: "/admin/alert-prompts", label: "Alert Prompts", icon: ShieldAlert },
  { href: "/admin/readings", label: "River & Weather Readings", icon: Droplets },
  { href: "/admin/flood-events", label: "Flood History", icon: AlertTriangle },
  { href: "/admin/activities", label: "Activities", icon: Activity },
  { href: "/admin/guides", label: "Preparedness Guides", icon: BookOpen },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/hotlines", label: "Hotlines", icon: Phone },
  { href: "/admin/facilities", label: "Facilities", icon: Building2 },
  { href: "/admin/evacuation-centers", label: "Evacuation Centres", icon: MapPin },
  { href: "/admin/donation-drives", label: "Donation Drives", icon: Gift },
  { href: "/admin/areas", label: "Areas", icon: MapPin },
  { href: "/admin/config", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-4">
          <LogoLockup size={32} />
          <span className="text-body-sm font-semibold text-neutral-900">
            Admin console
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-100 text-primary-800"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {user?.full_name}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {user?.role} · {user?.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void logout()}
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — the BDRRMC uses whatever phone is in their hand
            (design.md Section 9.1). Full nav collapses to the current screen's
            title; sign-out stays reachable. */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <LogoLockup size={32} />
            <span className="text-body-sm font-semibold text-neutral-900">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut aria-hidden className="size-4" />
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
