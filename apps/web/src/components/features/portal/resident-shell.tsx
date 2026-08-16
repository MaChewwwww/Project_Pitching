"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Backpack,
  Bell,
  ChevronDown,
  ClipboardList,
  CloudSun,
  ExternalLink,
  FileWarning,
  Home,
  LifeBuoy,
  LogOut,
  Map,
  Menu,
  Phone,
  ShieldCheck,
  Siren,
  Sparkles,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

type Notice = { id: string; read_at: string | null };
type NoticePage = { items: Notice[] };

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  hasBadge?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Core Readiness",
    items: [
      { href: "/portal", label: "Dashboard", icon: Home, exact: true },
      { href: "/portal/household", label: "Household & Citizens", icon: UsersRound },
      { href: "/portal/safety", label: "Safety Check-In", icon: ShieldCheck },
      { href: "/portal/hazard-map", label: "Flood Hazard Map", icon: Map },
    ],
  },
  {
    title: "Planning & Services",
    items: [
      { href: "/portal/preparedness", label: "Preparedness Hub", icon: Backpack },
      { href: "/portal/updates", label: "Updates & Notices", icon: Bell, hasBadge: true },
      { href: "/portal/weather", label: "Weather & River Watch", icon: CloudSun },
      { href: "/portal/report", label: "Report Incident", icon: FileWarning },
      { href: "/portal/history", label: "Household History", icon: ClipboardList },
    ],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/household", label: "Household", icon: UsersRound },
  { href: "/portal/safety", label: "Safety", icon: ShieldCheck },
  { href: "/portal/hazard-map", label: "Map", icon: Map },
];

function isLinkActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ResidentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreDrawerOpen, setMoreDrawerOpen] = React.useState(false);

  const events = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((r) => r.data),
  });

  const notifications = useQuery({
    queryKey: ["me", "notifications", "unread-count"],
    queryFn: () => api.get<NoticePage>("/me/notifications").then((r) => r.data),
    refetchInterval: 30000,
  });

  const activeEvents = events.data ?? [];
  const unreadCount =
    notifications.data?.items.filter((item) => !item.read_at).length ?? 0;
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() || "R";

  return (
    <div className="min-h-screen bg-[#f7faf7] text-neutral-950 flex flex-col antialiased">
      {/* ── Desktop Sidebar Navigation (≥lg) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-emerald-950/20 bg-primary-950 text-white lg:flex">
        {/* Brand Lockup Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Link href="/portal" className="group flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-4 ring-emerald-500/20 transition-transform group-hover:scale-105">
              <Siren className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-[0.14em] text-white uppercase">
                  SAGIP-SJ
                </span>
                <span className="rounded bg-emerald-700/80 px-1 py-0.2 text-[9px] font-bold text-emerald-100 uppercase">
                  Portal
                </span>
              </div>
              <span className="block truncate text-[11px] font-medium text-emerald-200/80">
                Barangay San Jose
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <p className="px-3 text-[10px] font-bold tracking-[0.14em] text-emerald-400 uppercase">
                {group.title}
              </p>
              <nav className="space-y-0.5" aria-label={group.title}>
                {group.items.map((item) => {
                  const active = isLinkActive(pathname, item.href, Boolean(item.exact));
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className={cn(
                        "group relative flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-150",
                        active
                          ? "bg-white text-primary-950 shadow-sm"
                          : "text-emerald-100/90 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemIcon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active
                              ? "text-emerald-700"
                              : "text-emerald-300 group-hover:text-white",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.hasBadge && unreadCount > 0 ? (
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black tabular-nums",
                            active
                              ? "bg-emerald-700 text-white"
                              : "bg-red-500 text-white animate-pulse",
                          )}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Quick Emergency Rescue Action Box */}
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/60 to-rose-950/40 p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <LifeBuoy className="size-4 text-rose-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                Emergency Need?
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-rose-100/80">
              Request immediate evacuation boat or rescue assistance.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2.5 w-full rounded-xl bg-red-600 text-xs font-black text-white hover:bg-red-500 shadow-xs"
            >
              <Link href="/portal/rescue">
                <LifeBuoy className="size-3.5" />
                Ask for Rescue
              </Link>
            </Button>
          </div>
        </div>

        {/* User Account Footer */}
        <div className="mt-auto border-t border-white/10 p-3 space-y-2 bg-primary-950/80">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2 border border-white/10">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white ring-2 ring-emerald-300/30 shadow-xs">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-white leading-tight">
                {user?.full_name ?? "Resident Head"}
              </span>
              <span className="block truncate text-[10px] text-emerald-300/80">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-emerald-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ExternalLink className="size-3" />
              Public Site
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors"
            >
              <LogOut className="size-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area (with responsive padding for sidebar & mobile bottom bar) ── */}
      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-8 lg:pl-64">
        {/* ── Top Bar Header (Desktop & Mobile) ── */}
        <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-white/95 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            {/* Mobile Logo Brand */}
            <Link href="/portal" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Siren className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight text-neutral-900 leading-none">
                  SAGIP-SJ
                </span>
                <span className="text-[9px] font-bold text-emerald-700 uppercase">
                  Resident Portal
                </span>
              </div>
            </Link>

            {/* Desktop Breadcrumb/Context Indicator */}
            <div className="hidden items-center gap-2 text-xs font-semibold text-neutral-600 lg:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-0.5 text-emerald-900 font-bold">
                <Sparkles className="size-3 text-emerald-600" />
                Barangay San Jose
              </span>
              <span className="text-neutral-300">/</span>
              <span className="text-neutral-800 font-medium">
                Household Readiness & Safety Platform
              </span>
            </div>

            {/* Right Action Affordances */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* Rescue Fast Link */}
              <Button
                asChild
                size="sm"
                className="rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold hover:bg-red-600 hover:text-white shadow-2xs transition-all text-xs"
              >
                <Link href="/portal/rescue" className="flex items-center gap-1.5">
                  <LifeBuoy className="size-3.5 animate-pulse" />
                  <span>Ask for Rescue</span>
                </Link>
              </Button>

              {/* Updates Bell Action with Unread Badge */}
              <Link
                href="/portal/updates"
                aria-label="Updates & Notifications"
                className="relative grid size-9 place-items-center rounded-xl border border-neutral-200/80 bg-white text-neutral-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-900"
              >
                <Bell className="size-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              {/* Profile Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white p-1 pr-2.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label="Open resident profile menu"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-xs">
                      {initial}
                    </span>
                    <span className="hidden sm:block max-w-28 truncate text-xs font-bold text-neutral-800">
                      {user?.full_name?.split(" ")[0] ?? "Resident"}
                    </span>
                    <ChevronDown className="size-3.5 text-neutral-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-xl"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <span className="block truncate text-xs font-bold text-neutral-900">
                      {user?.full_name}
                    </span>
                    <span className="block truncate text-[11px] font-normal text-neutral-500">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="gap-2 rounded-xl text-xs font-semibold">
                    <Link href="/portal/household">
                      <UsersRound className="size-3.5 text-emerald-700" />
                      Household Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-2 rounded-xl text-xs font-semibold">
                    <Link href="/portal/preparedness">
                      <Backpack className="size-3.5 text-emerald-700" />
                      Preparedness Hub
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-2 rounded-xl text-xs font-semibold">
                    <Link href="/" target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5 text-neutral-500" />
                      View Public Site
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="gap-2 rounded-xl text-xs font-semibold cursor-pointer"
                    onSelect={() => void logout()}
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ── High-Impact Active Emergency Event Banner ── */}
        {activeEvents.length > 0 ? (
          <div className="border-b border-red-600/30 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-2.5 text-white shadow-md lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-white/20 ring-2 ring-white/30 backdrop-blur-xs">
                  <Siren className="size-4 animate-pulse text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white px-1.5 py-0.2 text-[10px] font-black text-red-700 uppercase">
                      Active Emergency
                    </span>
                    <span className="text-xs font-black text-white sm:text-sm">
                      {activeEvents.length === 1
                        ? activeEvents[0].name
                        : `${activeEvents.length} Emergency Events Active`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/portal/safety"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-red-700 shadow-sm transition-all hover:bg-red-50 hover:scale-105 active:scale-95"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Check In Household Now</span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Main Page Content ── */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (<lg) ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-[68px] items-center justify-around border-t border-emerald-950/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-lg lg:hidden"
        aria-label="Resident Mobile Navigation"
      >
        {MOBILE_PRIMARY.map(({ href, label, icon: Icon, exact }) => {
          const active = isLinkActive(pathname, href, Boolean(exact));
          return (
            <Link
              key={href}
              href={href as Route}
              className={cn(
                "flex min-h-13 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-1 text-[10.5px] font-bold transition-all",
                active
                  ? "text-emerald-800 bg-emerald-50/80 font-black shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              <Icon className={cn("size-5", active ? "text-emerald-700" : "text-neutral-500")} />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreDrawerOpen(true)}
          className={cn(
            "flex min-h-13 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-1 text-[10.5px] font-bold text-neutral-500 hover:text-neutral-800",
            unreadCount > 0 && "text-emerald-800",
          )}
        >
          <div className="relative">
            <Menu className="size-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-500 animate-ping" />
            ) : null}
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" Drawer Modal (<lg) ── */}
      {moreDrawerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs transition-opacity lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setMoreDrawerOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-emerald-950/10 bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="size-4" />
                </span>
                <p className="text-base font-black text-neutral-900">
                  Resident Navigation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/portal/preparedness"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-white p-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-emerald-50/50"
                >
                  <Backpack className="size-4 text-emerald-700" />
                  <span>Preparedness</span>
                </Link>
                <Link
                  href="/portal/updates"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-neutral-200/90 bg-white p-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="size-4 text-emerald-700" />
                    <span>Updates</span>
                  </div>
                  {unreadCount > 0 ? (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/portal/weather"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-white p-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-emerald-50/50"
                >
                  <CloudSun className="size-4 text-emerald-700" />
                  <span>Weather Watch</span>
                </Link>
                <Link
                  href="/portal/report"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-white p-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-emerald-50/50"
                >
                  <FileWarning className="size-4 text-amber-600" />
                  <span>Report Incident</span>
                </Link>
                <Link
                  href="/portal/history"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-white p-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-emerald-50/50"
                >
                  <ClipboardList className="size-4 text-neutral-700" />
                  <span>History & Logs</span>
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs font-bold text-red-800 shadow-2xs hover:bg-red-100"
                >
                  <Phone className="size-4 text-red-600" />
                  <span>Hotlines & Help</span>
                </Link>
              </div>

              {/* Emergency Call Action */}
              <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-50 to-rose-100/60 p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <LifeBuoy className="size-4.5 text-red-600 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Emergency Dispatch
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-700">
                  Need direct rescue assistance for trapped family members?
                </p>
                <Button
                  asChild
                  className="mt-3 w-full rounded-xl bg-red-600 font-black text-white hover:bg-red-700 shadow-xs"
                >
                  <Link href="/portal/rescue" onClick={() => setMoreDrawerOpen(false)}>
                    Submit Rescue Request
                  </Link>
                </Button>
              </div>

              {/* Account details & Logout */}
              <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-neutral-900">
                      {user?.full_name}
                    </span>
                    <span className="block truncate text-[10px] text-neutral-500">
                      {user?.email}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void logout()}
                  className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs"
                >
                  <LogOut className="size-3.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
