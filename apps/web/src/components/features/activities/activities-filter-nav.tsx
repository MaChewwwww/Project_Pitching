"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityType } from "@/lib/api/public-types";

const TYPES = [
  "drill",
  "seminar",
  "first_aid",
  "cleanup",
  "tree_planting",
  "ngo_program",
  "other",
] as const;

export type ActivityStatus = "all" | "upcoming" | "past";

function activityTypeLabel(type: ActivityType) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ActivitiesFilterNav({
  selectedType,
  selectedStatus,
}: {
  selectedType?: ActivityType;
  selectedStatus: ActivityStatus;
}) {
  const router = useRouter();

  function activityHref(type?: ActivityType, status = selectedStatus) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status !== "all") params.set("status", status);
    const query = params.toString();
    return `/activities${query ? `?${query}` : ""}` as Route;
  }

  return (
    <nav
      aria-label="Filter activities"
      className="mb-6 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex flex-wrap gap-2">
        {[undefined, ...TYPES].map((type) => {
          const active = type === selectedType;
          return (
            <Link
              key={type ?? "all"}
              href={activityHref(type)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-visible:ring-primary-600 rounded-full border px-3.5 py-2 text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-primary-700 bg-primary-700 text-white shadow-xs"
                  : "hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-800 border-neutral-200 bg-white text-neutral-700",
              )}
            >
              {type ? activityTypeLabel(type) : "All Activities"}
            </Link>
          );
        })}
      </div>

      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          router.push(activityHref(selectedType, value as ActivityStatus))
        }
      >
        <SelectTrigger
          aria-label="Filter by activity status"
          className="border-primary-600/30 hover:border-primary-600 hover:bg-primary-50/50 h-9 rounded-full bg-white px-3.5 text-xs font-bold text-neutral-800"
        >
          <CalendarDays aria-hidden className="text-primary-700 size-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All activity reports</SelectItem>
          <SelectItem value="upcoming">Upcoming activities</SelectItem>
          <SelectItem value="past">Past activities</SelectItem>
        </SelectContent>
      </Select>
    </nav>
  );
}
