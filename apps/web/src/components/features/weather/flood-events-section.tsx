"use client";

import * as React from "react";
import { AlertTriangle, Filter, Waves } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { FloodHistoryVisualizer } from "@/components/features/weather/flood-history-visualizer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicFloodEvent } from "@/lib/api/public-types";
import { formatNumber, formatPhtDate } from "@/lib/format";

interface FloodEventsSectionProps {
  events: PublicFloodEvent[];
}

export function FloodEventsSection({ events }: FloodEventsSectionProps) {
  const [selectedYear, setSelectedYear] = React.useState<string>("all");

  // Extract available unique years sorted descending
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    events.forEach((ev) => {
      if (ev.started_at) {
        const yr = new Date(ev.started_at).getFullYear().toString();
        if (yr && yr !== "NaN") {
          years.add(yr);
        }
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [events]);

  // Filter events based on selectedYear
  const filteredEvents = React.useMemo(() => {
    if (selectedYear === "all") return events;
    return events.filter((ev) => {
      const yr = new Date(ev.started_at).getFullYear().toString();
      return yr === selectedYear;
    });
  }, [events, selectedYear]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      {/* Left Column: Summary Metrics & Interactive Chart */}
      <div className="min-w-0">
        <FloodHistoryVisualizer events={filteredEvents} />
      </div>

      {/* Right Column: Text-Based Event Log List with Year Filter */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/60 pb-3 dark:border-neutral-800">
          <h3 className="text-h3 text-neutral-900 dark:text-white">Historical Event Log</h3>

          {/* Year Filter Control */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-neutral-400 shrink-0" />
            <span className="text-caption font-semibold text-neutral-500 shrink-0">
              Filter Year:
            </span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-caption font-semibold bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 shadow-2xs">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All Years ({events.length})</SelectItem>
                {availableYears.map((yr) => {
                  const count = events.filter(
                    (e) => new Date(e.started_at).getFullYear().toString() === yr
                  ).length;
                  return (
                    <SelectItem key={yr} value={yr}>
                      {yr} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredEvents.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {filteredEvents.map((event) => {
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
                                <span className="text-body-sm font-normal text-neutral-500 ml-1">Households</span>
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
            title="No flood events for selected year"
            description="Try selecting 'All Years' or choosing a different filter option."
          />
        )}
      </div>
    </div>
  );
}
