import type { Metadata } from "next";
import { AlertTriangle, Waves } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { FloodHistoryVisualizer } from "@/components/features/weather/flood-history-visualizer";
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
              What the river has done before. Peak levels here are the figures every
              barangay plan since has been measured against. Automatically updated during active flood emergency events.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            {/* Left Column: Summary Metrics & Interactive Chart */}
            <div className="min-w-0">
              <FloodHistoryVisualizer events={floods.items} />
            </div>

            {/* Right Column: Text-Based Event Log List */}
            <div className="flex flex-col gap-4 min-w-0">
              <h3 className="text-h3 text-neutral-900 dark:text-white">Historical Event Log</h3>

              {floods.items.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {floods.items.map((event) => {
                    const isOngoing = event.is_ongoing || !event.ended_at;
                    return (
                      <li key={event.id}>
                        <Card radius="xl" className={isOngoing ? "border-danger/40 bg-red-50/30 dark:bg-red-950/10" : ""}>
                          <CardContent className="flex flex-col gap-4 p-5">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-h3 text-neutral-900">{event.name}</h4>
                                {isOngoing ? (
                                  <Badge tone="danger" icon={AlertTriangle}>
                                    ONGOING
                                  </Badge>
                                ) : null}
                                {event.emergency_event_id ? (
                                  <Badge tone="info" outline>
                                    Auto-synced
                                  </Badge>
                                ) : null}
                              </div>

                              <span className="text-body-sm text-neutral-500 flex flex-wrap items-center gap-1.5">
                                <time dateTime={event.started_at}>
                                  {formatPhtDate(event.started_at)}
                                </time>
                                {event.ended_at ? (
                                  <>
                                    <span>–</span>
                                    <time dateTime={event.ended_at}>
                                      {formatPhtDate(event.ended_at)}
                                    </time>
                                  </>
                                ) : (
                                  <span className="font-medium text-danger">(Ongoing)</span>
                                )}
                              </span>

                              {event.notes ? (
                                <p className="text-body text-neutral-600">{event.notes}</p>
                              ) : null}

                              {event.area_names.length > 0 ? (
                                <p className="text-caption text-neutral-500">
                                  <strong className="font-semibold text-neutral-700">Areas affected:</strong>{" "}
                                  {event.area_names.join(", ")}
                                </p>
                              ) : (
                                <p className="text-caption text-neutral-500">
                                  Areas affected were not recorded.
                                </p>
                              )}
                            </div>

                            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-50/80 p-3 border border-neutral-100 dark:bg-neutral-900/50 dark:border-neutral-800">
                              <div>
                                <dt className="text-overline text-neutral-500">Peak level</dt>
                                <dd className="text-h3 tabular font-bold text-neutral-900">
                                  {event.peak_level_m != null ? (
                                    <>
                                      {event.peak_level_m}
                                      <span className="text-body-sm font-normal text-neutral-500 ml-0.5">m</span>
                                    </>
                                  ) : (
                                    <span className="text-body-sm font-normal text-neutral-500">
                                      {isOngoing ? "Tracking..." : "Not recorded"}
                                    </span>
                                  )}
                                </dd>
                                {event.peak_at ? (
                                  <span className="text-caption block text-neutral-400">
                                    at {formatPhtDate(event.peak_at)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="border-l border-neutral-200 pl-4 dark:border-neutral-800">
                                <dt className="text-overline text-neutral-500">Displaced</dt>
                                <dd className="text-h3 tabular font-bold text-neutral-900">
                                  {event.households_displaced != null ? (
                                    <>
                                      {formatNumber(event.households_displaced)}
                                      <span className="text-body-sm font-normal text-neutral-500 ml-1">hh</span>
                                    </>
                                  ) : (
                                    <span className="text-body-sm font-normal text-neutral-500">
                                      {isOngoing ? "Tracking..." : "Not recorded"}
                                    </span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Waves}
                  title="No flood events recorded"
                  description="Past events are added as the barangay reconstructs them from its records or declares emergency flood events."
                />
              )}
            </div>
          </div>
        </section>

        <Attribution sources={["weather", "river"]} disclaimer="warning-authority" />
      </div>
    </>
  );
}
