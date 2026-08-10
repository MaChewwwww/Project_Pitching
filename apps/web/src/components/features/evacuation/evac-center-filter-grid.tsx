"use client";

import * as React from "react";
import { Filter } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { EvacCenterCard } from "@/components/features/evacuation/evac-center-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      {/* Header row: Title on left, Custom Dropdown on top-right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-h2 text-neutral-900">Evacuation Centers</h2>
          <p className="text-body text-neutral-600">
            {centers.length} active evacuation centers pinned on the hazard map.
          </p>
        </div>

        {/* Custom Themed Select Dropdown */}
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer">
            <Filter aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
            <SelectValue placeholder="Select Area">
              {selectedArea === "All"
                ? `All Areas (${countsByArea.All ?? 0})`
                : `${selectedArea} (${countsByArea[selectedArea] ?? 0})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="end"
            className="z-50 min-w-[200px] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-1.5 shadow-xl transition-all"
          >
            {AREAS.map((area) => {
              const count = countsByArea[area] ?? 0;
              const isSelected = selectedArea === area;
              const label = area === "All" ? "All Areas" : area;

              return (
                <SelectItem
                  key={area}
                  value={area}
                  className={cn(
                    "relative flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer my-0.5",
                    isSelected
                      ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                      : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950"
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-emerald-100/80 text-emerald-800"
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
