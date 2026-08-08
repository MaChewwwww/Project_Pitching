"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDisplayError } from "@/lib/api/client";

/**
 * Create a donation drive with its needs in one form (FR-DON-001) — `drive_need`
 * is a child of `donation_drive` created in the same request, so the form uses a
 * field array rather than a separate "add need" step.
 */

export const donationDriveFormSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  needs: z
    .array(
      z.object({
        item_name: z.string().min(1, "Required"),
        target_quantity: z.coerce.number().positive("Must be greater than 0"),
        unit: z.string().min(1, "Required"),
      }),
    )
    .min(1, "Add at least one item"),
});
export type DonationDriveFormValues = z.infer<typeof donationDriveFormSchema>;

export function DonationDriveForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: DonationDriveFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DonationDriveFormValues>({
    // See announcement-form.tsx: z.coerce fields create the same input/output
    // variance mismatch between zodResolver and RHF's generic.
    resolver: zodResolver(donationDriveFormSchema as never),
    defaultValues: {
      title: "",
      description: "",
      needs: [{ item_name: "", target_quantity: 1, unit: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "needs" });

  async function submit(values: DonationDriveFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      {serverError ? (
        <div
          role="alert"
          className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title ? (
          <p className="text-danger text-xs">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Items needed</Label>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                placeholder="Item, e.g. Rice"
                {...register(`needs.${i}.item_name` as const)}
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                placeholder="Target"
                {...register(`needs.${i}.target_quantity` as const, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="w-20">
              <Input placeholder="Unit" {...register(`needs.${i}.unit` as const)} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              disabled={fields.length === 1}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </div>
        ))}
        {errors.needs?.message ? (
          <p className="text-danger text-xs">{errors.needs.message}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ item_name: "", target_quantity: 1, unit: "" })}
        >
          <Plus aria-hidden className="size-4" />
          Add item
        </Button>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create drive"}
        </Button>
      </div>
    </form>
  );
}
