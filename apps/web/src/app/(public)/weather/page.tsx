import type { Metadata } from "next";
import { Waves } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { formatNumber, formatPhtDate } from "@/lib/format";
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
        eyebrow="Conditions Right Now"
        title="Weather &"
        titleAccent="River Level"
        description="Every reading shows when it was taken and where it came from. Readings past their staleness window are marked as such rather than quietly shown as current."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Weather & River Level" }]}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 md:gap-12 md:px-6 md:py-12">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-[2fr_1fr]">
          <WeatherPanel weather={weather} />
          <RiverLevelPanel river={river} />
        </div>

        <section>
          <h2 className="text-h2 mb-1 text-neutral-900">Past flood events</h2>
          <p className="text-body mb-6 text-neutral-600">
            What the river has done before. Peak levels here are the figures every
            barangay plan since has been measured against.
          </p>

          {floods.items.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {floods.items.map((event) => (
                <li key={event.id}>
                  <Card radius="xl">
                    <CardContent className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="text-h3 text-neutral-900">{event.name}</h3>
                        <span className="text-body-sm text-neutral-500">
                          <time dateTime={event.started_at}>
                            {formatPhtDate(event.started_at)}
                          </time>
                          {event.ended_at ? (
                            <>
                              {" – "}
                              <time dateTime={event.ended_at}>
                                {formatPhtDate(event.ended_at)}
                              </time>
                            </>
                          ) : null}
                        </span>
                        {event.notes ? (
                          <p className="text-body mt-1 text-neutral-600">{event.notes}</p>
                        ) : null}
                        {event.area_names.length > 0 ? (
                          <p className="text-caption mt-1 text-neutral-500">
                            Areas affected: {event.area_names.join(", ")}
                          </p>
                        ) : (
                          <p className="text-caption mt-1 text-neutral-500">
                            Areas affected were not recorded.
                          </p>
                        )}
                      </div>

                      <dl className="flex shrink-0 gap-6">
                        <div>
                          <dt className="text-overline text-neutral-500">Peak level</dt>
                          <dd className="text-h2 tabular text-neutral-900">
                            {event.peak_level_m != null ? (
                              <>
                                {event.peak_level_m}
                                <span className="text-body ml-0.5 font-normal text-neutral-500">
                                  m
                                </span>
                              </>
                            ) : (
                              <span className="text-body font-normal text-neutral-500">
                                Not recorded
                              </span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-overline text-neutral-500">Displaced</dt>
                          <dd className="text-h2 tabular text-neutral-900">
                            {event.households_displaced != null ? (
                              <>
                                {formatNumber(event.households_displaced)}
                                <span className="text-body ml-1 font-normal text-neutral-500">
                                  households
                                </span>
                              </>
                            ) : (
                              <span className="text-body font-normal text-neutral-500">
                                Not recorded
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Waves}
              title="No flood events recorded"
              description="Past events are added as the barangay reconstructs them from its records."
            />
          )}
        </section>

        <Attribution sources={["weather", "river"]} disclaimer="warning-authority" />
      </div>
    </>
  );
}
