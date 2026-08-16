"use client";

import { ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import type { MemberOut } from "@/lib/api/registry-types";

const statusStyle = {
  safe: "bg-success text-white",
  needs_rescue: "bg-danger text-white",
  unaccounted: "bg-neutral-200 text-neutral-700",
} as const;

export function HouseholdSafetyLine({
  members,
  statuses = {},
}: {
  members: MemberOut[];
  statuses?: Record<string, "safe" | "needs_rescue" | "unaccounted">;
}) {
  return (
    <ol className="before:bg-primary-200 relative space-y-0 before:absolute before:top-4 before:bottom-4 before:left-5 before:w-px sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-x-6 sm:before:top-8 sm:before:right-8 sm:before:bottom-auto sm:before:left-8 sm:before:h-px sm:before:w-auto">
      {members.map((member) => {
        const status = statuses[member.id] ?? "unaccounted";
        return (
          <li
            key={member.id}
            className="relative flex min-h-16 items-center gap-3 py-2 sm:flex-col sm:items-start sm:pt-0"
          >
            <span
              className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-[#f7faf7] ${statusStyle[status]}`}
            >
              {status === "safe" ? (
                <ShieldCheck className="size-5" />
              ) : status === "needs_rescue" ? (
                <ShieldAlert className="size-5" />
              ) : (
                <UserRound className="size-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-neutral-900">
                {member.full_name}
              </span>
              <span className="block text-xs text-neutral-500">
                {member.is_head
                  ? "Household head"
                  : (member.relationship_to_head ?? "Household member")}
              </span>
              <span className="mt-0.5 block text-[11px] font-bold text-neutral-600 capitalize">
                {status.replace("_", " ")}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
