"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { LifeBuoy, ShieldCheck } from "lucide-react";

import { Attribution } from "@/components/common/attribution";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import { useRegistrationDraft } from "@/lib/hooks/use-registration-draft";
import type { RescueRequestAck, RescueRequestPublicIn } from "@/lib/api/safety-types";
import type { LatLng } from "@/components/features/registry/location-picker";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-xl bg-neutral-100 animate-pulse" />,
  },
);

const DRAFT_KEY = "rescue-draft";

const rescueRequestSchema = z
  .object({
    requester_name: z.string().min(1, "Enter your name"),
    contact_number: z.string().optional(),
    description: z.string().min(1, "Describe your situation"),
    people_count: z.string().optional(),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    location_note: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.location && !values.location_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Give a map pin or describe where you are — rescuers need somewhere to go.",
        path: ["location_note"],
      });
    }
  });

type RescueRequestFormValues = z.infer<typeof rescueRequestSchema>;

const DEFAULT_VALUES: RescueRequestFormValues = {
  requester_name: "",
  contact_number: "",
  description: "",
  people_count: undefined,
  location: null,
  location_note: "",
};

export function RescueRequestForm() {
  const [ack, setAck] = React.useState<RescueRequestAck | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<RescueRequestFormValues>({
    resolver: zodResolver(rescueRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const { hasDraft, resume, discard, clearOnSuccess } = useRegistrationDraft(
    DRAFT_KEY,
    form,
  );

  async function onSubmit(values: RescueRequestFormValues) {
    setServerError(null);
    const payload: RescueRequestPublicIn = {
      requester_name: values.requester_name,
      contact_number: values.contact_number || null,
      latitude: values.location?.lat ?? null,
      longitude: values.location?.lng ?? null,
      location_note: values.location_note || null,
      description: values.description,
      people_count: values.people_count ? Number(values.people_count) : null,
    };
    try {
      const response = await api.post<RescueRequestAck>(
        "/public/rescue-requests",
        payload,
      );
      clearOnSuccess();
      setAck(response.data);
    } catch (error) {
      const problem = toDisplayError(error);
      setServerError(
        problem.status === 429
          ? "Too many requests from this connection right now — wait a moment and try again."
          : "Saved on this device — tap Try again when you have signal.",
      );
    }
  }

  if (ack) {
    return (
      <Card radius="xl" className="border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 shadow-md flex flex-col min-w-0">
        <CardContent className="p-5 sm:p-7 flex flex-col gap-5">
          <div className="flex items-start gap-3.5">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-md ring-4 ring-emerald-100">
              <ShieldCheck aria-hidden className="size-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mb-1">
                Dispatch Active
              </span>
              <p className="text-h3 font-extrabold text-emerald-950">Rescue Request Received</p>
              <p className="text-body-sm text-emerald-800 font-medium">Barangay San Jose Emergency Response Team has logged your request.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4 text-xs text-neutral-800 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500 font-medium">Reference ID</span>
              <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {ack.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Received Time</span>
              <span className="font-semibold text-neutral-800">
                {new Date(ack.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-600/10 border border-emerald-200/80 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <LifeBuoy className="size-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              Keep your phone nearby. If flood levels rise, call the emergency hotline directly for immediate 1-click response update.
            </p>
          </div>

          <Attribution disclaimer="no-rescue-promise" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card radius="xl" className="border-neutral-200/90 bg-white shadow-md flex flex-col overflow-hidden">
      {/* Visual Accent Top Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-emerald-600" />
      
      <CardContent className="p-5 sm:p-6 lg:p-7 flex flex-col gap-5">
        {/* Form Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-200 shrink-0 ring-4 ring-rose-50">
              <LifeBuoy aria-hidden className="size-5.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h3 font-extrabold text-neutral-900 tracking-tight">Rescue Dispatch Form</h2>
              </div>
              <p className="text-caption font-medium text-neutral-500 mt-0.5">Submit immediate emergency request to barangay rescue team</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            No Account Needed
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          {hasDraft ? (
            <div className="border-emerald-200 bg-emerald-50/80 flex items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xs">
              <p className="text-xs font-semibold text-emerald-900">
                Unfinished request saved on this device.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button type="button" size="sm" onClick={resume} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs">
                  Resume
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={discard} className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl">
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {/* Section 1: Requester Contact Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-white text-[10px] font-black">1</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">Your Contact Details</h3>
            </div>
            
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="requester_name" className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  Your Name <span className="text-rose-500 font-black">*</span>
                </Label>
                <Input
                  id="requester_name"
                  placeholder="Full Name or Nickname"
                  autoComplete="name"
                  className="h-10 text-xs sm:text-sm rounded-xl border-neutral-200/90 focus:border-emerald-500 focus:ring-emerald-500/20 bg-neutral-50/30"
                  {...register("requester_name")}
                />
                {errors.requester_name ? (
                  <p className="text-danger text-[11px] font-bold">{errors.requester_name.message}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-800">
                  Contact Number <span className="text-neutral-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="contact_number"
                  type="tel"
                  inputMode="tel"
                  placeholder="09XX-XXX-XXXX"
                  autoComplete="tel"
                  className="h-10 text-xs sm:text-sm rounded-xl border-neutral-200/90 focus:border-emerald-500 focus:ring-emerald-500/20 bg-neutral-50/30"
                  {...register("contact_number")}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location Pin & Landmark */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-white text-[10px] font-black">2</span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">Pin Location & Landmark</h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-semibold">Step 2 of 3</span>
            </div>

            <div className="flex flex-col gap-2">
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <LocationPicker
                    value={field.value as LatLng | null}
                    onChange={field.onChange}
                    caption="Drag the pin or tap the map to mark exact rescue spot."
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <Label htmlFor="location_note" className="text-xs font-bold text-neutral-800">
                Landmark / Specific Location Notes
              </Label>
              <Input
                id="location_note"
                placeholder="e.g. Near Wawa bridge, 2nd floor red roof, beside sari-sari store"
                className="h-10 text-xs sm:text-sm rounded-xl border-neutral-200/90 focus:border-emerald-500 focus:ring-emerald-500/20 bg-neutral-50/30"
                {...register("location_note")}
              />
              {errors.location_note ? (
                <p className="text-danger text-[11px] font-bold">{errors.location_note.message}</p>
              ) : null}
            </div>
          </div>

          {/* Section 3: Situation Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-white text-[10px] font-black">3</span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">Situation & Triage</h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-semibold">Final Step</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description" className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  What&apos;s Happening <span className="text-rose-500 font-black">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Describe flood water level, trapped family members, seniors/children, or urgent medical needs..."
                  className="text-xs sm:text-sm rounded-xl border-neutral-200/90 focus:border-emerald-500 focus:ring-emerald-500/20 bg-neutral-50/30 resize-none"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className="text-danger text-[11px] font-bold">{errors.description.message}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="people_count" className="text-xs font-bold text-neutral-800">
                  People Needing Rescue
                </Label>
                <Input
                  id="people_count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  placeholder="e.g. 3"
                  className="h-10 text-xs sm:text-sm rounded-xl border-neutral-200/90 focus:border-emerald-500 focus:ring-emerald-500/20 bg-neutral-50/30"
                  {...register("people_count")}
                />
                <span className="text-[10.5px] text-neutral-400 font-medium">Estimated count</span>
              </div>
            </div>
          </div>

          {/* Submit Action Section */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col gap-3">
            {serverError ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {serverError}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-xs sm:text-sm font-extrabold uppercase tracking-wider rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/25 hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              <LifeBuoy aria-hidden className="size-5 shrink-0 animate-spin-slow" />
              {isSubmitting ? "Transmitting Dispatch Request…" : serverError ? "Try Submitting Again" : "Send Emergency Rescue Request"}
            </Button>

            <p className="text-[11px] text-center text-neutral-400 font-medium">
              Submitting logs an immediate triage pin for Barangay San Jose emergency response boats and staff.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
