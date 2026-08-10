import * as React from "react";
import Link from "next/link";
import { ArrowRight, CloudRain } from "lucide-react";

import { Button } from "@/components/common/button";
import { Reveal } from "@/components/common/reveal";
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
      <Reveal>
        <SectionHeader
          icon={CloudRain}
          title="Weather &"
          titleAccent="River Level"
          description="Monitors real-time weather metrics and the DOST-PAGASA Montalban river gauge. Automated polling tracks rainfall, temperature, heat index, and rising water levels to alert San Jose residents of potential flood threats."
          action={
            <Button asChild variant="outline" pill size="md" className="shrink-0 max-sm:px-3">
              <Link href="/weather" aria-label="View All">
                <span className="hidden sm:inline">View All</span>
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={1} className="mt-8 grid gap-4 md:gap-6 lg:grid-cols-[2fr_1fr]">
        <WeatherPanel weather={weather} />
        <RiverLevelPanel river={river} />
      </Reveal>
    </Section>
  );
}
