import * as React from "react";
import { CloudRain } from "lucide-react";

import { SectionHeader } from "@/components/common/section-header";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { Section } from "./section";
import { getRiverLevel, getWeatherCurrent } from "@/lib/api/public";

/**
 * Weather and river level (FR-PUB-004, BR-0.4).
 *
 * **Never returns null.** Unlike the content sections, this one always renders:
 * FR-WX-012 and NFR-AVL-003 require the last known reading with its age rather
 * than an empty space, and `RiverLevelPanel` handles the case where even that is
 * missing. A blank where the river level should be reads as "no flooding" to
 * somebody scanning quickly, which is the worst possible failure mode.
 */

export async function WeatherSection() {
  const [weather, river] = await Promise.all([getWeatherCurrent(), getRiverLevel()]);

  return (
    <Section id="weather" tone="tint">
      <SectionHeader
        icon={CloudRain}
        eyebrow="Conditions right now"
        title="Weather &"
        titleAccent="river level"
        description="Every reading below shows when it was taken and where it came from. Readings older than 45 minutes are marked."
      />

      <div className="mt-8 grid gap-4 md:gap-6 lg:grid-cols-[2fr_1fr]">
        <WeatherPanel weather={weather} />
        <RiverLevelPanel river={river} />
      </div>
    </Section>
  );
}
