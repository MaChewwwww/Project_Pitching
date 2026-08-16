"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CloudSun,
  HeartHandshake,
  History,
  House,
  LifeBuoy,
  Map,
  Menu,
  ShieldCheck,
  Siren,
  UserRound,
  X,
} from "lucide-react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";

const primary = [
  { href: "/portal", label: "Home", icon: House },
  { href: "/portal/household", label: "Household", icon: UserRound },
  { href: "/portal/safety", label: "Safety", icon: ShieldCheck },
  { href: "/portal/hazard-map", label: "Map", icon: Map },
] as const;

const more = [
  { href: "/portal/updates", label: "Updates", icon: Bell },
  { href: "/portal/preparedness", label: "Preparedness", icon: HeartHandshake },
  { href: "/portal/weather", label: "Weather", icon: CloudSun },
  { href: "/portal/history", label: "History", icon: History },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/portal" ? pathname === href : pathname.startsWith(href);
}

export function ResidentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const events = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((r) => r.data),
  });
  const active = events.data ?? [];

  return (
    <div className="min-h-dvh bg-[#f7faf7] text-neutral-950">
      <aside className="border-primary-900/10 bg-primary-950 fixed inset-y-0 left-0 z-30 hidden w-64 border-r px-4 py-5 text-white lg:flex lg:flex-col">
        <Link href="/portal" className="mb-9 flex items-center gap-3 px-2">
          <span className="bg-primary-500 shadow-primary-950/30 grid size-10 place-items-center rounded-2xl shadow-lg">
            <Siren className="size-5" />
          </span>
          <span>
            <span className="text-primary-200 block text-xs font-bold tracking-[0.18em]">
              SAGIP-SJ
            </span>
            <span className="block text-sm font-semibold">Resident portal</span>
          </span>
        </Link>
        <nav className="space-y-1" aria-label="Resident navigation">
          {[...primary, ...more].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isCurrent(pathname, href) ? "text-primary-950 bg-white" : "text-primary-100 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="text-primary-200 px-3 text-xs">Signed in as</p>
          <p className="truncate px-3 pt-1 text-sm font-semibold">{user?.full_name}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-primary-100 mt-3 min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="pb-24 lg:pb-0 lg:pl-64">
        <header className="border-primary-900/10 sticky top-0 z-20 border-b bg-[#f7faf7]/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link href="/portal" className="flex items-center gap-2 lg:hidden">
              <span className="bg-primary-700 grid size-9 place-items-center rounded-xl text-white">
                <Siren className="size-4" />
              </span>
              <span className="text-sm font-extrabold tracking-tight">SAGIP-SJ</span>
            </Link>
            <p className="hidden text-sm font-semibold text-neutral-600 lg:block">
              Your household readiness space
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-danger/25 text-danger hover:bg-danger-bg"
              >
                <Link href="/portal/rescue">
                  <LifeBuoy className="size-4" />
                  Ask for rescue
                </Link>
              </Button>
              <Link
                href="/portal/updates"
                aria-label="Updates"
                className="hover:border-primary-300 hover:text-primary-800 grid size-10 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-700"
              >
                <Bell className="size-4" />
              </Link>
            </div>
          </div>
        </header>
        {active.length ? (
          <div className="border-danger/20 bg-danger-bg border-b px-4 py-2 lg:px-8">
            <div className="text-danger mx-auto flex max-w-7xl items-center gap-2 text-sm font-semibold">
              <Siren className="size-4" />
              <span>
                {active.length === 1
                  ? `${active[0].name} is active`
                  : `${active.length} emergency events are active`}
              </span>
              <Link
                href="/portal/safety"
                className="ml-auto underline underline-offset-2"
              >
                Check in now
              </Link>
            </div>
          </div>
        ) : null}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <nav
        className="border-primary-900/10 fixed inset-x-0 bottom-0 z-40 flex min-h-[72px] items-center justify-around border-t bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Resident navigation"
      >
        {primary.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold ${isCurrent(pathname, href) ? "text-primary-700" : "text-neutral-500"}`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold text-neutral-500"
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>
      {moreOpen ? (
        <div
          className="bg-primary-950/35 fixed inset-0 z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-extrabold">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid size-11 place-items-center rounded-full bg-neutral-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-1">
              {more.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="hover:bg-primary-50 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold"
                >
                  <Icon className="text-primary-700 size-5" />
                  {label}
                </Link>
              ))}
              <Link
                href="/help"
                onClick={() => setMoreOpen(false)}
                className="hover:bg-primary-50 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold"
              >
                <LifeBuoy className="text-danger size-5" />
                Emergency hotlines
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-danger hover:bg-danger-bg flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
