"use client";

import * as React from "react";
import { Filter, Phone, Search } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { HotlineList } from "@/components/common/hotline-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface EmergencyHotlinesDialogProps {
  hotlines: PublicHotline[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

export function EmergencyHotlinesDialog({
  hotlines,
  trigger,
  open,
  onOpenChange,
}: EmergencyHotlinesDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl sm:max-w-lg">
        {/* FIXED HEADER (Never scrolls) */}
        <DialogHeader className="p-5 sm:p-6 pb-3.5 border-b border-neutral-100 bg-neutral-50/80 shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <span className="from-red-50 to-red-100 border-red-200 text-rose-700 grid size-11 shrink-0 place-items-center rounded-2xl border shadow-xs">
              <Phone className="size-5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-black text-neutral-900 leading-tight">
                Emergency Hotlines
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-neutral-500 mt-0.5">
                Call directly or click to copy emergency contact numbers for Barangay San Jose.
              </DialogDescription>
            </div>
          </div>

          {/* Search + Filter Dropdown Row */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* Quick Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search area or number..."
                className="pl-8 h-9 text-xs bg-white rounded-full border-neutral-200 shadow-2xs focus-visible:ring-emerald-500"
              />
            </div>

            {/* Category Dropdown Pill */}
            <div className="shrink-0">
              <Select
                value={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val as FilterCategory)}
              >
                <SelectTrigger className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3 py-1 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer">
                  <Filter aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Category">
                    {activeOption.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="end"
                  sideOffset={6}
                  className="z-[2500] w-56 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md"
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
        </DialogHeader>

        {/* SCROLLABLE BODY (Uses custom green scrollbar) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3 custom-scrollbar">
          {filteredHotlines.length > 0 ? (
            <HotlineList hotlines={filteredHotlines} layout="stack" />
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center bg-white my-2">
              <p className="text-xs font-bold text-neutral-800">No matching hotlines found</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Try searching for another area name or reset the category filter.
              </p>
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="border-t border-neutral-100 bg-neutral-50/70 p-3 px-6 text-center text-xs text-neutral-500 shrink-0">
          <Attribution disclaimer="no-rescue-promise" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
