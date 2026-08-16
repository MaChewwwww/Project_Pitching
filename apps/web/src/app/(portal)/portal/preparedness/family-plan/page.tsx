"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  FileText,
  HeartPulse,
  Home,
  MapPin,
  Phone,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
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
  });

  React.useEffect(() => {
    if (query.data) {
      form.reset({
        meeting_point: query.data.meeting_point || "",
        out_of_area_contact: query.data.out_of_area_contact || "",
        notes: query.data.notes || "",
      });
    }
  }, [query.data, form]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={FileText}
        title="Family Emergency"
        titleAccent="Plan"
        description="Agree on where to meet if separated, who to call outside the area, and important medical or utility instructions before an evacuation."
        backHref="/portal/preparedness"
        backLabel="Back to Preparedness"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>Family Protocol</span>
          </span>
        }
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
          >
            <Printer className="size-3.5" />
            <span>Print Plan</span>
          </Button>
        }
      />

      <form
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        className="space-y-5"
      >
        {/* ── Card 1: Safe Meeting Point ── */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                <MapPin className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Designated Family Meeting Point
                </h2>
                <p className="text-xs text-neutral-500">
                  Where should everyone assemble if flood water cuts off phone signal or
                  your street becomes impassable?
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meeting" className="text-xs font-bold text-neutral-800">
                Assembly Location
              </Label>
              <Input
                id="meeting"
                className="h-11 rounded-xl border-neutral-300 bg-neutral-50 px-3 text-sm focus:border-emerald-500 focus:bg-white"
                placeholder="Halimbawa: Barangay Hall Covered Court, Kasiglahan Annex Gate 2"
                {...form.register("meeting_point")}
              />
              <span className="text-[11px] text-neutral-400">
                Choose a well-known, elevated location nearby that everyone knows how to
                walk to.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Card 2: Out-of-Area Contact ── */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
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
                  relay messages if local lines are congested.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact" className="text-xs font-bold text-neutral-800">
                Contact Person & Phone Number
              </Label>
              <Input
                id="contact"
                className="h-11 rounded-xl border-neutral-300 bg-neutral-50 px-3 text-sm focus:border-emerald-500 focus:bg-white"
                placeholder="Pangalan at Phone Number (e.g. Tito Jun - 0917 123 4567)"
                {...form.register("out_of_area_contact")}
              />
              <span className="text-[11px] text-neutral-400">
                Local cellular towers often jam during storms, but long-distance text
                messages frequently go through.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Card 3: Special Notes & Instructions ── */}
        <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
                <HeartPulse className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Household Medical & Special Instructions
                </h2>
                <p className="text-xs text-neutral-500">
                  Critical information responders or relatives should know about your
                  household.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-neutral-800">
                Special Household Notes
              </Label>
              <Textarea
                id="notes"
                rows={5}
                className="rounded-xl border-neutral-300 bg-neutral-50 p-3 text-sm focus:border-emerald-500 focus:bg-white"
                placeholder="Halimbawa: Insulin storage needs, wheelchair assistance, pet arrangements, main circuit breaker location..."
                {...form.register("notes")}
              />
              <span className="text-[11px] text-neutral-400">
                Include daily prescription maintenance, mobility devices, and emergency
                utility shut-off steps.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Save Action Button ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="h-11 rounded-xl px-6 font-bold shadow-xs text-xs sm:text-sm"
          >
            <Save className="size-4" />
            <span>{saveMutation.isPending ? "Saving Plan…" : "Save Family Plan"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
