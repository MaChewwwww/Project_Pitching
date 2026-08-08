"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  Droplets,
  Gift,
  HelpCircle,
  MapPin,
  Megaphone,
  Phone,
  Settings,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/lib/auth/auth-context";

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
    label: "Preparedness Guides",
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
    description: "Evacuation centres, clinics, and more",
    icon: Building2,
  },
  {
    href: "/admin/evacuation-centers",
    label: "Evacuation Centres",
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
];

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Signed in as ${user?.full_name ?? "…"}`}
        title="Barangay"
        titleAccent="admin console"
        description="Manage the content the public site reads live — announcements, weather, facilities, and more."
      />

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
