"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CloudSun,
  ExternalLink,
  Phone,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { api } from "@/lib/api/client";
import type {
  PublicRiverLevel,
  PublicWeatherCurrent,
} from "@/lib/api/public-types";

export default function PortalWeatherPage() {
  const weather = useQuery({
    queryKey: ["public", "weather-current"],
    queryFn: () =>
      api.get<PublicWeatherCurrent>("/public/weather/current").then((r) => r.data),
  });

  const river = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () =>
      api.get<PublicRiverLevel>("/public/weather/river-level").then((r) => r.data),
  });

  const hasData = weather.data && river.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={CloudSun}
        title="Weather & River"
        titleAccent="Watch"
        description="Live atmospheric telemetry from DOST-PAGASA & Open-Meteo synced with Montalban River water level sensors in Barangay San Jose."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>PAGASA & Open-Meteo Feed</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
            >
              <Link href="/weather" target="_blank">
                <span>Public Weather Page</span>
                <ExternalLink className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Weather & River Gauge Grid ── */}
      {weather.isLoading || river.isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr] animate-pulse">
          <div className="h-96 rounded-3xl bg-slate-100" />
          <div className="h-96 rounded-3xl bg-slate-100" />
        </div>
      ) : hasData ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr] items-start">
          <WeatherPanel weather={weather.data} />
          <RiverLevelPanel river={river.data} weather={weather.data} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-8 sm:p-12 text-center shadow-xs space-y-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Phone className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
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
          className="self-start sm:self-auto rounded-xl bg-emerald-700 font-bold text-white hover:bg-emerald-800 text-xs"
        >
          <Link href="/help">View Emergency Hotlines</Link>
        </Button>
      </div>
    </div>
  );
}
