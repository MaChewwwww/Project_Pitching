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
      <Card radius="xl" className="border-emerald-200 bg-emerald-50/70 shadow-sm flex flex-col h-full">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-sm">
              <ShieldCheck aria-hidden className="size-5" />
            </div>
            <div>
              <p className="text-h4 font-bold text-emerald-950">Rescue Request Received</p>
              <p className="text-caption text-emerald-800">Barangay response team has logged your dispatch</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-white p-4 text-xs text-neutral-800 flex flex-col gap-1.5 shadow-2xs">
            <p className="font-semibold text-neutral-900">
              Reference ID: <span className="font-mono font-bold text-emerald-800">{ack.id.slice(0, 8)}</span>
            </p>
            <p className="text-neutral-500 text-[11px]">
              Received at: {new Date(ack.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
          <Attribution disclaimer="no-rescue-promise" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card radius="xl" className="border-neutral-200/90 bg-white shadow-sm flex flex-col h-full overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-4 h-full">
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600 border border-red-200/60 shrink-0">
              <LifeBuoy aria-hidden className="size-4.5" />
            </div>
            <div>
              <h2 className="text-h4 font-bold text-neutral-900">Rescue Dispatch Form</h2>
              <p className="text-caption font-medium text-neutral-500">Submit emergency request to barangay team</p>
            </div>
          </div>
          <span className="text-[10.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shrink-0">
            No Account Needed
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 flex-1">
          {hasDraft ? (
            <div className="border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-3 rounded-xl border p-3">
              <p className="text-xs font-semibold text-emerald-900">
                Unfinished request saved on this device.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button type="button" size="sm" onClick={resume} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs">
                  Resume
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={discard} className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {/* Contact Details Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requester_name" className="text-xs font-bold text-neutral-700">Your Name *</Label>
              <Input
                id="requester_name"
                placeholder="Full Name"
                autoComplete="name"
                className="h-9 text-xs rounded-xl border-neutral-200 focus:border-emerald-500"
                {...register("requester_name")}
              />
              {errors.requester_name ? (
                <p className="text-danger text-[11px] font-semibold">{errors.requester_name.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-700">Contact Number (optional)</Label>
              <Input
                id="contact_number"
                type="tel"
                inputMode="tel"
                placeholder="09XX-XXX-XXXX"
                autoComplete="tel"
                className="h-9 text-xs rounded-xl border-neutral-200 focus:border-emerald-500"
                {...register("contact_number")}
              />
            </div>
          </div>

          {/* Location Picker */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold text-neutral-700">Your Location Pin *</Label>
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <LocationPicker
                  value={field.value as LatLng | null}
                  onChange={field.onChange}
                  caption="Drag the pin, or tap the map, to mark your exact location."
                />
              )}
            />
          </div>

          {/* Landmark / Location note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location_note" className="text-xs font-bold text-neutral-700">Landmark / Location Note</Label>
            <Input
              id="location_note"
              placeholder="e.g. Near Wawa bridge, 2nd floor balcony"
              className="h-9 text-xs rounded-xl border-neutral-200 focus:border-emerald-500"
              {...register("location_note")}
            />
            {errors.location_note ? (
              <p className="text-danger text-[11px] font-semibold">{errors.location_note.message}</p>
            ) : null}
          </div>

          {/* Situation Description & People Count */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description" className="text-xs font-bold text-neutral-700">What&apos;s Happening *</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Describe water level, trapped persons, or medical condition..."
                className="text-xs rounded-xl border-neutral-200 focus:border-emerald-500 resize-none"
                {...register("description")}
              />
              {errors.description ? (
                <p className="text-danger text-[11px] font-semibold">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="people_count" className="text-xs font-bold text-neutral-700">People Needing Rescue</Label>
              <Input
                id="people_count"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                placeholder="e.g. 3"
                className="h-9 text-xs rounded-xl border-neutral-200 focus:border-emerald-500"
                {...register("people_count")}
              />
            </div>
          </div>

          {/* Submit Action Section */}
          <div className="mt-auto pt-3 border-t border-neutral-100 flex flex-col gap-2">
            {serverError ? <p className="text-danger text-body-sm font-semibold">{serverError}</p> : null}

            <Button
              type="submit"
              variant="emergency"
              disabled={isSubmitting}
              className="w-full h-11 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
            >
              <LifeBuoy aria-hidden className="size-4 shrink-0" />
              {isSubmitting ? "Sending Request…" : serverError ? "Try Again" : "Send Emergency Rescue Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
