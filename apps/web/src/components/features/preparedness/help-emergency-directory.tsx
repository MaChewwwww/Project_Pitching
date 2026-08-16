"use client";

import * as React from "react";
import { Filter, Phone, Search } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { HotlineList } from "@/components/common/hotline-list";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PublicHotline } from "@/lib/api/public-types";

interface HelpEmergencyDirectoryProps {
  hotlines: PublicHotline[];
}

type FilterCategory =
  | "all"
  | "emergency"
  | "police"
  | "fire"
  | "healthcare"
  | "bhert"
  | "zonal";

const FILTER_CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "All Contacts" },
  { value: "emergency", label: "Emergency & Disaster" },
  { value: "police", label: "Police (PNP)" },
  { value: "fire", label: "Fire Protection (BFP)" },
  { value: "healthcare", label: "Healthcare & Hospitals" },
  { value: "bhert", label: "Barangay Lines" },
  { value: "zonal", label: "Area Lines" },
];

export function HelpEmergencyDirectory({ hotlines }: HelpEmergencyDirectoryProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredHotlines = React.useMemo(() => {
    let list = hotlines;

    if (selectedCategory === "emergency") {
      list = list.filter(
        (h) =>
          ["mdrrmo", "rescue"].includes(h.type) ||
          (h.type === "barangay" && h.label.toLowerCase().includes("emergency")),
      );
    } else if (selectedCategory === "police") {
      list = list.filter((h) => h.type === "police");
    } else if (selectedCategory === "fire") {
      list = list.filter((h) => h.type === "fire");
    } else if (selectedCategory === "healthcare") {
      list = list.filter((h) => ["hospital", "ambulance"].includes(h.type));
    } else if (selectedCategory === "bhert") {
      list = list.filter((h) => h.label.toLowerCase().includes("bhert"));
    } else if (selectedCategory === "zonal") {
      list = list.filter(
        (h) =>
          h.type === "barangay" &&
          !h.label.toLowerCase().includes("bhert") &&
          !h.label.toLowerCase().includes("emergency"),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.label.toLowerCase().includes(q) ||
          h.number.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q),
      );
    }

    return list;
  }, [hotlines, selectedCategory, searchQuery]);

  const counts: Record<FilterCategory, number> = React.useMemo(() => {
    const all = hotlines.length;
    const emergency = hotlines.filter(
      (h) =>
        ["mdrrmo", "rescue"].includes(h.type) ||
        (h.type === "barangay" && h.label.toLowerCase().includes("emergency")),
    ).length;
    const police = hotlines.filter((h) => h.type === "police").length;
    const fire = hotlines.filter((h) => h.type === "fire").length;
    const healthcare = hotlines.filter((h) => ["hospital", "ambulance"].includes(h.type)).length;
    const bhert = hotlines.filter((h) => h.label.toLowerCase().includes("bhert")).length;
    const zonal = hotlines.filter(
      (h) =>
        h.type === "barangay" &&
        !h.label.toLowerCase().includes("bhert") &&
        !h.label.toLowerCase().includes("emergency"),
    ).length;

    return { all, emergency, police, fire, healthcare, bhert, zonal };
  }, [hotlines]);

  const activeOption =
    FILTER_CATEGORIES.find((opt) => opt.value === selectedCategory) ?? FILTER_CATEGORIES[0];

  return (
    <div className="space-y-4 min-w-0">
      {/* Header Row: In an emergency + Filter Select */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700 border-primary-100/80 shadow-sm-card border">
            <Phone aria-hidden className="size-4.5" strokeWidth={2} />
          </span>
          <span className="text-overline font-bold tracking-wider text-primary-700">
            In an emergency
          </span>
        </div>

        {/* Custom Filter Dropdown matching announcements & donation drives pattern */}
        <div className="shrink-0">
          <Select
            value={selectedCategory}
            onValueChange={(val) => setSelectedCategory(val as FilterCategory)}
          >
            <SelectTrigger className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer">
              <Filter aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
              <SelectValue placeholder="Filter category">
                {activeOption.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="end"
              sideOffset={6}
              className="z-50 w-60 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md"
            >
              {FILTER_CATEGORIES.map((option) => {
                const isSelected = selectedCategory === option.value;
                const count = counts[option.value];
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer my-0.5",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                        : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950",
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "ml-2 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-neutral-100 text-neutral-500",
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
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Quick search area or number..."
          className="pl-8.5 h-8.5 text-xs bg-white rounded-xl border-neutral-200 shadow-2xs focus-visible:ring-emerald-500"
        />
      </div>

      {/* Stacked Hotline List */}
      <div className="min-w-0">
        {filteredHotlines.length > 0 ? (
          <HotlineList hotlines={filteredHotlines} layout="stack" />
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-center bg-white">
            <p className="text-xs font-bold text-neutral-800">No matching contacts found</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Try a different keyword or reset the category filter.
            </p>
          </div>
        )}
      </div>

      <Attribution disclaimer="no-rescue-promise" />
    </div>
  );
}
