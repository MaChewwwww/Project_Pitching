"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { HotlineList } from "@/components/common/hotline-list";
import { Input } from "@/components/ui/input";
import type { PublicHotline } from "@/lib/api/public-types";
import { cn } from "@/lib/utils";

interface HotlineDirectoryTabsProps {
  hotlines: PublicHotline[];
}

type TabKey =
  | "all"
  | "emergency"
  | "police"
  | "fire"
  | "healthcare"
  | "bhert"
  | "zonal";

export function HotlineDirectoryTabs({ hotlines }: HotlineDirectoryTabsProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredHotlines = React.useMemo(() => {
    let list = hotlines;

    if (activeTab === "emergency") {
      list = list.filter(
        (h) =>
          ["mdrrmo", "rescue"].includes(h.type) ||
          (h.type === "barangay" && h.label.toLowerCase().includes("emergency")),
      );
    } else if (activeTab === "police") {
      list = list.filter((h) => h.type === "police");
    } else if (activeTab === "fire") {
      list = list.filter((h) => h.type === "fire");
    } else if (activeTab === "healthcare") {
      list = list.filter((h) => ["hospital", "ambulance"].includes(h.type));
    } else if (activeTab === "bhert") {
      list = list.filter((h) => h.label.toLowerCase().includes("bhert"));
    } else if (activeTab === "zonal") {
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
  }, [hotlines, activeTab, searchQuery]);

  const counts: Record<TabKey, number> = React.useMemo(() => {
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

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Hotlines", count: counts.all },
    { key: "emergency", label: "Emergency & Disaster", count: counts.emergency },
    { key: "police", label: "Police (PNP)", count: counts.police },
    { key: "fire", label: "Fire (BFP)", count: counts.fire },
    { key: "healthcare", label: "Healthcare", count: counts.healthcare },
    { key: "bhert", label: "Barangay Lines", count: counts.bhert },
    { key: "zonal", label: "Area Lines", count: counts.zonal },
  ];

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-neutral-100/90 border border-neutral-200/80 shadow-2xs max-w-full">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-white text-emerald-800 shadow-xs ring-1 ring-black/5"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                    isSelected
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-200/80 text-neutral-600",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search area or number..."
            className="pl-9 h-9.5 text-xs bg-white rounded-xl border-neutral-200 shadow-2xs focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Hotline List Grid */}
      {filteredHotlines.length > 0 ? (
        <HotlineList hotlines={filteredHotlines} />
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center bg-white">
          <p className="text-sm font-bold text-neutral-800">No matching hotlines found</p>
          <p className="text-xs text-neutral-500 mt-1">
            Try searching for another area name or department.
          </p>
        </div>
      )}
    </div>
  );
}
