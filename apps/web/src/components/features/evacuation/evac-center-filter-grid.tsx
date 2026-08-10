"use client";

import * as React from "react";
import { ChevronDown, Filter } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import type { PublicEvacCenter } from "@/lib/api/public-types";

const AREAS = [
  "All",
  "Area 1",
  "Area 2",
  "Area 3",
  "Area 4",
  "Area 5",
  "Area 6",
] as const;

export function EvacCenterFilterGrid({
  centers,
  showTypeBadge = false,
}: {
  centers: PublicEvacCenter[];
  showTypeBadge?: boolean;
}) {
  const [selectedArea, setSelectedArea] = React.useState<string>("All");

  const countsByArea = React.useMemo(() => {
    const counts: Record<string, number> = { All: centers.length };
    for (const c of centers) {
      const area = c.facility.area_name;
      if (area) {
        counts[area] = (counts[area] ?? 0) + 1;
      }
    }
    return counts;
  }, [centers]);

  const filteredCenters = React.useMemo(() => {
    if (selectedArea === "All") return centers;
    return centers.filter((c) => c.facility.area_name === selectedArea);
  }, [centers, selectedArea]);

  return (
    <div className="flex flex-col">
      {/* Header row: Title on left, Dropdown on top-right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-h2 text-neutral-900">Evacuation Centers</h2>
          <p className="text-body text-neutral-600">
            {centers.length} active evacuation centers pinned on the hazard map.
          </p>
        </div>

        {/* Dropdown Filter Select */}
        <div className="relative inline-flex items-center shrink-0 w-fit">
          <Filter aria-hidden className="absolute left-3.5 size-3.5 text-emerald-600 pointer-events-none" />
          <select
            aria-label="Filter evacuation centers by Area"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-300 bg-white pl-9 pr-9 py-2 text-xs font-bold text-neutral-800 shadow-xs hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer transition-all min-w-[150px]"
          >
            {AREAS.map((area) => {
              const count = countsByArea[area] ?? 0;
              const label =
                area === "All" ? `All Areas (${count})` : `${area} (${count})`;
              return (
                <option key={area} value={area}>
                  {label}
                </option>
              );
            })}
          </select>
          <ChevronDown aria-hidden className="absolute right-3 size-3.5 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      {/* Centers Grid */}
      {filteredCenters.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 items-start">
          {filteredCenters.map((center) => (
            <EvacCenterCard key={center.id} center={center} showTypeBadge={showTypeBadge} />
          ))}
        </div>
      ) : (
        <div className="py-12 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
          <EmptyState
            title={`No evacuation centers in ${selectedArea}`}
            description={`Currently, no evacuation centers are registered under ${selectedArea}. Select another area above.`}
          />
        </div>
      )}
    </div>
  );
}

