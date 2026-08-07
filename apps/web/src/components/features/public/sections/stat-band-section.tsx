import * as React from "react";
import { BedDouble, Home, Phone, Users } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { formatNumber } from "@/lib/format";
import { getAreaStats } from "@/lib/api/public";
import { StatBandAnimator } from "./stat-band-animator";

/**
 * The dark statistics band (FR-ANL-003, reference layout element (d)).
 *
 * Animation sequence (driven by StatBandAnimator + CSS):
 *   1. `data-ready` flips to "true" when the section reaches 10% visibility.
 *   2. `.stat-band-bg` (the green panel) transitions from `translateY(110%)`
 *      to `translateY(0)` over 650 ms — the "sliding in" effect.
 *   3. `.stat-band-card` children reveal with opacity + translateY transitions,
 *      each delayed by 80 ms more than the previous, starting at 500 ms so
 *      they appear after the background has settled.
 *
 * The `<Reveal>` scroll-driven wrappers that were here before are removed: they
 * produced a compound translateY when stacked with the section-level animation,
 * and the StatBandAnimator replaces them with a single, coherent sequence.
 */

export async function StatBandSection() {
  const stats = await getAreaStats();

  const coverageCaption =
    stats.coverage_pct == null
      ? "Official Barangay Disaster Registry"
      : `${stats.coverage_pct}% of total LGU households`;

  const totalPop = stats.configured_total_population
    ? formatNumber(stats.configured_total_population)
    : "143,031";

  return (
    <StatBandAnimator>
      <section className="relative overflow-hidden">
        {/* Green background — slides up from below before cards appear. */}
        <div aria-hidden className="stat-band-bg absolute inset-0 bg-surface-dark border-y border-white/10" />

        {/* Card content sits on top of the background. */}
        <div className="relative z-10 py-3.5 md:py-5 lg:py-3.5 xl:py-6">
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4 lg:grid-cols-4">
              <div className="stat-band-card">
                <StatCard
                  tone="dark"
                  icon={Home}
                  label="Registered Households"
                  value={formatNumber(stats.registered_households)}
                  countUpValue={stats.registered_households ?? undefined}
                  caption={coverageCaption}
                />
              </div>
              <div className="stat-band-card">
                <StatCard
                  tone="dark"
                  icon={Users}
                  label="Registered Residents"
                  value={formatNumber(stats.registered_members)}
                  countUpValue={stats.registered_members ?? undefined}
                  caption={`Est. ~${totalPop} total population`}
                />
              </div>
              <div className="stat-band-card">
                <StatCard
                  tone="dark"
                  icon={BedDouble}
                  label="Evacuation Sites"
                  value={formatNumber(stats.evac_center_count)}
                  countUpValue={stats.evac_center_count ?? undefined}
                  caption="Designated shelters with live capacity"
                />
              </div>
              <div className="stat-band-card">
                <StatCard
                  tone="dark"
                  icon={Phone}
                  label="24/7 Response Lines"
                  value={formatNumber(stats.active_hotline_count)}
                  countUpValue={stats.active_hotline_count ?? undefined}
                  caption="One-tap copy & emergency dispatch"
                />
              </div>
            </dl>
          </div>
        </div>
      </section>
    </StatBandAnimator>
  );
}
