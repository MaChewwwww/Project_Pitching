"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = [
  { value: "all", label: "All Donation Drives" },
  { value: "active", label: "Active Campaigns" },
  { value: "completed", label: "Past / Completed" },
] as const;

export interface DonationDrivesFilterSelectProps {
  currentStatus?: string;
  className?: string;
}

export function DonationDrivesFilterSelect({
  currentStatus = "all",
  className,
}: DonationDrivesFilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeValue = currentStatus || "all";

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    const queryString = params.toString();
    router.push(queryString ? `/donation-drives?${queryString}` : "/donation-drives");
  };

  const activeOption =
    FILTER_OPTIONS.find((opt) => opt.value === activeValue) ?? FILTER_OPTIONS[0];

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Select value={activeValue} onValueChange={handleValueChange}>
        <SelectTrigger className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer">
          <Filter aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
          <SelectValue placeholder="Filter Drives">
            {activeOption.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="end"
          sideOffset={6}
          className="z-50 w-52 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md"
        >
          {FILTER_OPTIONS.map((option) => {
            const isSelected = activeValue === option.value;
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
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
