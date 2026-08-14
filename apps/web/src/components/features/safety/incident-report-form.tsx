"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import type { IncidentReportOut, IncidentType } from "@/lib/api/safety-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" />,
  },
);

const MAX_PHOTO_MB = 5;

const TYPE_LABEL: Record<IncidentType, string> = {
  flooding: "Flooding",
  fire: "Fire",
  fallen_tree: "Fallen tree",
  road_blockage: "Road blockage",
  landslide: "Landslide",
  power_outage: "Power outage",
  other: "Other",
};

const schema = z
  .object({
    type: z.enum([
      "flooding",
      "fire",
      "fallen_tree",
      "road_blockage",
      "landslide",
      "power_outage",
      "other",
    ]),
    description: z.string().min(1, "Describe what you're seeing"),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    location_note: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.location && !values.location_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Give a map pin or describe the location.",
        path: ["location_note"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

/**
 * FR-SAF-015 — authenticated (`/me`), not public. FR-SAF-009's no-account
 * rule is scoped to *rescue* for life-safety reasons; someone in danger
 * uses `/rescue`, not this. Photo is optional client-side pre-checked
 * against the 5 MB server cap so a resident on a slow connection finds out
 * before uploading, not after.
 */
export function IncidentReportForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [eventId, setEventId] = React.useState("");
  const { data: activeEvents = [] } = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((response) => response.data),
  });
  const resolvedEventId =
    eventId || (activeEvents.length === 1 ? activeEvents[0].id : "");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "other",
      description: "",
      location: null,
      location_note: "",
    },
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Photo must be under ${MAX_PHOTO_MB} MB.`);
      return;
    }
    setPhotoError(null);
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
  }

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      // Overriding Content-Type lets axios set its own multipart boundary —
      // the shared client pins "application/json", which breaks a FormData
      // post with an unhelpful 422 if left as-is.
      api.post<IncidentReportOut>("/me/incident-reports", formData, {
        headers: { "Content-Type": undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "incident-reports"] });
      toast.success("Report submitted");
      onDone();
    },
    onError: (err: unknown) => setServerError(toDisplayError(err).detail),
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (activeEvents.length > 1 && !resolvedEventId) {
      setServerError("Select which active emergency this report belongs to.");
      return;
    }
    const formData = new FormData();
    formData.append("type", values.type);
    formData.append("description", values.description);
    if (values.location) {
      formData.append("latitude", String(values.location.lat));
      formData.append("longitude", String(values.location.lng));
    }
    if (values.location_note) formData.append("location_note", values.location_note);
    if (resolvedEventId) formData.append("event_id", resolvedEventId);
    if (photo) formData.append("photo", photo);
    mutation.mutate(formData);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {activeEvents.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="incident-event">Emergency event</Label>
          <select
            id="incident-event"
            value={resolvedEventId}
            onChange={(event) => setEventId(event.target.value)}
            className="focus-visible:ring-primary-500 min-h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {activeEvents.length > 1 ? (
              <option value="">Select an active event</option>
            ) : null}
            {activeEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            {activeEvents.length > 1
              ? "Several emergencies are active, so this report must be linked explicitly."
              : "This report will be linked to the active emergency."}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">What&apos;s happening</Label>
        <Textarea id="description" rows={3} {...register("description")} />
        {errors.description ? (
          <p className="text-danger text-xs">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Location</Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationPicker
              value={field.value}
              onChange={field.onChange}
              caption="Drag the pin, or tap the map, to mark where this is happening."
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location_note">Or describe the location</Label>
        <Input id="location_note" {...register("location_note")} />
        {errors.location_note ? (
          <p className="text-danger text-xs">{errors.location_note.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo">Photo (optional)</Label>
        {photoPreview ? (
          <div className="relative w-fit">
            <Image
              src={photoPreview}
              alt="Attached photo preview"
              width={160}
              height={160}
              unoptimized
              className="h-40 w-40 rounded-lg border border-neutral-200 object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="bg-danger absolute -top-2 -right-2 grid size-6 place-items-center rounded-full text-white"
              aria-label="Remove photo"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="photo"
            className="text-body-sm flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-neutral-500"
          >
            <Camera aria-hidden className="size-5" />
            Add a photo
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        )}
        {photoError ? <p className="text-danger text-xs">{photoError}</p> : null}
      </div>

      {serverError ? <p className="text-danger text-body-sm">{serverError}</p> : null}

      <Button type="submit" disabled={mutation.isPending} className="mt-2 w-full">
        {mutation.isPending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
