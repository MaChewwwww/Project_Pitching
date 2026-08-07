import * as React from "react";
import { Clock, MapPin, Phone } from "lucide-react";

import { UTILITY_BAR } from "@/lib/content/site";
import { toTelHref } from "@/lib/format";
import type { PublicHotline } from "@/lib/api/public-types";

/**
 * The dark strip above the navbar (design.md Section 7.2).
 *
 * `primary-950`, 36px, `body-sm` in white: phone, address, office hours.
 *
 * Below `lg` the strip's information moves to the footer, **with one exception —
 * the hotline number stays** (design.md Section 9.3). The compact bar rendered on
 * small screens is that exception, not a shrunken copy of the full strip: on a
 * 360px phone the address and office hours are noise, and the number is the only
 * thing worth the vertical space.
 */

export function TopUtilityBar({ primaryHotline }: { primaryHotline?: PublicHotline }) {
  return (
    <div className="bg-surface-dark text-primary-100">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        {/* Full strip — lg and up */}
        <div className="hidden h-9 items-center gap-6 lg:flex">
          {primaryHotline ? (
            <a
              href={toTelHref(primaryHotline.number)}
              aria-label={`Call ${primaryHotline.label} at ${primaryHotline.number}`}
              className="text-body-sm focus-visible:ring-primary-400 tap-44 inline-flex h-9 items-center gap-1.5 font-semibold transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              <Phone aria-hidden className="size-3.5" />
              {primaryHotline.number}
            </a>
          ) : null}

          <span className="text-body-sm text-primary-100/80 inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {UTILITY_BAR.address}
          </span>

          <span className="text-body-sm text-primary-100/80 ml-auto inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5" />
            {UTILITY_BAR.officeHours}
          </span>
        </div>

        {/* Compact — below lg. Hotline only.

            `tap-48` because this is an emergency action, and the visible text is
            only 20px tall. design.md Section 9.7: pad the hit area rather than
            enlarging the control, so the strip stays 36px while the tappable
            region is 48px. */}
        {primaryHotline ? (
          <div className="flex h-9 items-center justify-center lg:hidden">
            <a
              href={toTelHref(primaryHotline.number)}
              aria-label={`Call ${primaryHotline.label} at ${primaryHotline.number}`}
              className="text-body-sm focus-visible:ring-primary-400 tap-48 inline-flex h-9 items-center gap-1.5 px-4 font-semibold transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              <Phone aria-hidden className="size-3.5" />
              Emergency: {primaryHotline.number}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
