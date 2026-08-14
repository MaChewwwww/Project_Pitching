"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

import { Button } from "@/components/common/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { HouseholdOut } from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";

interface SearchableHouseholdSelectProps {
  households: HouseholdOut[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableHouseholdSelect({
  households,
  value,
  onChange,
  placeholder = "Choose a Household",
  disabled = false,
}: SearchableHouseholdSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedHousehold = households.find((item) => item.id === value);

  const filteredHouseholds = React.useMemo(() => {
    if (!search.trim()) return households;
    const term = search.toLowerCase().trim();
    return households.filter(
      (item) =>
        item.reference_no.toLowerCase().includes(term) ||
        item.head_name.toLowerCase().includes(term) ||
        (item.area_name && item.area_name.toLowerCase().includes(term)),
    );
  }, [households, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          variant="outline"
          className="h-10 min-w-0 justify-between border-emerald-200/80 bg-white px-3.5 text-sm font-medium text-neutral-900 shadow-2xs hover:bg-neutral-50 sm:w-[460px]"
        >
          {selectedHousehold ? (
            <span className="truncate font-medium text-neutral-900">
              <b className="font-bold text-neutral-950">{selectedHousehold.reference_no}</b> ·{" "}
              {selectedHousehold.head_name} ·{" "}
              <span className="text-emerald-700">{selectedHousehold.area_name ?? "San Jose"}</span>
            </span>
          ) : (
            <span className="text-neutral-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-[460px] p-0 shadow-xl sm:w-[460px]"
      >
        <div className="flex flex-col overflow-hidden rounded-lg bg-white">
          {/* Search Box */}
          <div className="flex items-center border-b border-neutral-100 px-3 py-2">
            <Search className="mr-2 size-4 shrink-0 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search household #, head, or area..."
              className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              autoFocus
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="cursor-pointer rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* List Options */}
          <div className="max-h-64 overflow-y-auto p-1 text-xs">
            {filteredHouseholds.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500">
                No matching households found.
              </div>
            ) : (
              filteredHouseholds.map((household) => {
                const isSelected = household.id === value;
                return (
                  <button
                    key={household.id}
                    type="button"
                    onClick={() => {
                      onChange(household.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-emerald-50 text-emerald-900 font-semibold"
                        : "hover:bg-neutral-100/80 text-neutral-800",
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs">
                        <span className="font-bold text-neutral-950">{household.reference_no}</span> ·{" "}
                        <span className="font-semibold text-neutral-800">{household.head_name}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {household.area_name ?? "San Jose"} · {household.member_count} member(s)
                      </p>
                    </div>
                    {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
