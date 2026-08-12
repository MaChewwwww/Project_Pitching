"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  Droplets,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Megaphone,
  Phone,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import type { AccountedForOut } from "@/lib/api/safety-types";

/** The console landing screen — quick links to every resource this pass covers. */

const TILES: {
  href: Route;
  label: string;
  description: string;
  icon: typeof Megaphone;
}[] = [
  {
    href: "/admin/announcements",
    label: "Announcements & Alerts",
    description: "Publish advisories and river alerts (FR-ALT-*)",
    icon: Megaphone,
  },
  {
    href: "/admin/alert-prompts",
    label: "Alert Prompts",
    description: "Threshold breaches awaiting a decision (FR-WX-009)",
    icon: ShieldAlert,
  },
  {
    href: "/admin/readings",
    label: "River & Weather Readings",
    description: "Enter a reading manually (FR-WX-007)",
    icon: Droplets,
  },
  {
    href: "/admin/flood-events",
    label: "Flood History",
    description: "Record past flood events (FR-WX-013)",
    icon: AlertTriangle,
  },
  {
    href: "/admin/activities",
    label: "Activities",
    description: "Drills, seminars and community programs",
    icon: Activity,
  },
  {
    href: "/admin/guides",
    label: "Preparedness Guidelines",
    description: "Hazard guides shown on the public site",
    icon: BookOpen,
  },
  {
    href: "/admin/faqs",
    label: "FAQs",
    description: "Frequently asked questions",
    icon: HelpCircle,
  },
  {
    href: "/admin/hotlines",
    label: "Hotlines",
    description: "Emergency contact directory",
    icon: Phone,
  },
  {
    href: "/admin/facilities",
    label: "Facilities",
    description: "Evacuation centers, clinics, and more",
    icon: Building2,
  },
  {
    href: "/admin/evacuation-centers",
    label: "Evacuation Centers",
    description: "Capacity and open/closed status",
    icon: MapPin,
  },
  {
    href: "/admin/donation-drives",
    label: "Donation Drives",
    description: "What the barangay is collecting",
    icon: Gift,
  },
  {
    href: "/admin/areas",
    label: "Areas",
    description: "Barangay zone names and exposure",
    icon: MapPin,
  },
  {
    href: "/admin/config",
    label: "Settings",
    description: "Thresholds and barangay totals",
    icon: Settings,
  },
  {
    href: "/admin/emergency-events",
    label: "Emergency Events",
    description: "Declare or end the active event (FR-SAF-018/019)",
    icon: Siren,
  },
  {
    href: "/admin/safety",
    label: "Accounted For",
    description: "Registered vs. unaccounted, by area (FR-SAF-011)",
    icon: ShieldCheck,
  },
  {
    href: "/admin/rescue-requests",
    label: "Rescue Queue",
    description: "Requests for help, triaged by urgency (FR-SAF-010)",
    icon: LifeBuoy,
  },
];

/**
 * S6 — live tiles for whatever is actually happening right now, rather than
 * every number being a click away. `accounted-for` is only fetched when an
 * event is active — the endpoint itself 409s otherwise (`require_active_event`),
 * and there is nothing to show the officer in that state anyway.
 */
function LiveSummary() {
  const { data: activeEvent } = useQuery({
    queryKey: ["public", "emergency-events", "active"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent | null>("/public/emergency-events/active")
        .then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: openRescue } = useQuery({
    queryKey: ["admin", "rescue-requests", "open-count"],
    queryFn: () =>
      api
        .get<{ count: number }>("/admin/rescue-requests/open-count")
        .then((r) => r.data.count),
    refetchInterval: 15_000,
  });

  const { data: accountedFor } = useQuery({
    queryKey: ["admin", "accounted-for", "dashboard-tile"],
    queryFn: () => api.get<AccountedForOut>("/admin/accounted-for").then((r) => r.data),
    enabled: !!activeEvent,
    refetchInterval: 15_000,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card radius="lg">
        <CardContent className="flex flex-col gap-1">
          <Siren aria-hidden className="text-primary-600 size-5" />
          <span className="text-h3 font-bold text-neutral-900">
            {activeEvent ? activeEvent.name : "None"}
          </span>
          <span className="text-caption text-neutral-500">Active event</span>
        </CardContent>
      </Card>
      <Card radius="lg">
        <CardContent className="flex flex-col gap-1">
          <ShieldCheck aria-hidden className="size-5 text-neutral-500" />
          <span className="text-h3 font-bold text-neutral-900">
            {accountedFor ? accountedFor.registered_total.unaccounted : "—"}
          </span>
          <span className="text-caption text-neutral-500">Unaccounted</span>
        </CardContent>
      </Card>
      <Card radius="lg">
        <CardContent className="flex flex-col gap-1">
          <LifeBuoy aria-hidden className="text-danger size-5" />
          <span className="text-h3 font-bold text-neutral-900">{openRescue ?? "—"}</span>
          <span className="text-caption text-neutral-500">Open rescue requests</span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title={`Welcome back, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        description="Manage the content the public site reads live — announcements, weather, facilities, and more."
      />

      <LiveSummary />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2">
                <tile.icon aria-hidden className="text-primary-600 size-6" />
                <p className="text-h4 text-neutral-900">{tile.label}</p>
                <p className="text-body-sm text-neutral-600">{tile.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
