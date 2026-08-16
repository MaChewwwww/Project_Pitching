"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FileWarning,
  HeartPulse,
  Map,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
import type { HouseholdDetailOut } from "@/lib/api/registry-types";
import type { MySafetyOut } from "@/lib/api/safety-types";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import { PortalHouseholdMap } from "@/components/features/portal/portal-household-map";
import { HouseholdSafetyLine } from "@/components/features/portal/household-safety-line";

export default function PortalDashboardPage() {
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });
  const events = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((r) => r.data),
  });
  const eventId = events.data?.[0]?.id;
  const safety = useQuery({
    queryKey: ["me", "safety", eventId],
    enabled: Boolean(eventId),
    queryFn: () =>
      api
        .get<MySafetyOut>("/me/safety", { params: { event_id: eventId } })
        .then((r) => r.data),
  });
  if (household.isLoading || !household.data)
    return <div className="bg-primary-50/50 min-h-[52vh] animate-pulse" />;
  const data = household.data;
  const active = events.data ?? [];
  const statuses = Object.fromEntries(
    (safety.data?.household?.members ?? []).map((member) => [
      member.member_id,
      member.status,
    ]),
  );
  return (
    <div className="space-y-8">
      <section
        className={`overflow-hidden rounded-[2rem] border px-5 py-6 shadow-sm sm:px-8 sm:py-8 ${active.length ? "border-danger/25 bg-danger-bg" : "border-primary-900/10 bg-white"}`}
      >
        <p
          className={`text-xs font-extrabold tracking-[.16em] uppercase ${active.length ? "text-danger" : "text-primary-700"}`}
        >
          {active.length ? "Emergency response" : "Household readiness"}
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
              {active.length
                ? active.length === 1
                  ? active[0].name
                  : "Multiple emergency events are active"
                : `Good day, ${data.head_name.split(" ")[0]}.`}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
              {active.length
                ? "Confirm your household’s status. Use rescue only when immediate help is needed."
                : "Keep your household details, preparedness plan and location current."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className={active.length ? "bg-danger hover:bg-danger/90" : undefined}
            >
              <Link href="/portal/safety">
                <ShieldCheck className="size-4" />
                {active.length ? "Check in household" : "View safety status"}
              </Link>
            </Button>
            {active.length ? (
              <Button asChild variant="outline" className="border-danger/25 text-danger">
                <Link href="/portal/rescue">Ask for rescue</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <section className="grid gap-8 xl:grid-cols-[1.2fr_.8fr]">
        <div className="border-primary-900/10 border-y py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
                Household safety line
              </p>
              <h2 className="mt-1 text-xl font-extrabold">{data.reference_no}</h2>
            </div>
            <Link
              href="/portal/household"
              className="text-primary-700 inline-flex items-center gap-1 text-sm font-bold"
            >
              Manage <ArrowRight className="size-4" />
            </Link>
          </div>
          <HouseholdSafetyLine members={data.members} statuses={statuses} />
        </div>
        <div className="border-primary-900/10 border-y py-5">
          <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
            Ready for today
          </p>
          <div className="mt-3 divide-y divide-neutral-200">
            <Link
              href="/portal/preparedness/go-bag"
              className="flex min-h-16 items-center gap-3 py-3"
            >
              <span className="bg-primary-100 text-primary-700 grid size-10 place-items-center rounded-xl">
                <HeartPulse className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Go-bag checklist</span>
                <span className="text-xs text-neutral-500">
                  Review essential supplies
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 text-neutral-400" />
            </Link>
            <Link href="/portal/report" className="flex min-h-16 items-center gap-3 py-3">
              <span className="bg-warning-bg text-warning grid size-10 place-items-center rounded-xl">
                <FileWarning className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Report an incident</span>
                <span className="text-xs text-neutral-500">
                  Share flooding, hazards or obstructions
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 text-neutral-400" />
            </Link>
            <Link
              href="/portal/history"
              className="flex min-h-16 items-center gap-3 py-3"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
                <UsersRound className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Household history</span>
                <span className="text-xs text-neutral-500">
                  See safety, reports and evacuation records
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 text-neutral-400" />
            </Link>
          </div>
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
              Local flood context
            </p>
            <h2 className="mt-1 text-xl font-extrabold">
              Your household on the hazard map
            </h2>
          </div>
          <Link
            href="/portal/hazard-map"
            className="text-primary-700 inline-flex items-center gap-1 text-sm font-bold"
          >
            Open map <Map className="size-4" />
          </Link>
        </div>
        <PortalHouseholdMap household={data} preview />
      </section>
    </div>
  );
}
