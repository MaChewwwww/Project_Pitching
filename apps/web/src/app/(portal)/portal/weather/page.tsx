"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, ExternalLink, Phone } from "lucide-react";

import { Button } from "@/components/common/button";
import { DetailCardSkeleton } from "@/components/common/portal-loading";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { api } from "@/lib/api/client";
import type { PublicRiverLevel, PublicWeatherCurrent } from "@/lib/api/public-types";

export default function PortalWeatherPage() {
  const weather = useQuery({
    queryKey: ["public", "weather-current"],
    queryFn: () =>
      api.get<PublicWeatherCurrent>("/public/weather/current").then((r) => r.data),
  });

  const river = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () => api.get<PublicRiverLevel>("/public/river-level").then((r) => r.data),
  });

  const hasData = weather.data && river.data;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={CloudSun}
        title="Weather & River"
        titleAccent="Watch"
        description="Check the latest cached forecast and Montalban River reading before you travel, prepare your household, or follow a barangay advisory."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/weather" target="_blank">
                <ExternalLink aria-hidden className="size-3.5 text-neutral-600" />
                <span>Open Public Weather</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Weather & River Gauge Grid ── */}
      {weather.isFetching || river.isFetching ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
          <DetailCardSkeleton
            label="Loading weather forecast"
            rows={6}
            className="h-96"
          />
          <DetailCardSkeleton label="Loading river gauge" rows={6} className="h-96" />
        </div>
      ) : hasData ? (
        <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_.6fr]">
          <WeatherPanel weather={weather.data} />
          <RiverLevelPanel river={river.data} weather={weather.data} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-neutral-200/90 bg-white p-8 text-center shadow-xs sm:rounded-3xl sm:p-12">
          <CloudSun className="size-10 text-neutral-400" />
          <h3 className="text-base font-bold text-neutral-900">
            Weather Telemetry Temporarily Unavailable
          </h3>
          <p className="max-w-md text-xs text-neutral-500">
            Scheduled data sources are refreshing. In an urgent weather disturbance, call
            the barangay hotline directly.
          </p>
        </div>
      )}

      {/* ── Emergency Hotlines Support Strip ── */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Phone className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase">
              Community Flood Advisory Desk
            </span>
            <p className="text-xs font-bold text-neutral-900">
              Barangay San Jose Disaster Operations Center: (02) 8942-0123 / 0917-812-3456
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="self-start rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 sm:self-auto"
        >
          <Link href="/help">View Emergency Hotlines</Link>
        </Button>
      </div>
    </div>
  );
}
