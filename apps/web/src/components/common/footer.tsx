import * as React from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Attribution } from "./attribution";
import { HotlineList } from "./hotline-list";
import { LogoLockup } from "./logo";
import { APP_NAME, BARANGAY } from "@/lib/brand";
import { FOOTER_GROUPS, UTILITY_BAR } from "@/lib/content/site";
import type { PublicHotline } from "@/lib/api/public-types";

/**
 * Site footer (FR-PUB-012, BR-0.12).
 *
 * Barangay information, contacts, links, hotlines, attribution, copyright.
 *
 * It also absorbs the utility bar's content below `lg`, where that strip is
 * hidden (design.md Section 9.3) — which is why the address and office hours
 * appear here unconditionally rather than only on small screens: repeating them
 * on desktop costs one line and removes a breakpoint-dependent branch.
 *
 * The `Attribution` block is not optional. NOAH's ODC-ODbL licence makes credit a
 * condition of use, and NFR-LGL-005 requires the "not an official warning
 * authority" statement wherever alerts appear.
 */

export interface FooterProps {
  hotlines: PublicHotline[];
}

export function Footer({ hotlines }: FooterProps) {
  const year = new Date().getUTCFullYear();

  return (
    <footer id="footer" className="border-primary-900/60 from-primary-950 text-primary-100 relative mt-16 overflow-hidden border-t bg-gradient-to-b via-[#071d11] to-[#04120a] md:mt-24">
      <div
        aria-hidden
        className="bg-primary-600/10 pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-primary-500/10 pointer-events-none absolute -top-32 -right-32 size-96 rounded-full blur-3xl"
      />
      <div className="relative mx-auto max-w-[1440px] px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.8fr]">
          <div className="flex flex-col gap-4">
            <LogoLockup onDark size={40} />
            <p className="text-body-sm text-primary-200/90 max-w-sm leading-relaxed">
              Flood readiness, evacuation guidance, and community health information for{" "}
              <strong className="text-white">{BARANGAY}</strong>.
            </p>

            <address className="mt-2 flex flex-col gap-2.5 not-italic">
              <span className="text-body-sm text-primary-200/80 inline-flex items-start gap-2.5">
                <MapPin aria-hidden className="text-primary-400 mt-0.5 size-4 shrink-0" />
                {UTILITY_BAR.address}
              </span>
              <span className="text-body-sm text-primary-200/80 inline-flex items-start gap-2.5">
                <Clock aria-hidden className="text-primary-400 mt-0.5 size-4 shrink-0" />
                {UTILITY_BAR.officeHours}
              </span>
            </address>
          </div>

          <div className="hidden gap-6 sm:grid sm:grid-cols-2 md:grid-cols-4">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="text-overline text-primary-300 border-primary-800/60 mb-4 border-b pb-1 font-bold tracking-wider">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-body-sm text-primary-200/80 focus-visible:ring-primary-400 inline-block rounded-sm transition-colors hover:translate-x-0.5 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-primary-800/60 mt-12 border-t pt-8">
          <p className="text-overline text-primary-300 mb-4 font-bold tracking-wider">
            Emergency hotlines
          </p>
          <HotlineList hotlines={hotlines} onDark />
        </div>

        <div className="border-primary-800/60 mt-10 flex flex-col gap-4 border-t pt-8">
          <Attribution
            onDark
            sources={["hazard", "basemap", "weather", "river"]}
            disclaimer="warning-authority"
          />
          <p className="text-caption text-primary-300/60">
            © {year} {APP_NAME} · {BARANGAY}. Built as a student project for an SK Project
            Pitching competition.
          </p>
        </div>
      </div>
    </footer>
  );
}
