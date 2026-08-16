"use client";

import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
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

function activityTypeLabel(type: ActivityType) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ActivitiesFilterNav({
  selectedType,
}: {
  selectedType?: ActivityType;
}) {
  return (
    <nav aria-label="Filter activities" className="mb-6 flex flex-wrap gap-2">
      {[undefined, ...TYPES].map((type) => {
        const active = type === selectedType;
        const href = (type ? `/activities?type=${type}` : "/activities") as Route;
        return (
          <Link
            key={type ?? "all"}
            href={href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-primary-600 rounded-full border px-3.5 py-2 text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              active
                ? "border-primary-700 bg-primary-700 text-white shadow-xs"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-800",
            )}
          >
            {type ? activityTypeLabel(type) : "All Activities"}
          </Link>
        );
      })}
    </nav>
  );
}
