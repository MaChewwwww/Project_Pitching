"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  HeartPulse,
  MapPin,
  Phone,
  Printer,
  Save,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import {
  DetailCardSkeleton,
  FormFieldsSkeleton,
} from "@/components/common/portal-loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api, toDisplayError } from "@/lib/api/client";

type Plan = {
  meeting_point: string | null;
  out_of_area_contact: string | null;
  notes: string | null;
};

export default function PortalFamilyPlanPage() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ["me", "family-plan"],
    queryFn: () => api.get<Plan>("/me/family-emergency-plan").then((r) => r.data),
  });

  const form = useForm<Plan>({
    defaultValues: { meeting_point: "", out_of_area_contact: "", notes: "" },
    values: query.data
      ? {
          meeting_point: query.data.meeting_point || "",
          out_of_area_contact: query.data.out_of_area_contact || "",
          notes: query.data.notes || "",
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: Plan) => api.put("/me/family-emergency-plan", values),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "family-plan"] });
      toast.success("Family emergency plan saved successfully");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail);
    },
  });

  if (query.isFetching) {
    return (
      <div className="space-y-6">
        <DetailCardSkeleton label="Loading family emergency plan" rows={3} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <FormFieldsSkeleton label="Loading family plan fields" fields={6} />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <DetailCardSkeleton
              label="Loading family plan guidance"
              rows={5}
              className="min-h-72"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={FileText}
        title="Family Emergency"
        titleAccent="Plan"
        description="Agree on where to meet if separated, who to call outside the area, and important medical or utility instructions before an evacuation."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Printer aria-hidden className="size-3.5 text-neutral-600" />
              <span>Print Plan</span>
            </Button>
          </div>
        }
      />

      <form
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        className="space-y-6 sm:space-y-8"
      >
        {/* ── 2-Column Responsive Layout ── */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* ── LEFT COLUMN: Protocol Form Fields (7 Cols) ── */}
          <div className="space-y-6 lg:col-span-7">
            {/* Card 1: Safe Meeting Point */}
            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                    <MapPin className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Designated Family Meeting Point
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Where should everyone assemble if flood water cuts off phone signal
                      or your street becomes impassable?
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="meeting" className="text-xs font-bold text-neutral-800">
                    Assembly Location
                  </Label>
                  <Input
                    id="meeting"
                    className="h-11 rounded-xl border-neutral-300 bg-neutral-50/50 px-3 text-sm focus:border-emerald-500 focus:bg-white"
                    placeholder="Halimbawa: Barangay Hall Covered Court, Kasiglahan Annex Gate 2"
                    {...form.register("meeting_point")}
                  />
                  <span className="block pt-0.5 text-[11px] text-neutral-400">
                    Choose a well-known, elevated location nearby that everyone knows how
                    to walk to safely.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Out-of-Area Contact */}
            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 shadow-2xs">
                    <Phone className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Out-of-Area Emergency Contact
                    </h2>
                    <p className="text-xs text-neutral-500">
                      A trusted relative or friend living outside the flood zone who can
                      relay messages if local cell lines are congested.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact" className="text-xs font-bold text-neutral-800">
                    Contact Person & Phone Number
                  </Label>
                  <Input
                    id="contact"
                    className="h-11 rounded-xl border-neutral-300 bg-neutral-50/50 px-3 text-sm focus:border-emerald-500 focus:bg-white"
                    placeholder="Pangalan at Phone Number (e.g. Tito Jun - 0917 123 4567)"
                    {...form.register("out_of_area_contact")}
                  />
                  <span className="block pt-0.5 text-[11px] text-neutral-400">
                    During heavy typhoons, SMS to outside provinces or cities often
                    succeeds when local cellular towers are congested.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Special Notes & Instructions */}
            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
                    <HeartPulse className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Medical & Household Special Instructions
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Critical information emergency responders or relatives should know
                      about your household.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-bold text-neutral-800">
                    Special Household Notes
                  </Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    className="rounded-xl border-neutral-300 bg-neutral-50/50 p-3 text-sm focus:border-emerald-500 focus:bg-white"
                    placeholder="Halimbawa: Insulin storage needs, wheelchair assistance, pet arrangements, main circuit breaker location..."
                    {...form.register("notes")}
                  />
                  <span className="block pt-0.5 text-[11px] text-neutral-400">
                    Include daily prescription maintenance, mobility devices, infant
                    supplies, and pet evacuation plans.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: Family Readiness Guide (5 Cols) ── */}
          <div className="space-y-6 lg:col-span-5">
            {/* Card 1: Family Evacuation Protocol */}
            <Card className="overflow-hidden border-neutral-200/90 bg-white shadow-xs">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      Evacuation Drill Steps
                    </h3>
                    <span className="text-[11px] text-neutral-500">
                      Standard San Jose Household Protocol
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-neutral-600">
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      1
                    </span>
                    <p>
                      <strong className="text-neutral-900">Pre-pack Go-Bags:</strong> Keep
                      bags near the exit when Orange or Red alert is raised.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      2
                    </span>
                    <p>
                      <strong className="text-neutral-900">Utility Shut-Off:</strong>{" "}
                      Switch off the main breaker and turn off the LPG regulator valve.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      3
                    </span>
                    <p>
                      <strong className="text-neutral-900">
                        Notify Out-of-Area Contact:
                      </strong>{" "}
                      Send a single SMS with your destination before departing.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                      4
                    </span>
                    <p>
                      <strong className="text-neutral-900">
                        Check In at Evacuation Center:
                      </strong>{" "}
                      Register all members with the barangay desk upon arrival.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Quick Support Hotline */}
            <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 shadow-2xs">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Zap className="size-4 text-emerald-700" />
                  <span className="text-xs font-black tracking-wider uppercase">
                    Emergency Dispatch
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-600">
                  If any family member is trapped or requires assisted transport during an
                  active typhoon, use the portal&apos;s <strong>Safety Check-in</strong>{" "}
                  or submit a direct rescue ticket.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Form Action Buttons (Unified Bottom Bar) ── */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-neutral-200/80 pt-4 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="h-10 rounded-full border-neutral-300 bg-white px-6 text-xs font-bold text-neutral-700 shadow-2xs hover:bg-neutral-50"
          >
            <Link href="/portal/preparedness">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saveMutation.isPending}
            className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-6 text-xs font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <Save className="size-4" />
            <span>{saveMutation.isPending ? "Saving Plan…" : "Save Family Plan"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
