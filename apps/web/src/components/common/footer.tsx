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
    // Bottom padding clears the hotline FAB, which is fixed above this.
    <footer className="border-primary-800 bg-surface-dark text-primary-100 mt-16 border-t pb-24 md:mt-20">
      <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col gap-4">
            <LogoLockup onDark size={40} />
            <p className="text-body-sm text-primary-100/80 max-w-sm">
              Flood readiness, evacuation guidance, and community health information for{" "}
              {BARANGAY}.
            </p>

            <address className="flex flex-col gap-2 not-italic">
              <span className="text-body-sm text-primary-100/80 inline-flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                {UTILITY_BAR.address}
              </span>
              <span className="text-body-sm text-primary-100/80 inline-flex items-start gap-2">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {UTILITY_BAR.officeHours}
              </span>
            </address>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="text-overline text-primary-300 mb-3">{group.title}</p>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-body-sm text-primary-100/80 focus-visible:ring-primary-400 rounded-sm transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
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

        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-overline text-primary-300 mb-3">Emergency hotlines</p>
          <HotlineList hotlines={hotlines} onDark />
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6">
          <Attribution
            onDark
            sources={["hazard", "basemap", "weather", "river"]}
            disclaimer="warning-authority"
          />
          <p className="text-caption text-primary-100/60">
            © {year} {APP_NAME} · {BARANGAY}. Built as a student project for an SK Project
            Pitching competition.
          </p>
        </div>
      </div>
    </footer>
  );
}
