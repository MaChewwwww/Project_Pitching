import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CloudRain,
  HandHeart,
  LifeBuoy,
  Map,
  Phone,
  ShieldCheck,
  TriangleAlert,
  Users,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_NAME, BARANGAY } from "@/lib/brand";

/**
 * Temporary token verification page.
 *
 * This is scaffolding, not a design. It exists so the palette, type scale, radii,
 * and icon set from `docs/design.md` can be checked at 360px and desktop before
 * any real screen is built — and so a broken token wiring is obvious rather than
 * discovered ten components later.
 *
 * Replaced by the real landing page in FR-PUB-001.
 */

const primaryScale = [
  ["50", "bg-primary-50"],
  ["100", "bg-primary-100"],
  ["200", "bg-primary-200"],
  ["300", "bg-primary-300"],
  ["400", "bg-primary-400"],
  ["500", "bg-primary-500"],
  ["600", "bg-primary-600"],
  ["700", "bg-primary-700"],
  ["800", "bg-primary-800"],
  ["900", "bg-primary-900"],
  ["950", "bg-primary-950"],
] as const;

const neutralScale = [
  ["50", "bg-neutral-50"],
  ["100", "bg-neutral-100"],
  ["200", "bg-neutral-200"],
  ["300", "bg-neutral-300"],
  ["400", "bg-neutral-400"],
  ["500", "bg-neutral-500"],
  ["600", "bg-neutral-600"],
  ["700", "bg-neutral-700"],
  ["800", "bg-neutral-800"],
  ["900", "bg-neutral-900"],
] as const;

const alertLevels = [
  ["Normal", "text-alert-normal bg-alert-normal-bg"],
  ["1 · Prepare", "text-alert-1 bg-alert-1-bg"],
  ["2 · Evacuate", "text-alert-2 bg-alert-2-bg"],
  ["3 · Forced Evacuation", "text-alert-3 bg-alert-3-bg"],
] as const;

const hazardLevels = [
  ["1 · Low", "0–0.5 m", "bg-hazard-low"],
  ["2 · Medium", "0.5–1.5 m", "bg-hazard-medium"],
  ["3 · High", "> 1.5 m", "bg-hazard-high"],
] as const;

const vulnerabilityLevels = [
  ["Low", "text-vuln-low bg-vuln-low-bg"],
  ["Moderate", "text-vuln-moderate bg-vuln-moderate-bg"],
  ["High", "text-vuln-high bg-vuln-high-bg"],
  ["Priority", "text-vuln-priority bg-vuln-priority-bg"],
] as const;

const icons = [
  [Users, "Household"],
  [Map, "Area"],
  [Waves, "River level"],
  [CloudRain, "Weather"],
  [TriangleAlert, "Alert"],
  [ShieldCheck, "Safe"],
  [LifeBuoy, "Rescue"],
  [Building2, "Evac centre"],
  [HandHeart, "Donation"],
  [CalendarDays, "Activity"],
  [BookOpen, "Guide"],
  [BarChart3, "Analytics"],
  [Phone, "Hotline"],
] as const;

export default function TokenCheckPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 md:mb-12">
        <p className="text-overline text-primary-600">Scaffolding · not a design</p>
        <h1 className="text-display-xl mt-2 text-neutral-900">
          {APP_NAME}
          <span className="text-primary-600 block">design tokens</span>
        </h1>
        <p className="text-body-lg mt-4 max-w-2xl text-neutral-600">
          Every value on this page comes from{" "}
          <code className="font-mono">docs/design.md</code>. If something here looks
          wrong, the token wiring in <code className="font-mono">globals.css</code> is
          wrong — not the component.
        </p>
        <p className="text-body-sm mt-2 text-neutral-500">{BARANGAY}</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-12">
        <Section title="Colour scales" description="design.md Sections 3.1 and 3.2">
          <p className="text-overline mb-2 text-neutral-500">Primary — forest green</p>
          <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {primaryScale.map(([name, className]) => (
              <div key={name}>
                <div
                  className={`h-14 rounded-md border border-neutral-200 ${className}`}
                />
                <p className="text-caption mt-1 text-neutral-500">{name}</p>
              </div>
            ))}
          </div>

          <p className="text-overline mb-2 text-neutral-500">Neutral</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
            {neutralScale.map(([name, className]) => (
              <div key={name}>
                <div
                  className={`h-14 rounded-md border border-neutral-200 ${className}`}
                />
                <p className="text-caption mt-1 text-neutral-500">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Domain palettes"
          description="design.md Section 3.4 — these map to defined concepts, not decoration"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-overline mb-3 text-neutral-500">River alert level</p>
              <div className="flex flex-col items-start gap-2">
                {alertLevels.map(([label, className]) => (
                  <span
                    key={label}
                    className={`text-label rounded-sm px-2 py-1 ${className}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <p className="text-caption mt-3 text-neutral-500">
                Always a solid badge with a number and a word. Never a map fill.
              </p>
            </div>

            <div>
              <p className="text-overline mb-3 text-neutral-500">Flood hazard</p>
              <div className="flex flex-col gap-2">
                {hazardLevels.map(([label, depth, className]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className={`h-8 w-14 rounded-sm border border-neutral-300 opacity-60 ${className}`}
                    />
                    <span className="text-body-sm text-neutral-700">
                      {label} <span className="text-neutral-500">{depth}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-caption mt-3 text-neutral-500">
                The official Philippine convention. Always a translucent map polygon.
              </p>
            </div>

            <div>
              <p className="text-overline mb-3 text-neutral-500">
                Household vulnerability
              </p>
              <div className="flex flex-col items-start gap-2">
                {vulnerabilityLevels.map(([label, className]) => (
                  <span
                    key={label}
                    className={`text-label rounded-sm px-2 py-1 ${className}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Typography"
          description="design.md Section 4 — resize to 360px to check"
        >
          <div className="flex flex-col gap-3">
            <p className="text-overline text-neutral-500">
              overline · the signature style
            </p>
            <p className="text-display-xl text-neutral-900">display-xl</p>
            <p className="text-display-lg text-neutral-900">display-lg</p>
            <p className="text-display-md text-neutral-900">display-md 1,234</p>
            <p className="text-h1 text-neutral-800">h1 · page title</p>
            <p className="text-h2 text-neutral-800">h2 · section heading</p>
            <p className="text-h3 text-neutral-800">h3 · card title</p>
            <p className="text-body-lg text-neutral-600">
              body-lg · public site body copy. Never below 15px for anything a resident
              reads.
            </p>
            <p className="text-body text-neutral-600">body · default UI</p>
            <p className="text-body-sm text-neutral-500">body-sm · secondary</p>
            <p className="text-caption text-neutral-500">caption · updated 2 hours ago</p>
            <p className="tabular font-mono text-neutral-700">
              HH-2026-000142 · 14.735, 121.135
            </p>
          </div>
        </Section>

        <Section
          title="Buttons"
          description="design.md Section 7.3 — heights 32 / 40 / 48"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Danger</Button>
            <Button className="rounded-full px-6">Pill · public site</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
          <p className="text-caption mt-3 max-w-2xl text-neutral-500">
            These are raw shadcn primitives, so their heights and radii are shadcn&apos;s
            defaults, not design.md&apos;s. Section 7.3&apos;s sizes (32/40/48) and
            Section 5&apos;s per-component radii are applied by the{" "}
            <code className="font-mono">Button</code> wrapper in{" "}
            <code className="font-mono">components/common/</code>, which is stage 1 of the
            build order — not by editing the primitive (NFR-MNT-006). Tap targets: 44×44
            minimum on touch, 48×48 for anything used during an emergency.
          </p>
        </Section>

        <Section title="Badges and cards" description="design.md Section 7.3">
          <div className="mb-6 flex flex-wrap gap-2">
            <Badge>Verified</Badge>
            <Badge variant="secondary">Pending</Badge>
            <Badge variant="outline">Unverified</Badge>
            <Badge variant="destructive">Needs rescue</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-8">
            <Card>
              <CardHeader>
                <CardDescription className="text-overline">
                  Registered households
                </CardDescription>
                <CardTitle className="text-display-md tabular">1,284</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-caption text-neutral-500">
                  Derived from <code className="font-mono">COUNT(*)</code> — never a
                  stored total.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription className="text-overline">River level</CardDescription>
                <CardTitle className="text-display-md tabular">12.4 m</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-caption text-neutral-500">
                  PAGASA · observed 14 minutes ago. A value with no age is never rendered.
                </p>
              </CardContent>
            </Card>

            <div className="bg-surface-dark rounded-xl p-6 text-white">
              <p className="text-overline text-primary-300">KPI panel</p>
              <p className="text-display-lg tabular mt-2">143,031</p>
              <p className="text-body-sm text-primary-200 mt-1">
                Barangay population — configured, not derived
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Icons"
          description="design.md Section 6 — fixed assignments, keep stable"
        >
          <div className="flex flex-wrap gap-4">
            {icons.map(([Icon, label]) => (
              <div
                key={label}
                className="flex min-w-24 flex-col items-center gap-2 text-center"
              >
                <span className="bg-primary-100 flex h-10 w-10 items-center justify-center rounded-md">
                  <Icon className="text-primary-800 h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-caption text-neutral-500">{label}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Separator className="my-10" />

      <footer className="text-caption text-neutral-500">
        Replace this page with the real landing page (FR-PUB-001). Everything above is a
        verification harness for <code className="font-mono">globals.css</code>.
      </footer>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-h2 text-neutral-800">{title}</h2>
      <p className="text-body-sm mb-4 text-neutral-500">{description}</p>
      {children}
    </section>
  );
}
