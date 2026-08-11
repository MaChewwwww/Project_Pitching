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
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { MeterBar } from "@/components/common/meter-bar";
import { HazardMap } from "@/components/features/map/hazard-map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ALL_FACILITY_TYPES: FacilityType[] = FACILITY_TYPES.map((t) => t.type);

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
  // 1. Map Pin Checkbox Filter State (controls Leaflet Map pins ONLY)
  const [selectedMapTypes, setSelectedMapTypes] = React.useState<Set<FacilityType>>(
    () => new Set(ALL_FACILITY_TYPES)
  );

  const toggleMapType = React.useCallback((type: FacilityType) => {
    setSelectedMapTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleAllMapTypes = React.useCallback(() => {
    setSelectedMapTypes((prev) => {
      if (prev.size === ALL_FACILITY_TYPES.length) {
        return new Set();
      } else {
        return new Set(ALL_FACILITY_TYPES);
      }
    });
  }, []);

  // 2. Directory Cards Dropdown Filter State (controls Directory Cards grid ONLY)
  const [directoryFilter, setDirectoryFilter] = React.useState<string>("all");

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

  // Map Pins (filtered strictly by selectedMapTypes checkboxes)
  const mapFacilities = React.useMemo(() => {
    const filteredMapItems = selectedMapTypes.size === ALL_FACILITY_TYPES.length
      ? unifiedItems
      : selectedMapTypes.size === 0
      ? []
      : unifiedItems.filter((item) => selectedMapTypes.has(item.type));

    return filteredMapItems.map((item) => ({
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
  }, [unifiedItems, selectedMapTypes]);

  // Directory Cards (filtered strictly by directoryFilter dropdown)
  const directoryItems = React.useMemo(() => {
    if (directoryFilter === "all") return unifiedItems;
    return unifiedItems.filter((item) => item.type === directoryFilter);
  }, [unifiedItems, directoryFilter]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Main Split Section: Left Column = Map, Right Column = Metrics */}
      <section aria-label="Facilities Map and Metrics Overview">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          {/* LEFT COLUMN: Interactive Leaflet Map (Vertically taller, no flood hazard, no map overlays) */}
          <div className="relative h-[500px] sm:h-[540px] lg:h-[580px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <HazardMap
              className="h-full w-full min-h-[500px]"
              center={[14.7435, 121.1305]}
              zoom={14.15}
              facilities={mapFacilities}
              areaBoundaries={areaBoundaries}
              areaStats={[]}
              sirens={[]}
              showHazardLayer={false}
            />
          </div>

          {/* RIGHT COLUMN: Merged Metrics & Checkbox Filter Sidebar (Equal height to map container) */}
          <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm flex flex-col lg:w-80 lg:shrink-0 lg:h-[580px] overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-3.5 h-full overflow-y-auto">
              {/* Facility Overview Header */}
              <div className="flex flex-col gap-2 rounded-xl bg-neutral-50/80 border border-neutral-200/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-overline inline-flex items-center gap-1.5 font-bold uppercase text-neutral-500">
                    <Building2 className="size-3.5 text-emerald-600" />
                    Facility Overview
                  </span>
                  <span className="text-[10.5px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {selectedMapTypes.size} {selectedMapTypes.size === 1 ? "type" : "types"} on map
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex flex-col">
                    <span className="text-h2 font-black text-neutral-900 tabular leading-tight">
                      {mapFacilities.length} {mapFacilities.length === 1 ? "Facility" : "Facilities"}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500">
                      Visible on map
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-body-sm font-bold text-neutral-700 tabular">
                      {unifiedItems.length} Total
                    </span>
                    <span className="text-[10.5px] font-medium text-neutral-400">
                      registered
                    </span>
                  </div>
                </div>
              </div>

              {/* Facilities per Type Checkbox Filter List */}
              <div className="flex flex-col gap-2.5 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <span className="text-overline font-bold uppercase tracking-wider text-neutral-500">
                    Facilities per Type
                  </span>
                  <button
                    type="button"
                    onClick={toggleAllMapTypes}
                    className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    {selectedMapTypes.size === ALL_FACILITY_TYPES.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5">
                  {FACILITY_TYPES.map((cfg) => {
                    const count = countsPerType.get(cfg.type) ?? 0;
                    const isChecked = selectedMapTypes.has(cfg.type);
                    const Icon = cfg.icon;

                    return (
                      <label
                        key={cfg.type}
                        className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors duration-150 cursor-pointer border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-100/80 select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMapType(cfg.type)}
                            className="size-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500/20 accent-emerald-600 cursor-pointer shrink-0"
                          />
                          <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />
                          <Icon className={cn("size-3.5 shrink-0", cfg.color)} />
                          <span className="truncate text-[11.5px] font-semibold text-neutral-800">{cfg.label}</span>
                        </div>
                        <span className="rounded-full px-2 py-0.2 text-[10.5px] font-black tabular shrink-0 bg-neutral-200/80 text-neutral-800">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Directory Grid Section */}
      <section className="flex flex-col gap-4 pt-2">
        {/* Section Header: Title on Left, Custom Dropdown Selector on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-h2 font-bold text-neutral-900">
              {directoryFilter === "all"
                ? "All Barangay Facilities"
                : (FACILITY_TYPES.find((t) => t.type === directoryFilter)?.label ?? "Facilities")}
            </h2>
            <p className="text-caption font-medium text-neutral-500">
              Showing {directoryItems.length} of {unifiedItems.length} facilities across Barangay San Jose
            </p>
          </div>

          {/* Custom Dropdown Selector (Controls Directory Cards Grid ONLY) */}
          <Select value={directoryFilter} onValueChange={setDirectoryFilter}>
            <SelectTrigger className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer">
              <Filter aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
              <SelectValue placeholder="Filter Facility Type">
                {directoryFilter === "all"
                  ? `All Facilities (${unifiedItems.length})`
                  : `${FACILITY_TYPES.find((t) => t.type === directoryFilter)?.label} (${directoryItems.length})`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="end"
              sideOffset={6}
              className="z-50 w-56 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md"
            >
              <SelectItem
                value="all"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer my-0.5",
                  directoryFilter === "all"
                    ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                    : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950"
                )}
              >
                <span>All Facilities</span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ml-auto",
                    directoryFilter === "all"
                      ? "bg-white/25 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {unifiedItems.length}
                </span>
              </SelectItem>

              {FACILITY_TYPES.map((cfg) => {
                const count = countsPerType.get(cfg.type) ?? 0;
                const isSelected = directoryFilter === cfg.type;
                const Icon = cfg.icon;

                return (
                  <SelectItem
                    key={cfg.type}
                    value={cfg.type}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer my-0.5",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                        : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-white" : cfg.color)} />
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ml-auto",
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-neutral-100 text-neutral-600"
                      )}
                    >
                      {count}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {directoryItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {directoryItems.map((item) => (
              <FacilityUnifiedCard key={item.id} facility={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No facilities found"
            description="No facilities match the selected directory filter."
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
