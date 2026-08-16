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
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-100" />
    ),
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

export function RescueRequestForm({
  endpoint = "/public/rescue-requests",
}: {
  endpoint?: string;
}) {
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
      const response = await api.post<RescueRequestAck>(endpoint, payload);
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
      <Card
        radius="xl"
        className="flex min-w-0 flex-col border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 shadow-md"
      >
        <CardContent className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100">
              <ShieldCheck aria-hidden className="size-6" />
            </div>
            <div>
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10.5px] font-black tracking-wider text-emerald-800 uppercase">
                Dispatch Active
              </span>
              <p className="text-h3 font-extrabold text-emerald-950">
                Rescue Request Received
              </p>
              <p className="text-body-sm font-medium text-emerald-800">
                Barangay San Jose Emergency Response Team has logged your request.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-white/90 p-4 text-xs text-neutral-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="font-medium text-neutral-500">Reference ID</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-sm font-black text-emerald-900">
                {ack.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-500">Received Time</span>
              <span className="font-semibold text-neutral-800">
                {new Date(ack.received_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-600/10 p-3.5 text-xs text-emerald-900">
            <LifeBuoy className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed font-medium">
              Keep your phone nearby. If flood levels rise, call the emergency hotline
              directly for immediate 1-click response update.
            </p>
          </div>

          <Attribution disclaimer="no-rescue-promise" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      radius="xl"
      className="flex flex-col overflow-hidden border-neutral-200/90 bg-white shadow-md"
    >
      {/* Visual Accent Top Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-emerald-600" />

      <CardContent className="flex flex-col gap-5 p-5 sm:p-6 lg:p-7">
        {/* Form Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-500 text-white shadow-md ring-4 shadow-rose-200 ring-rose-50">
              <LifeBuoy aria-hidden className="size-5.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h3 font-extrabold tracking-tight text-neutral-900">
                  Rescue Dispatch Form
                </h2>
              </div>
              <p className="text-caption mt-0.5 font-medium text-neutral-500">
                Submit immediate emergency request to barangay rescue team
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800 sm:self-auto">
            <span className="size-2 shrink-0 animate-ping rounded-full bg-emerald-500" />
            No Account Needed
          </span>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          {hasDraft ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-2xs">
              <p className="text-xs font-semibold text-emerald-900">
                Unfinished request saved on this device.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={resume}
                  className="rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                >
                  Resume
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={discard}
                  className="rounded-xl border-emerald-300 text-xs text-emerald-800 hover:bg-emerald-100"
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {/* Section 1: Requester Contact Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-[10px] font-black text-white">
                1
              </span>
              <h3 className="text-xs font-extrabold tracking-wider text-neutral-800 uppercase">
                Your Contact Details
              </h3>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="requester_name"
                  className="flex items-center gap-1 text-xs font-bold text-neutral-800"
                >
                  Your Name <span className="font-black text-rose-500">*</span>
                </Label>
                <Input
                  id="requester_name"
                  placeholder="Full Name or Nickname"
                  autoComplete="name"
                  className="h-10 rounded-xl border-neutral-200/90 bg-neutral-50/30 text-xs focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm"
                  {...register("requester_name")}
                />
                {errors.requester_name ? (
                  <p className="text-danger text-[11px] font-bold">
                    {errors.requester_name.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="contact_number"
                  className="text-xs font-bold text-neutral-800"
                >
                  Contact Number{" "}
                  <span className="font-normal text-neutral-400">(optional)</span>
                </Label>
                <Input
                  id="contact_number"
                  type="tel"
                  inputMode="tel"
                  placeholder="09XX-XXX-XXXX"
                  autoComplete="tel"
                  className="h-10 rounded-xl border-neutral-200/90 bg-neutral-50/30 text-xs focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm"
                  {...register("contact_number")}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location Pin & Landmark */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-[10px] font-black text-white">
                  2
                </span>
                <h3 className="text-xs font-extrabold tracking-wider text-neutral-800 uppercase">
                  Pin Location & Landmark
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-neutral-500">
                Step 2 of 3
              </span>
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
              <Label
                htmlFor="location_note"
                className="text-xs font-bold text-neutral-800"
              >
                Landmark / Specific Location Notes
              </Label>
              <Input
                id="location_note"
                placeholder="e.g. Near Wawa bridge, 2nd floor red roof, beside sari-sari store"
                className="h-10 rounded-xl border-neutral-200/90 bg-neutral-50/30 text-xs focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm"
                {...register("location_note")}
              />
              {errors.location_note ? (
                <p className="text-danger text-[11px] font-bold">
                  {errors.location_note.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Section 3: Situation Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-5.5 place-items-center rounded-full bg-neutral-900 text-[10px] font-black text-white">
                  3
                </span>
                <h3 className="text-xs font-extrabold tracking-wider text-neutral-800 uppercase">
                  Situation & Triage
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-neutral-500">
                Final Step
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label
                  htmlFor="description"
                  className="flex items-center gap-1 text-xs font-bold text-neutral-800"
                >
                  What&apos;s Happening{" "}
                  <span className="font-black text-rose-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Describe flood water level, trapped family members, seniors/children, or urgent medical needs..."
                  className="resize-none rounded-xl border-neutral-200/90 bg-neutral-50/30 text-xs focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className="text-danger text-[11px] font-bold">
                    {errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="people_count"
                  className="text-xs font-bold text-neutral-800"
                >
                  People Needing Rescue
                </Label>
                <Input
                  id="people_count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  placeholder="e.g. 3"
                  className="h-10 rounded-xl border-neutral-200/90 bg-neutral-50/30 text-xs focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm"
                  {...register("people_count")}
                />
                <span className="text-[10.5px] font-medium text-neutral-400">
                  Estimated count
                </span>
              </div>
            </div>
          </div>

          {/* Submit Action Section */}
          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-2">
            {serverError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {serverError}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-xs font-extrabold tracking-wider text-white uppercase shadow-lg shadow-rose-600/25 transition-all duration-200 hover:from-rose-700 hover:to-red-700 hover:shadow-xl active:scale-[0.99] sm:text-sm"
            >
              <LifeBuoy aria-hidden className="animate-spin-slow size-5 shrink-0" />
              {isSubmitting
                ? "Transmitting Dispatch Request…"
                : serverError
                  ? "Try Submitting Again"
                  : "Send Emergency Rescue Request"}
            </Button>

            <p className="text-center text-[11px] font-medium text-neutral-400">
              Submitting logs an immediate triage pin for Barangay San Jose emergency
              response boats and staff.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
