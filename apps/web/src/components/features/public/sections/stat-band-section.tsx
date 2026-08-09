import * as React from "react";
import { Building2, ChevronDown, Home, Megaphone, Users } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { formatNumber } from "@/lib/format";
import { getAreaStats, getFacilities, getSirens } from "@/lib/api/public";
import { StatBandAnimator } from "./stat-band-animator";

export async function StatBandSection() {
  const [stats, facilities, sirens] = await Promise.all([
    getAreaStats(),
    getFacilities(),
    getSirens(),
  ]);

  const facilityCount = facilities.length || 8;
  const sirenCount = sirens.length || 4;

  const coverageCaption =
    stats.coverage_pct == null
      ? "Official Barangay Disaster Registry"
      : `${stats.coverage_pct}% of total LGU households`;

  const totalPop = stats.configured_total_population
    ? formatNumber(stats.configured_total_population)
    : "143,031";

  return (
    <StatBandAnimator className="relative">
      <section className="relative">
        {/* Green background — slides up from below before cards appear. */}
        <div
          aria-hidden
          className="stat-band-bg bg-surface-dark absolute inset-0 border-y border-white/10"
        />

        {/* Card content sits on top of the background. */}
        <div className="relative z-10 py-3.5 md:py-5 lg:py-3.5 xl:py-6">
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
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
                  icon={Building2}
                  label="Barangay Facilities"
                  value={formatNumber(facilityCount)}
                  countUpValue={facilityCount}
                  caption="Clinics, outposts, stations & hall"
                />
              </div>
              <div className="stat-band-card">
                <StatCard
                  tone="dark"
                  icon={Megaphone}
                  label="Early Warning Sirens"
                  value={formatNumber(sirenCount)}
                  countUpValue={sirenCount}
                  caption="Live siren units & alert network"
                />
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Green scroll-down indicator below stat band, before about section */}
      <div className="flex justify-center pt-5 pb-1">
        <a
          href="#about"
          aria-label="Scroll down to explore SAGIP Platform"
          className="group inline-flex items-center justify-center gap-1.5 rounded-full border border-primary-600/25 bg-primary-600/10 px-4 py-2 text-xs font-semibold leading-none text-primary-700 shadow-sm transition-all hover:bg-primary-600 hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="leading-none">Scroll down</span>
          <ChevronDown className="size-3.5 shrink-0 text-primary-600 transition-transform group-hover:translate-y-0.5 group-hover:text-white animate-bounce" />
        </a>
      </div>
    </StatBandAnimator>
  );
}
