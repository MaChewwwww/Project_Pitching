"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" /> },
);

/**
 * FR-SAF-012 — "a name and location is enough" (BR-5.10). Deliberately no
 * fields beyond what the requirement asks for: no age, no household guess,
 * nothing that would turn a doorway conversation into a form.
 */
const schema = z
  .object({
    full_name: z.string().min(1, "Enter a name"),
    contact_number: z.string().optional(),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    location_note: z.string().optional(),
    initial_status: z.enum(["safe", "needs_rescue"]),
  })
  .superRefine((values, ctx) => {
    if (!values.location && !values.location_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Give a location pin or describe where they are.",
        path: ["location_note"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function UnregisteredPersonForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = React.useState<string | null>(null);

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
        <Label>Location</Label>
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
        <Label htmlFor="location_note">Or describe the location</Label>
        <Input id="location_note" {...register("location_note")} />
        {errors.location_note ? (
          <p className="text-danger text-xs">{errors.location_note.message}</p>
        ) : null}
      </div>

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
