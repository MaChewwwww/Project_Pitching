"use client";

import * as React from "react";
import { Filter } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import type { PublicEvacCenter } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

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
}: {
  centers: PublicEvacCenter[];
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
    <div className="flex flex-col gap-6">
      {/* Header filter pills bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 mr-2 flex items-center gap-1.5 shrink-0">
          <Filter className="size-3.5 text-emerald-600" />
          Filter by Area:
        </span>
        {AREAS.map((area) => {
          const count = countsByArea[area] ?? 0;
          const isSelected = selectedArea === area;
          return (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer",
                isSelected
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 border border-neutral-200/60",
              )}
            >
              <span>{area}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "bg-neutral-200 text-neutral-600",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Centers Grid */}
      {filteredCenters.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 items-start">
          {filteredCenters.map((center) => (
            <EvacCenterCard key={center.id} center={center} />
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
