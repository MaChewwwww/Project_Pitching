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
  { ssr: false, loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" /> },
);

const DRAFT_KEY = "rescue-draft";

/**
 * FR-SAF-008/009/017 — no account, no login wall. `LocationPicker` already
 * carries the one-tap "Use my current location" affordance (`use-geolocation`,
 * S1b) as its primary input; the map pin and the free-text note underneath
 * are the fallback the backend's own validator accepts.
 *
 * "Never clears on failure" (design.md 9.6) is why this reuses
 * `useRegistrationDraft` rather than a bare `useForm` — a failed submit here
 * can mean someone is about to lose signal in rising water, and losing what
 * they already typed is the one failure mode this form cannot have.
 */
const rescueRequestSchema = z
  .object({
    requester_name: z.string().min(1, "Enter your name"),
    contact_number: z.string().optional(),
    description: z.string().min(1, "Describe your situation"),
    // Kept as a string in the schema (converted to a number only when
    // building the request payload) — a coerced numeric schema turns an
    // untouched empty field into `0`, which then fails a `.min(1)` check
    // that was never meant to apply to "nothing entered".
    people_count: z.string().optional(),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    location_note: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.location && !values.location_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Give a map pin or describe where you are — rescuers need somewhere to go.",
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

  const { hasDraft, resume, discard, clearOnSuccess } = useRegistrationDraft(DRAFT_KEY, form);

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
      const response = await api.post<RescueRequestAck>("/public/rescue-requests", payload);
      clearOnSuccess();
      setAck(response.data);
    } catch (error) {
      // Deliberately not `form.reset()` — everything the person already
      // typed must survive so they can just tap submit again.
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
      <Card className="border-success-border bg-success-bg">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="text-success size-5" />
            <p className="text-h4 text-success">Request received</p>
          </div>
          <p className="text-body-sm text-neutral-700">
            Reference <span className="font-mono font-semibold">{ack.id.slice(0, 8)}</span> —
            received {new Date(ack.received_at).toLocaleTimeString()}.
          </p>
          <Attribution disclaimer="no-rescue-promise" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-[20px] border border-neutral-200 bg-white p-6 shadow-sm"
    >
      {hasDraft ? (
        <div className="border-primary-200 bg-primary-50 flex items-center justify-between gap-3 rounded-lg border p-3">
          <p className="text-body-sm text-primary-800">Unfinished request saved on this device.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={resume}>
              Resume
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={discard}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requester_name">Your name</Label>
        <Input id="requester_name" autoComplete="name" {...register("requester_name")} />
        {errors.requester_name ? (
          <p className="text-danger text-xs">{errors.requester_name.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact_number">Contact number (optional)</Label>
        <Input
          id="contact_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...register("contact_number")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Your location</Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationPicker
              value={field.value as LatLng | null}
              onChange={field.onChange}
              caption="Drag the pin, or tap the map, to mark where you are."
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location_note">Or describe where you are</Label>
        <Input
          id="location_note"
          placeholder="e.g. near the Wawa bridge, second floor"
          {...register("location_note")}
        />
        {errors.location_note ? (
          <p className="text-danger text-xs">{errors.location_note.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">What&apos;s happening</Label>
        <Textarea id="description" rows={3} {...register("description")} />
        {errors.description ? (
          <p className="text-danger text-xs">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="people_count">People with you (optional)</Label>
        <Input
          id="people_count"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          {...register("people_count")}
        />
      </div>

      <Attribution disclaimer="no-rescue-promise" short />

      {serverError ? <p className="text-danger text-body-sm">{serverError}</p> : null}

      <Button type="submit" variant="emergency" disabled={isSubmitting} className="mt-2 w-full">
        <LifeBuoy aria-hidden className="size-4" />
        {isSubmitting ? "Sending…" : serverError ? "Try again" : "Send request"}
      </Button>
    </form>
  );
}
