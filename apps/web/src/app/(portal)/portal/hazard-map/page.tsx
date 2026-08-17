"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Button } from "@/components/common/button";
import {
  DetailCardSkeleton,
  MapWorkspaceSkeleton,
  MetricGridSkeleton,
} from "@/components/common/portal-loading";
import { PortalHazardMapView } from "@/components/features/portal/portal-hazard-map-view";
import { api } from "@/lib/api/client";
import type {
  AreaBoundaryFeature,
  PublicFacility,
  PublicRiverLevel,
} from "@/lib/api/public-types";
import type { PublicSiren } from "@/components/features/map/hazard-map-client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";

export default function PortalHazardMapPage() {
  const householdQuery = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const areaBoundariesQuery = useQuery({
    queryKey: ["public", "area-boundaries"],
    queryFn: () =>
      api
        .get<{ type: string; features: AreaBoundaryFeature[] }>("/public/area-boundaries")
        .then((r) => r.data?.features ?? []),
  });

  const facilitiesQuery = useQuery({
    queryKey: ["public", "facilities"],
    queryFn: () =>
      api
        .get<PublicFacility[]>("/public/facilities")
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const sirensQuery = useQuery({
    queryKey: ["public", "sirens"],
    queryFn: () =>
      api
        .get<PublicSiren[]>("/public/sirens")
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const riverQuery = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () => api.get<PublicRiverLevel>("/public/river-level").then((r) => r.data),
  });

  const isLoading =
    householdQuery.isFetching ||
    areaBoundariesQuery.isFetching ||
    facilitiesQuery.isFetching ||
    sirensQuery.isFetching ||
    riverQuery.isFetching;

  const isError =
    householdQuery.isError || areaBoundariesQuery.isError || facilitiesQuery.isError;

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/50 shadow-xs">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="size-8 text-red-600" />
          <h3 className="text-base font-bold text-red-950">
            Could not load flood hazard map
          </h3>
          <p className="max-w-md text-xs text-red-700">
            There was an issue fetching the flood simulation or geographic data. Please
            try again.
          </p>
          <Button
            size="sm"
            onClick={() => {
              void Promise.all([
                householdQuery.refetch(),
                areaBoundariesQuery.refetch(),
                facilitiesQuery.refetch(),
              ]);
            }}
            className="rounded-full bg-red-600 px-5 font-bold text-white hover:bg-red-700"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !householdQuery.data) {
    return (
      <div className="space-y-6">
        <DetailCardSkeleton label="Loading household flood map" rows={3} />
        <MapWorkspaceSkeleton label="Loading flood hazard map" minHeight="37.5rem" />
        <MetricGridSkeleton label="Loading nearby response assets" />
      </div>
    );
  }

  return (
    <PortalHazardMapView
      household={householdQuery.data}
      areaBoundaries={areaBoundariesQuery.data ?? []}
      facilities={facilitiesQuery.data ?? []}
      sirens={sirensQuery.data ?? []}
      river={
        riverQuery.data ?? {
          reading: null,
          alert_level: 0,
          thresholds: null,
          is_stale: false,
          last_known_good: null,
        }
      }
    />
  );
}
