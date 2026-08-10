import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { FloodEventsSection } from "@/components/features/weather/flood-events-section";
import { getFloodEvents, getRiverLevel, getWeatherCurrent } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Weather & river level",
  description:
    "Current conditions, rainfall forecast, Marikina river level with alert thresholds, and past flood events in Barangay San Jose.",
};

/**
 * Weather, river level and flood history (FR-PUB-004, FR-WX-001/002/004/013).
 *
 * The panels are the same components the landing teaser uses — they were already
 * page-agnostic, so there is nothing to lift. What this route adds is the flood
 * event history, which satisfies the public half of FR-WX-013 and gives the
 * current river reading something to be measured against.
 */
export default async function WeatherPage() {
  const [weather, river, floods] = await Promise.all([
    getWeatherCurrent(),
    getRiverLevel(),
    getFloodEvents({ size: 50 }),
  ]);

  return (
    <>
      <PageHeader
        title="Weather &"
        titleAccent="River Level"
        description="Every reading shows when it was taken and where it came from. Readings past their staleness window are marked as such rather than quietly shown as current."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Weather & River Level" }]}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-5 pb-8 md:gap-10 md:px-6 md:pt-6 md:pb-12">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-[2fr_1fr]">
          <WeatherPanel weather={weather} />
          <RiverLevelPanel river={river} />
        </div>

        <section>
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-h2 text-neutral-900">Past flood events</h2>
            <p className="text-body text-neutral-600">
              Explore historical river peak levels, household displacement figures, and affected areas from past flood events in Barangay San Jose. Live metrics and event logs update automatically during active flood emergencies.
            </p>
          </div>

          <FloodEventsSection events={floods.items} />
        </section>
      </div>
    </>
  );
}
