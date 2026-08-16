"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  HeartPulse,
  Home,
  Phone,
  ShieldCheck,
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
    queryFn: () =>
      api.get<FamilyPlan>("/me/family-emergency-plan").then((r) => r.data),
  });

  const goBagTotal = goBag.data?.items.length ?? 12;
  const goBagChecked = goBag.data?.checked_item_ids.length ?? 0;
  const goBagPercent = Math.round((goBagChecked / (goBagTotal || 1)) * 100);

  const hasPlanMeeting = Boolean(plan.data?.meeting_point?.trim());
  const hasPlanContact = Boolean(plan.data?.out_of_area_contact?.trim());
  const planComplete = hasPlanMeeting && hasPlanContact;

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

      {/* ── 1. Household Readiness Overview Strip ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <HeartPulse className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Household Preparation Status
                </h2>
                <p className="text-xs text-neutral-500">
                  Progress on essential supplies and emergency family plan
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-800">
              {goBagPercent >= 80 && planComplete
                ? "Highly Prepared"
                : goBagPercent >= 40
                  ? "Partially Prepared"
                  : "Needs Preparation"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Go-Bag Progress */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-900">Go-Bag Supplies</span>
                <span className="font-black text-sky-950 tabular-nums">
                  {goBagChecked} of {goBagTotal} packed ({goBagPercent}%)
                </span>
              </div>
              <MeterBar
                value={goBagChecked}
                max={goBagTotal}
                label="Go-Bag pack meter"
                className="h-2.5 rounded-full"
              />
            </div>

            {/* Family Plan Status */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Family Plan Details</span>
                <span className="font-black text-emerald-950">
                  {planComplete ? "Complete" : "Incomplete"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-emerald-800">
                <span className="flex items-center gap-1">
                  {hasPlanMeeting ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <span className="size-2 rounded-full bg-slate-300" />
                  )}
                  Meeting Point
                </span>
                <span className="flex items-center gap-1">
                  {hasPlanContact ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <span className="size-2 rounded-full bg-slate-300" />
                  )}
                  Emergency Contact
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Three Main Feature Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Feature 1: Go-Bag Checklist */}
        <Link
          href="/portal/preparedness/go-bag"
          className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform shadow-xs">
                <Backpack className="size-6" />
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                {goBagPercent}% Packed
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
              72-Hour Go-Bag Checklist
            </h3>
            <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
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
          className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-2xs transition-all hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-700 group-hover:scale-105 transition-transform shadow-xs">
                <Home className="size-6" />
              </span>
              <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
                Protocol
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 group-hover:text-sky-900 transition-colors">
              Family Emergency Plan
            </h3>
            <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
              Agree on safe assembly points, an out-of-area relative contact number, and
              special medical or pet requirements.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-sky-700">
            <span>Review family plan</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Feature 3: Official Preparedness Guides */}
        <Link
          href="/guides"
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 group-hover:scale-105 transition-transform shadow-xs">
                <BookOpen className="size-6" />
              </span>
              <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-black text-slate-700">
                Official
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
              Disaster Survival Guides
            </h3>
            <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
              Read official BDRRMC guidance on what to do before, during, and after
              floods, typhoons, and earthquakes.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <span>Read guides</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* ── 3. Emergency Support Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Phone className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
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
          className="self-start sm:self-auto rounded-xl bg-emerald-700 font-bold text-white hover:bg-emerald-800 text-xs"
        >
          <Link href="/help">View Emergency Hotlines</Link>
        </Button>
      </div>
    </div>
  );
}
