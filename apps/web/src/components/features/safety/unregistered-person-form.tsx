"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

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
import { api, toDisplayError } from "@/lib/api/client";
import type { UnregisteredPersonIn, UnregisteredPersonOut } from "@/lib/api/safety-types";
import type { PublicEvacCenter } from "@/lib/api/public-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" />,
  },
);

/**
 * FR-SAF-012 — "a name and location is enough" (BR-5.10). Deliberately no
 * fields beyond what the requirement asks for: no age, no household guess,
 * nothing that would turn a doorway conversation into a form.
 */
const schema = z.object({
  full_name: z.string().min(1, "Enter a name"),
  contact_number: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  location_note: z.string().optional(),
  initial_status: z.enum(["safe", "needs_rescue"]),
  evac_center_id: z.string().optional(),
  is_infant: z.boolean().optional(),
  is_child: z.boolean(),
  is_senior: z.boolean(),
  is_pwd: z.boolean(),
  is_pregnant: z.boolean(),
  is_lactating: z.boolean(),
  has_chronic_condition: z.boolean(),
  chronic_condition_note: z.string().optional(),
  is_bedridden: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function UnregisteredPersonForm({
  onDone,
  eventId,
}: {
  onDone: () => void;
  eventId: string;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const centersQuery = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api
        .get<PublicEvacCenter[]>("/admin/evacuation-centers")
        .then((response) => response.data),
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      contact_number: "",
      location: null,
      location_note: "",
      initial_status: "safe",
      evac_center_id: "",
      is_infant: false,
      is_child: false,
      is_senior: false,
      is_pwd: false,
      is_pregnant: false,
      is_lactating: false,
      has_chronic_condition: false,
      chronic_condition_note: "",
      is_bedridden: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: UnregisteredPersonIn) =>
      api.post<UnregisteredPersonOut>("/admin/unregistered-persons", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] });
      toast.success("Recorded");
      onDone();
    },
    onError: (err: unknown) => setServerError(toDisplayError(err).detail),
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutation.mutate({
      full_name: values.full_name,
      contact_number: values.contact_number || null,
      latitude: values.location?.lat ?? null,
      longitude: values.location?.lng ?? null,
      location_note: values.location_note || null,
      initial_status: values.initial_status,
      event_id: eventId,
      evac_center_id: values.evac_center_id || null,
      is_child: Boolean(values.is_child || values.is_infant),
      is_senior: values.is_senior,
      is_pwd: values.is_pwd,
      is_pregnant: values.is_pregnant,
      is_lactating: values.is_lactating,
      has_chronic_condition: values.has_chronic_condition,
      chronic_condition_note: values.chronic_condition_note || null,
      is_bedridden: values.is_bedridden,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name ? (
          <p className="text-danger text-xs">{errors.full_name.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact_number">Contact number (optional)</Label>
        <Input id="contact_number" type="tel" {...register("contact_number")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Location (optional)</Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationPicker
              value={field.value}
              onChange={field.onChange}
              caption="Drag the pin, or tap the map, to mark where they were found."
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location_note">Location note (optional)</Label>
        <Input id="location_note" {...register("location_note")} />
        {errors.location_note ? (
          <p className="text-danger text-xs">{errors.location_note.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Evacuation center (optional)</Label>
        <Controller
          control={control}
          name="evac_center_id"
          render={({ field }) => (
            <Select
              value={field.value || "none"}
              onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No center assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No center assigned</SelectItem>
                {centersQuery.data
                  ?.filter((center) => center.is_open)
                  .map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.facility.name} ({center.occupancy}/{center.capacity ?? "∞"})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <fieldset className="rounded-lg border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-semibold text-neutral-800">
          Support needs
        </legend>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["is_infant", "Infant / Toddler (0–4 y/o)"],
            ["is_child", "Minor (5–17 y/o)"],
            ["is_senior", "Senior (60+ y/o)"],
            ["is_pwd", "PWD"],
            ["is_pregnant", "Pregnant"],
            ["is_lactating", "Lactating"],
            ["has_chronic_condition", "Chronic condition"],
            ["is_bedridden", "Mobility-limited"],
          ].map(([name, label]) => (
            <label key={name} className="flex min-h-10 items-center gap-2">
              <input
                type="checkbox"
                {...register(name as keyof FormValues)}
                className="accent-primary-700 size-4"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-2">
          <Label htmlFor="chronic_condition_note">Condition note (optional)</Label>
          <Input id="chronic_condition_note" {...register("chronic_condition_note")} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Controller
          control={control}
          name="initial_status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">Safe</SelectItem>
                <SelectItem value="needs_rescue">Needs rescue</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {serverError ? <p className="text-danger text-body-sm">{serverError}</p> : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Saving…" : "Record"}
      </Button>
    </form>
  );
}
