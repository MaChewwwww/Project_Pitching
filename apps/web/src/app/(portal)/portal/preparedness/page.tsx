"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  Home,
  ListChecks,
  MapPinned,
  Phone,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";

type GoBagResponse = {
  items: { id: string; is_essential: boolean }[];
  checked_item_ids: string[];
};

type FamilyPlan = {
  meeting_point: string | null;
  out_of_area_contact: string | null;
  notes: string | null;
};

export default function PortalPreparednessPage() {
  const goBag = useQuery({
    queryKey: ["me", "go-bag"],
    queryFn: () => api.get<GoBagResponse>("/me/go-bag").then((r) => r.data),
  });

  const plan = useQuery({
    queryKey: ["me", "family-plan"],
    queryFn: () => api.get<FamilyPlan>("/me/family-emergency-plan").then((r) => r.data),
  });

  const goBagTotal = goBag.data?.items.length ?? 12;
  const goBagChecked = goBag.data?.checked_item_ids.length ?? 0;
  const goBagPercent = Math.round((goBagChecked / (goBagTotal || 1)) * 100);

  const hasPlanMeeting = Boolean(plan.data?.meeting_point?.trim());
  const hasPlanContact = Boolean(plan.data?.out_of_area_contact?.trim());
  const planComplete = hasPlanMeeting && hasPlanContact;
  const readinessLoading = goBag.isLoading || plan.isLoading;
  const readinessUnavailable = goBag.isError || plan.isError;

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Backpack}
        title="Preparedness"
        titleAccent="Hub"
        description="Household readiness checklist, family emergency protocols, and official Barangay San Jose disaster survival guides."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>Pre-Disaster Readiness</span>
          </span>
        }
      />

      {/* ── Readiness command band ── */}
      <Card className="overflow-hidden border-emerald-950/20 bg-emerald-950 text-white shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-md">
                <HeartPulse className="size-5" />
              </span>
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-emerald-200 uppercase">
                  Household readiness status
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                  {readinessLoading
                    ? "Loading your household readiness"
                    : readinessUnavailable
                      ? "Review your household readiness"
                      : goBagPercent >= 80 && planComplete
                        ? "Your household is well prepared"
                        : goBagPercent >= 40
                          ? "Your household is partly prepared"
                          : "Start your household readiness plan"}
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-emerald-100/85 sm:text-sm">
                  {readinessUnavailable
                    ? "We could not load one or more saved details. You can still open each tool to review or update it."
                    : "Keep your go-bag and family plan current before an emergency is declared."}
                </p>
              </div>
            </div>
            <span className="self-start rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-black text-emerald-50">
              {goBagPercent >= 80 && planComplete
                ? "Highly prepared"
                : goBagPercent >= 40
                  ? "Partially prepared"
                  : "Needs preparation"}
            </span>
          </div>
          <div className="grid divide-y divide-emerald-100/15 border-t border-emerald-100/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-bold text-emerald-100">
                  <Backpack className="size-4" /> Go-bag supplies
                </span>
                <span className="font-black text-white tabular-nums">
                  {goBagChecked} / {goBagTotal}
                </span>
              </div>
              <MeterBar
                value={goBagChecked}
                max={goBagTotal}
                label="Go-Bag pack meter"
                className="mt-3 h-2.5 rounded-full [&>div]:bg-emerald-300"
              />
              <p className="mt-2 text-[11px] font-medium text-emerald-100/75">
                {goBagPercent}% of your essential items are packed.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-bold text-emerald-100">
                  <MapPinned className="size-4" /> Family plan
                </span>
                <span className="font-black text-white">
                  {planComplete ? "Complete" : "In progress"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-emerald-50">
                <span className="flex items-center gap-1.5">
                  {hasPlanMeeting ? (
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                  ) : (
                    <span className="size-2 rounded-full bg-emerald-200/40" />
                  )}{" "}
                  Meeting point
                </span>
                <span className="flex items-center gap-1.5">
                  {hasPlanContact ? (
                    <CheckCircle2 className="size-3.5 text-emerald-300" />
                  ) : (
                    <span className="size-2 rounded-full bg-emerald-200/40" />
                  )}{" "}
                  Emergency contact
                </span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-emerald-100/75">
                Agree on these details with everyone in your household.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Readiness actions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_0.82fr]">
        {/* Feature 1: Go-Bag Checklist */}
        <Link
          href="/portal/preparedness/go-bag"
          className="group flex min-h-64 flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm sm:p-6"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs transition-transform group-hover:scale-105">
                <Backpack className="size-6" />
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                {goBagPercent}% Packed
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 transition-colors group-hover:text-emerald-800">
              72-Hour Go-Bag Checklist
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              Track drinking water, canned food, medical supplies, flashlight, and
              important documents for quick evacuation.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <span>Open checklist</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Feature 2: Family Emergency Plan */}
        <Link
          href="/portal/preparedness/family-plan"
          className="group flex min-h-64 flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-sm sm:p-6"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-700 shadow-xs transition-transform group-hover:scale-105">
                <Home className="size-6" />
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
                Protocol
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 transition-colors group-hover:text-sky-900">
              Family Emergency Plan
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              Agree on safe assembly points, an out-of-area relative contact number, and
              special medical or pet requirements.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-sky-700">
            <span>Review family plan</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <aside className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <ListChecks className="size-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-neutral-900">Do these next</h3>
              <p className="text-[11px] text-neutral-500">Small steps that matter most</p>
            </div>
          </div>
          <ol className="mt-5 space-y-3">
            <li className="flex gap-2.5 text-xs text-neutral-700">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                1
              </span>
              <span>Pack water, food, medicine, light, and documents.</span>
            </li>
            <li className="flex gap-2.5 text-xs text-neutral-700">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                2
              </span>
              <span>Agree where your family will meet if separated.</span>
            </li>
            <li className="flex gap-2.5 text-xs text-neutral-700">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                3
              </span>
              <span>Keep an out-of-area contact number on hand.</span>
            </li>
          </ol>
          <Link
            href="/guides"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <BookOpen className="size-3.5" /> Read official preparedness guides{" "}
            <ArrowRight className="size-3.5" />
          </Link>
        </aside>
      </div>

      {/* ── 3. Emergency Support Banner ── */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Phone className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase">
              Community Hotline Directory
            </span>
            <p className="text-xs font-bold text-neutral-900">
              Barangay San Jose MDRRMO, Police, Fire, and Ambulance contact numbers
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="self-start rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 sm:self-auto"
        >
          <Link href="/help">View Emergency Hotlines</Link>
        </Button>
      </div>
    </div>
  );
}
