"use client";

import * as React from "react";
import {
  BedDouble,
  Building2,
  Compass,
  Filter,
  Flame,
  Hospital as HospitalIcon,
  LifeBuoy,
  MapPin,
  Navigation,
  Phone,
  Search,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { MeterBar } from "@/components/common/meter-bar";
import { HazardMap } from "@/components/features/map/hazard-map";
import { formatNumber, googleMapsDirectionsUrl, osmDirectionsUrl, toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AreaBoundaryFeature,
  FacilityType,
  PublicEvacCenter,
  PublicFacility,
  PublicHotline,
} from "@/lib/api/public-types";

export interface UnifiedFacilityItem extends PublicFacility {
  evacCenter?: PublicEvacCenter;
}

export const FACILITY_TYPES: {
  type: FacilityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  dot: string;
}[] = [
  {
    type: "evacuation_center",
    label: "Evacuation Centers",
    icon: BedDouble,
    color: "text-emerald-700",
    bg: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
    dot: "bg-emerald-500",
  },
  {
    type: "clinic",
    label: "Health Clinics & Outposts",
    icon: Stethoscope,
    color: "text-teal-700",
    bg: "bg-teal-100/90 text-teal-800 border-teal-300/80",
    dot: "bg-teal-500",
  },
  {
    type: "hospital",
    label: "Hospitals",
    icon: HospitalIcon,
    color: "text-rose-700",
    bg: "bg-rose-100/90 text-rose-800 border-rose-300/80",
    dot: "bg-rose-500",
  },
  {
    type: "police",
    label: "Police Stations",
    icon: Shield,
    color: "text-indigo-700",
    bg: "bg-indigo-100/90 text-indigo-800 border-indigo-300/80",
    dot: "bg-indigo-500",
  },
  {
    type: "fire",
    label: "Fire Stations",
    icon: Flame,
    color: "text-amber-700",
    bg: "bg-amber-100/90 text-amber-800 border-amber-300/80",
    dot: "bg-amber-500",
  },
  {
    type: "rescue_station",
    label: "Rescue Stations",
    icon: LifeBuoy,
    color: "text-orange-700",
    bg: "bg-orange-100/90 text-orange-800 border-orange-300/80",
    dot: "bg-orange-500",
  },
  {
    type: "barangay_hall",
    label: "Barangay Hall",
    icon: Building2,
    color: "text-blue-700",
    bg: "bg-blue-100/90 text-blue-800 border-blue-300/80",
    dot: "bg-blue-500",
  },
];

export interface BarangayFacilitiesViewProps {
  facilities: PublicFacility[];
  evacCenters: PublicEvacCenter[];
  areaBoundaries: AreaBoundaryFeature[];
  hotlines: PublicHotline[];
}

export function BarangayFacilitiesView({
  facilities,
  evacCenters,
  areaBoundaries,
  hotlines,
}: BarangayFacilitiesViewProps) {
  const [selectedType, setSelectedType] = React.useState<"all" | FacilityType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Build unified facility list
  const unifiedItems = React.useMemo(() => {
    const evacMap = new Map<string, PublicEvacCenter>();
    for (const c of evacCenters) {
      if (c.facility?.id) evacMap.set(c.facility.id, c);
      evacMap.set(c.id, c);
    }

    const items: UnifiedFacilityItem[] = [];
    const seenIds = new Set<string>();

    for (const f of facilities) {
      items.push({
        ...f,
        evacCenter: evacMap.get(f.id),
      });
      seenIds.add(f.id);
    }

    // Also include any evac center facility not present in facilities list
    for (const c of evacCenters) {
      if (c.facility && !seenIds.has(c.facility.id)) {
        items.push({
          ...c.facility,
          evacCenter: c,
        });
        seenIds.add(c.facility.id);
      }
    }

    return items;
  }, [facilities, evacCenters]);

  // Counts per facility type
  const countsPerType = React.useMemo(() => {
    const map = new Map<FacilityType, number>();
    for (const item of unifiedItems) {
      map.set(item.type, (map.get(item.type) ?? 0) + 1);
    }
    return map;
  }, [unifiedItems]);

  // Evacuation readiness metrics
  const evacStats = React.useMemo(() => {
    const totalCenters = evacCenters.length;
    const openCenters = evacCenters.filter((c) => c.is_open).length;
    const totalCapacity = evacCenters.reduce((sum, c) => sum + (c.capacity ?? 0), 0);
    const totalOccupancy = evacCenters.reduce((sum, c) => sum + c.occupancy, 0);

    return { totalCenters, openCenters, totalCapacity, totalOccupancy };
  }, [evacCenters]);

  // Filtered facilities
  const filteredItems = React.useMemo(() => {
    return unifiedItems.filter((item) => {
      const matchesType = selectedType === "all" || item.type === selectedType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.area_name && item.area_name.toLowerCase().includes(q)) ||
        item.type.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [unifiedItems, selectedType, searchQuery]);

  // Facility markers for map
  const mapFacilities = React.useMemo(() => {
    return filteredItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      address: item.address,
      contact_number: item.contact_number,
      location: item.location,
      area_id: item.area_id,
      area_name: item.area_name,
      capacity: item.evacCenter?.capacity,
    }));
  }, [filteredItems]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="size-5 text-emerald-700 shrink-0" />
            <h2 className="text-h3 font-bold text-neutral-900">Filter Facilities</h2>
            <span className="text-caption font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200/80 ml-1">
              {filteredItems.length} {filteredItems.length === 1 ? "facility" : "facilities"}
            </span>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search facilities or areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-9 pr-4 py-2 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer",
              selectedType === "all"
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                : "border-neutral-200/90 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
            )}
          >
            <span>All Facilities</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                selectedType === "all" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-800"
              )}
            >
              {unifiedItems.length}
            </span>
          </button>

          {FACILITY_TYPES.map((cfg) => {
            const count = countsPerType.get(cfg.type) ?? 0;
            const isSelected = selectedType === cfg.type;
            const Icon = cfg.icon;

            return (
              <button
                key={cfg.type}
                type="button"
                onClick={() => setSelectedType(isSelected ? "all" : cfg.type)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                    : "border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-white" : cfg.color)} />
                <span>{cfg.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                    isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Section: Left Column = Map, Right Column = Metrics */}
      <section aria-label="Facilities Map and Metrics Overview">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          {/* LEFT COLUMN: Interactive Leaflet Map (Vertically taller, no flood hazard, no map overlays) */}
          <div className="relative h-[500px] sm:h-[540px] lg:h-[580px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <HazardMap
              className="h-full w-full min-h-[500px]"
              center={[14.7415, 121.1315]}
              zoom={13.6}
              facilities={mapFacilities}
              areaBoundaries={areaBoundaries}
              areaStats={[]}
              sirens={[]}
              showHazardLayer={false}
            />
          </div>

          {/* RIGHT COLUMN: Metrics Sidebar (Equal height to map container) */}
          <div className="flex flex-col gap-3 lg:w-80 lg:shrink-0 lg:h-[580px]">
            {/* Metric Card 1: Facility & Evacuation Overview */}
            <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm shrink-0">
              <CardContent className="p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-overline inline-flex items-center gap-1.5 font-bold uppercase text-neutral-500">
                    <Building2 className="size-4 text-emerald-600" />
                    Facility Overview
                  </span>
                  <span className="text-h3 font-black text-neutral-900 tabular">
                    {unifiedItems.length} <span className="text-caption font-semibold text-neutral-500">total</span>
                  </span>
                </div>

                {evacStats.totalCenters > 0 && (
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex flex-col">
                      <span className="text-overline inline-flex items-center gap-1.5 font-bold uppercase text-emerald-800">
                        <BedDouble className="size-3.5 text-emerald-600" />
                        Evacuation
                      </span>
                      <span className="text-caption font-semibold text-neutral-600">
                        {evacStats.openCenters} of {evacStats.totalCenters} open
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-body-sm font-black text-emerald-950 tabular">
                        {formatNumber(evacStats.totalCapacity)}
                      </span>
                      <span className="text-[10.5px] font-medium text-emerald-800">
                        total capacity
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metric Card 2: Facilities per Type List */}
            <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm flex-1 overflow-hidden">
              <CardContent className="p-3.5 flex flex-col gap-2.5 h-full overflow-y-auto">
                <span className="text-overline font-bold uppercase tracking-wider text-neutral-500">
                  Facilities per Type
                </span>

                <div className="flex flex-col gap-1">
                  {FACILITY_TYPES.map((cfg) => {
                    const count = countsPerType.get(cfg.type) ?? 0;
                    const isSelected = selectedType === cfg.type;
                    const Icon = cfg.icon;

                    return (
                      <button
                        key={cfg.type}
                        type="button"
                        onClick={() => setSelectedType(isSelected ? "all" : cfg.type)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-all duration-200 cursor-pointer border text-left",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-950 shadow-2xs"
                            : "border-neutral-100 bg-neutral-50/60 font-medium text-neutral-700 hover:bg-neutral-100/80"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />
                          <Icon className={cn("size-3.5 shrink-0", cfg.color)} />
                          <span className="truncate text-[11.5px]">{cfg.label}</span>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.2 text-[10.5px] font-black tabular shrink-0",
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-neutral-200/80 text-neutral-800"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Directory Grid Section */}
      <section className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <h2 className="text-h2 font-bold text-neutral-900">
            {selectedType === "all"
              ? "All Barangay Facilities"
              : (FACILITY_TYPES.find((t) => t.type === selectedType)?.label ?? "Facilities")}
          </h2>
          <span className="text-caption font-semibold text-neutral-500">
            Showing {filteredItems.length} of {unifiedItems.length}
          </span>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <FacilityUnifiedCard key={item.id} facility={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No facilities found"
            description="No facilities match the selected type or search filter."
          />
        )}
      </section>

      {/* Hotline Footer */}
      <div className="border-t border-neutral-200 pt-6">
        <p className="text-overline mb-3 text-neutral-500 font-bold uppercase">
          Emergency Call Lines — San Jose Disaster Risk Management
        </p>
        <HotlineList hotlines={hotlines} />
      </div>
    </div>
  );
}

function FacilityUnifiedCard({ facility }: { facility: UnifiedFacilityItem }) {
  const [lon, lat] = facility.location.coordinates;
  const cfg = FACILITY_TYPES.find((t) => t.type === facility.type) ?? FACILITY_TYPES[0];
  const Icon = cfg.icon;
  const evac = facility.evacCenter;

  const gmapsUrl = googleMapsDirectionsUrl(lon, lat, facility.name);
  const osmUrl = osmDirectionsUrl(lon, lat);

  const evacTone = evac?.is_at_capacity
    ? "danger"
    : (evac?.occupancy_pct ?? 0) > 75
    ? "warning"
    : "primary";

  return (
    <Card
      radius="xl"
      className="group relative flex flex-col justify-between overflow-hidden border border-neutral-200/90 bg-white transition-all duration-200 hover:shadow-md hover:border-emerald-400"
    >
      <div className={cn("h-1.5 w-full", cfg.dot)} />

      <CardContent className="flex flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span
              className={cn(
                "text-[10px] font-extrabold uppercase tracking-wider border px-2 py-0.5 rounded-md shrink-0 shadow-2xs inline-flex items-center gap-1",
                cfg.bg
              )}
            >
              <Icon className="size-3 shrink-0" />
              {cfg.label}
            </span>

            {facility.area_name && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
                {facility.area_name}
              </span>
            )}
          </div>

          <h3 className="text-h3 group-hover:text-emerald-800 font-bold text-neutral-900 transition-colors leading-snug">
            {facility.name}
          </h3>
        </div>

        {/* Address */}
        {facility.address ? (
          <span className="text-body-sm inline-flex items-start gap-1.5 font-medium text-neutral-600">
            <MapPin aria-hidden className="text-emerald-600 mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{facility.address}</span>
          </span>
        ) : null}

        {/* Phone Contact */}
        {facility.contact_number ? (
          <a
            href={toTelHref(facility.contact_number)}
            className="text-body-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1.5 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Phone className="size-3.5 shrink-0 text-emerald-600" />
            <span>{facility.contact_number}</span>
          </a>
        ) : null}

        {/* Evacuation Center Occupancy (if applicable) */}
        {evac && evac.capacity != null ? (
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 mt-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-overline inline-flex items-center gap-1.5 font-bold tracking-wider text-neutral-600">
                <Users aria-hidden className="text-emerald-600 size-3.5" />
                Capacity
              </span>
              <span className="text-body-sm tabular font-bold text-neutral-900">
                {formatNumber(evac.occupancy)}{" "}
                <span className="font-normal text-neutral-500">
                  / {formatNumber(evac.capacity)} people
                </span>
              </span>
            </div>
            <MeterBar
              value={evac.occupancy}
              max={evac.capacity}
              tone={evacTone}
              label={`Occupancy at ${facility.name}`}
              valueText={`${evac.occupancy} of ${evac.capacity} people`}
            />
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Navigation aria-hidden className="size-3.5 fill-white/20 shrink-0" />
            Directions
          </a>

          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none shrink-0"
            title="Open on OpenStreetMap"
          >
            <Compass aria-hidden className="size-3.5 shrink-0" />
            OSM
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
