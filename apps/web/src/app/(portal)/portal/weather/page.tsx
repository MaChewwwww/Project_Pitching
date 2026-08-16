"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudSun } from "lucide-react";
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
    queryFn: () =>
      api.get<PublicRiverLevel>("/public/weather/river-level").then((r) => r.data),
  });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
          Cached barangay readings
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Weather watch</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Readings are refreshed by scheduled sources, not live from your device. Check
          timestamps before acting on older data.
        </p>
      </div>
      {weather.isLoading || river.isLoading ? (
        <div className="bg-primary-50 h-72 animate-pulse" />
      ) : weather.data && river.data ? (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
          <WeatherPanel weather={weather.data} />
          <RiverLevelPanel river={river.data} weather={weather.data} />
        </div>
      ) : (
        <div className="border-y border-neutral-200 py-12 text-center">
          <CloudSun className="mx-auto size-7 text-neutral-400" />
          <p className="mt-3 text-sm font-bold">
            Weather data is temporarily unavailable
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Use the emergency hotlines for immediate local guidance.
          </p>
        </div>
      )}
    </div>
  );
}
