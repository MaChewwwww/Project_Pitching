"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CloudSun,
  ExternalLink,
  Radio,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/common/button";
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
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={CloudSun}
        title="Weather & River"
        titleAccent="Watch"
        description="Check the latest cached forecast and Montalban River reading before you travel, prepare your household, or follow a barangay advisory."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-100/90 px-3 py-0.5 text-xs font-black text-sky-900 shadow-2xs">
            <Radio className="size-3 text-sky-700" />
            <span>Barangay Weather Watch</span>
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
                <span>Open public weather</span>
                <ExternalLink className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
              <Activity className="size-3.5 text-emerald-700" /> Current conditions and
              short-term forecast
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
              <Radio className="size-3.5 text-emerald-700" /> Every reading shows its
              source and time
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
              <ShieldCheck className="size-3.5 text-emerald-700" /> Alert levels are
              issued by barangay officers
            </span>
          </>
        }
      />

      {/* ── Weather & River Gauge Grid ── */}
      {weather.isLoading || river.isLoading ? (
        <div className="grid animate-pulse gap-6 xl:grid-cols-[1.4fr_.6fr]">
          <div className="h-96 rounded-3xl bg-slate-100" />
          <div className="h-96 rounded-3xl bg-slate-100" />
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
