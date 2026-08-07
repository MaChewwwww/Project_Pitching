import * as React from "react";
import { BedDouble, Home, Phone, Users } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { formatNumber } from "@/lib/format";
import { getAreaStats } from "@/lib/api/public";

/**
 * The dark statistics band (FR-ANL-003, reference layout element (d)).
 *
 * A layout element rather than one of the twelve BRD sections — it is the strip
 * of numbers under the hero in the reference, adapted to carry figures the
 * barangay actually has.
 *
 * **Registered totals, not barangay totals.** The barangay's own household count
 * is an open item (BRD OI-12), so `configured_total_households` is null and there
 * is no denominator to divide by. Rather than print a coverage percentage derived
 * from a guess, the caption says the figure is pending. FR-ANL-003 makes coverage
 * the honest headline metric, and a fabricated one defeats the entire point.
 */

export async function StatBandSection() {
  const stats = await getAreaStats();

  const coverageCaption =
    stats.coverage_pct == null
      ? "Barangay-wide total pending from the LGU"
      : `${stats.coverage_pct}% of the barangay`;

  return (
    <section className="bg-surface-dark">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-10">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          <div className="lg:pr-6">
            <StatCard
              tone="dark"
              icon={Home}
              label="Registered households"
              value={formatNumber(stats.registered_households)}
              caption={coverageCaption}
            />
          </div>
          <div className="lg:px-6">
            <StatCard
              tone="dark"
              icon={Users}
              label="Registered residents"
              value={formatNumber(stats.registered_members)}
              caption={`Barangay population ${formatNumber(stats.configured_total_population ?? 0)}`}
            />
          </div>
          <div className="lg:px-6">
            <StatCard
              tone="dark"
              icon={BedDouble}
              label="Evacuation centres"
              value={formatNumber(stats.evac_center_count)}
              caption="Capacity shown per centre below"
            />
          </div>
          <div className="lg:pl-6">
            <StatCard
              tone="dark"
              icon={Phone}
              label="Emergency hotlines"
              value={formatNumber(stats.active_hotline_count)}
              caption="One tap to call from any page"
            />
          </div>
        </dl>
      </div>
    </section>
  );
}
